import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
interface CheckoutRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  successUrl: string;
  cancelUrl: string;
}

function validateRequest(body: any): CheckoutRequest {
  if (!body.orderId || typeof body.orderId !== 'string') {
    throw new Error('Invalid orderId');
  }
  if (!body.orderNumber || typeof body.orderNumber !== 'string' || !/^JJ-\d{5}$/.test(body.orderNumber)) {
    throw new Error('Invalid orderNumber format');
  }
  if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0 || body.amount > 100000) {
    throw new Error('Invalid amount');
  }
  if (!body.successUrl || typeof body.successUrl !== 'string' || !body.successUrl.startsWith('http')) {
    throw new Error('Invalid successUrl');
  }
  if (!body.cancelUrl || typeof body.cancelUrl !== 'string' || !body.cancelUrl.startsWith('http')) {
    throw new Error('Invalid cancelUrl');
  }
  
  return body as CheckoutRequest;
}

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
    const validatedData = validateRequest(body);
    const { orderId, orderNumber, amount, successUrl, cancelUrl } = validatedData;

    console.log("Processing checkout for order:", orderNumber, "User:", user?.id || "guest");

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["fpx"],
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: `Order ${orderNumber}`,
              description: "Gold jewelry purchase",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
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
