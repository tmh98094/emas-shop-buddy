import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verifying payment for order:", orderId);

    // Get the order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("order_number, payment_status, phone_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already completed, return success
    if (order.payment_status === "completed") {
      console.log("Payment already completed");
      return new Response(
        JSON.stringify({ status: "completed", message: "Payment already verified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for Stripe checkout sessions for this order
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    const matchingSession = sessions.data.find(
      (session: Stripe.Checkout.Session) => session.metadata?.orderId === orderId || session.metadata?.orderNumber === order.order_number
    );

    if (!matchingSession) {
      console.log("No matching Stripe session found yet");
      return new Response(
        JSON.stringify({ status: "pending", message: "Payment not completed yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found session:", matchingSession.id, "Status:", matchingSession.payment_status);

    // Check if payment was successful
    if (matchingSession.payment_status === "paid") {
      // Update order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          stripe_payment_id: matchingSession.payment_intent as string,
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw updateError;
      }

      console.log("Order payment status updated to completed");
      return new Response(
        JSON.stringify({ status: "completed", message: "Payment verified and order updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.log("Payment not completed, status:", matchingSession.payment_status);
      return new Response(
        JSON.stringify({ 
          status: "pending", 
          message: "Payment not completed yet",
          stripeStatus: matchingSession.payment_status 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
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
