import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-PAYMENT-LINK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { orderId } = await req.json();
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    logStep("Fetching order", { orderId });

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order fetched", { orderNumber: order.order_number, paymentStatus: order.payment_status });

    // Check if order is eligible for payment
    if (order.payment_status !== "pending") {
      throw new Error("Order is not pending payment");
    }

    if (order.order_status === "cancelled") {
      throw new Error("Order has been cancelled");
    }

    // Check if existing session is still valid
    const now = new Date();
    if (order.stripe_session_url && order.stripe_session_expires_at) {
      const expiresAt = new Date(order.stripe_session_expires_at);
      if (expiresAt > now) {
        logStep("Existing session still valid", { expiresAt });
        return new Response(
          JSON.stringify({ url: order.stripe_session_url }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    logStep("Creating new Stripe session");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Determine payment method type
    let paymentMethodTypes: string[];
    if (order.payment_method === "stripe_fpx") {
      paymentMethodTypes = ["fpx"];
    } else if (order.payment_method === "stripe_card") {
      paymentMethodTypes = ["card"];
    } else {
      throw new Error("Invalid payment method for Stripe");
    }

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ 
      email: order.email || undefined, 
      limit: 1 
    });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    logStep("Creating Stripe checkout session", { customerId, paymentMethodTypes });

    const origin = req.headers.get("origin") || Deno.env.get("VITE_SUPABASE_URL");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : order.email || undefined,
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: "myr",
            product_data: {
              name: `Order ${order.order_number}`,
            },
            unit_amount: Math.round(order.total_amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/order-confirmation/${order.id}`,
      cancel_url: `${origin}/checkout`,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
      },
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Store the new session URL in the database
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        stripe_session_url: session.url,
        stripe_session_expires_at: expiresAt.toISOString(),
        payment_link_generated_at: now.toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order with session URL:", updateError);
    }

    logStep("Session URL stored in database");

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
