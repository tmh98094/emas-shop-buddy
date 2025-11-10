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
    console.log("Starting Stripe payment sync...");

    // Get all orders with pending payment that have a stripe_payment_id or stripe_session_url
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, stripe_payment_id, stripe_session_url, payment_status, order_status")
      .eq("payment_status", "pending")
      .not("stripe_payment_id", "is", null);

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${orders?.length || 0} pending orders with Stripe payment IDs`);

    const results = {
      total: orders?.length || 0,
      updated: 0,
      failed: 0,
      details: [] as any[],
    };

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No pending orders with Stripe payment IDs found",
          results 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check each order's payment status in Stripe
    for (const order of orders) {
      try {
        console.log(`Checking order ${order.order_number} (ID: ${order.id})`);
        
        // Retrieve the payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_id);
        
        console.log(`Payment intent status: ${paymentIntent.status}`);

        if (paymentIntent.status === "succeeded") {
          // Update order to completed
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              payment_status: "completed",
              order_status: "processing",
            })
            .eq("id", order.id);

          if (updateError) {
            console.error(`Failed to update order ${order.order_number}:`, updateError);
            results.failed++;
            results.details.push({
              order_number: order.order_number,
              status: "failed",
              error: updateError.message,
            });
          } else {
            console.log(`✅ Updated order ${order.order_number} to completed/processing`);
            results.updated++;
            results.details.push({
              order_number: order.order_number,
              status: "updated",
              stripe_status: paymentIntent.status,
            });
            
            // Create admin notification
            try {
              await supabase.from("admin_notifications").insert({
                type: "new_order",
                title: "Payment Status Synced",
                message: `Order ${order.order_number} payment status updated from pending to completed (synced from Stripe)`,
                order_id: order.id,
              });
            } catch (notifError) {
              console.error("Failed to create notification:", notifError);
            }
          }
        } else {
          console.log(`Order ${order.order_number} payment status is ${paymentIntent.status}, not updating`);
          results.details.push({
            order_number: order.order_number,
            status: "skipped",
            stripe_status: paymentIntent.status,
            reason: "Payment not succeeded",
          });
        }
      } catch (error: any) {
        console.error(`Error processing order ${order.order_number}:`, error);
        results.failed++;
        results.details.push({
          order_number: order.order_number,
          status: "error",
          error: error.message,
        });
      }
    }

    console.log("Sync completed:", results);

    return new Response(
      JSON.stringify({
        message: "Stripe payment sync completed",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
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
