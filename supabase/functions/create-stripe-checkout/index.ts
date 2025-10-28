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
    });

    console.log("Stripe session created:", session.id);

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
