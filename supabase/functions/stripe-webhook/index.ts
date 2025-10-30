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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error("Webhook signature verification failed:", errMessage);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    console.log("Received Stripe webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        console.log("Updating order payment status for:", orderId);
        
        // Get order details before updating
        const { data: order, error: orderFetchError } = await supabase
          .from("orders")
          .select("order_number, full_name, total_amount")
          .eq("id", orderId)
          .single();

        if (orderFetchError) {
          console.error("Error fetching order:", orderFetchError);
          throw orderFetchError;
        }
        
        const { error } = await supabase
          .from("orders")
          .update({
            payment_status: "completed",
            stripe_payment_id: session.payment_intent as string,
          })
          .eq("id", orderId);

        if (error) {
          console.error("Error updating order:", error);
          throw error;
        }

        console.log("Order payment status updated successfully");

        // Create admin notification for new order
        try {
          const { error: notifError } = await supabase
            .from("admin_notifications")
            .insert({
              type: "new_order",
              title: "New Order Placed",
              message: `Order ${order.order_number} has been placed by ${order.full_name}. Payment confirmed via Stripe.`,
              order_id: orderId,
            });

          if (notifError) {
            console.error("Error creating notification:", notifError);
          } else {
            console.log("Admin notification created successfully");
          }
        } catch (notifErr) {
          console.error("Failed to create admin notification:", notifErr);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
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
