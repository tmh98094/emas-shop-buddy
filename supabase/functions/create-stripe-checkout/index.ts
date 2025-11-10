import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema using Zod
const checkoutRequestSchema = z.object({
  orderId: z.string().uuid("Order ID must be a valid UUID"),
  orderNumber: z.string().regex(/^JJ-\d{5}$/, "Order number must match format JJ-XXXXX"),
  amount: z.number()
    .positive("Amount must be positive")
    .max(1000000, "Amount exceeds maximum limit")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  successUrl: z.string().url("Success URL must be a valid URL"),
  cancelUrl: z.string().url("Cancel URL must be a valid URL"),
  paymentMethod: z.enum(["fpx", "card"]).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for database access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is authenticated (optional for guest checkout)
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser(token);
        user = authUser;
        console.log("Authenticated user:", user?.id);
      } catch (error) {
        console.log("Auth token invalid or expired, processing as guest");
      }
    } else {
      console.log("No auth header, processing as guest checkout");
    }

    // Parse and validate request body
    const body = await req.json();
    
    const validation = checkoutRequestSchema.safeParse(body);
    if (!validation.success) {
      console.error("Validation failed:", validation.error.issues);
      return new Response(
        JSON.stringify({
          error: "Invalid input: " + validation.error.issues.map(i => i.message).join(", "),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    const { orderId, orderNumber, amount, successUrl, cancelUrl, paymentMethod } = validation.data;

    console.log("Processing checkout for order:", orderNumber, "User:", user?.id || "guest", "Method:", paymentMethod || 'fpx');

    // Verify order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // For authenticated users, verify ownership
    if (user && order.user_id && order.user_id !== user.id) {
      console.error('Order ownership verification failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized to access this order' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // Verify order number matches
    if (order.order_number !== orderNumber) {
      console.error('Order number mismatch');
      return new Response(
        JSON.stringify({ error: 'Order number mismatch' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Verify amount matches (allow small rounding differences)
    if (Math.abs(order.total_amount - amount) > 0.01) {
      console.error('Amount mismatch:', order.total_amount, 'vs', amount);
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check stock availability before creating checkout session
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity, variant_selection")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error('Failed to fetch order items:', itemsError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify stock' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Verify stock for each item
    for (const item of orderItems) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", item.product_id)
        .limit(1);

      const hasVariants = variants && variants.length > 0;

      if (hasVariants && item.variant_selection) {
        const variantCombo: Record<string, string> = {};
        const items = item.variant_selection.split(', ');
        for (const varItem of items) {
          if (varItem.includes(': ')) {
            const [key, value] = varItem.split(': ');
            variantCombo[key] = value;
          }
        }

        const { data: variantStock } = await supabase
          .from("variant_stock")
          .select("stock")
          .eq("product_id", item.product_id)
          .eq("variant_combination", variantCombo)
          .single();

        if (!variantStock || variantStock.stock < item.quantity) {
          console.error('Insufficient variant stock');
          return new Response(
            JSON.stringify({ error: 'Some items are out of stock' }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
      } else {
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();

        if (!product || product.stock < item.quantity) {
          console.error('Insufficient product stock');
          return new Response(
            JSON.stringify({ error: 'Some items are out of stock' }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
      }
    }

    console.log("Creating Stripe checkout session for order:", orderNumber);

    const method = paymentMethod === 'card' ? 'card' : 'fpx';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: [method],
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: `Order ${orderNumber}`,
              description: "Gold jewelry purchase",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId,
        orderNumber,
        userId: user?.id || 'guest',
        method,
      },
      payment_intent_data: {
        metadata: {
          orderId,
          orderNumber,
          userId: user?.id || 'guest',
          method,
        },
      },
    });

    console.log("Stripe session created:", session.id);

    // Store ONLY the clean session ID (not the full URL with query params)
    const sessionId = session.id; // Clean ID: cs_xxx (max 66 chars)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        stripe_session_id: sessionId, // Store clean session ID
        stripe_session_url: session.url, // Keep full URL for reference
        stripe_session_expires_at: expiresAt.toISOString(),
        payment_link_generated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to store session URL:", updateError);
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating Stripe session:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
