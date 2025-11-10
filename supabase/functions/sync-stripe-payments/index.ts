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

    // Get all orders with pending payment that have a stripe_session_url
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, stripe_payment_id, stripe_session_url, payment_status, order_status")
      .eq("payment_status", "pending")
      .not("stripe_session_url", "is", null);

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${orders?.length || 0} pending orders with Stripe checkout sessions`);

    const results = {
      total: orders?.length || 0,
      updated: 0,
      failed: 0,
      details: [] as any[],
    };

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No pending orders with Stripe checkout sessions found",
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
        console.log(`Session URL: ${order.stripe_session_url}`);
        
        // Extract session ID from the Stripe session URL
        const sessionId = order.stripe_session_url.split('/').pop()?.split('?')[0];
        if (!sessionId) {
          console.error(`Could not extract session ID from URL: ${order.stripe_session_url}`);
          results.failed++;
          results.details.push({
            order_number: order.order_number,
            status: "failed",
            error: "Invalid session URL",
          });
          continue;
        }

        console.log(`Extracted session ID: ${sessionId}`);
        
        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        console.log(`Session status: ${session.status}, payment_status: ${session.payment_status}`);

        if (session.payment_status === "paid") {
          // Update order to completed
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              payment_status: "completed",
              order_status: "processing",
              stripe_payment_id: session.payment_intent as string,
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
              stripe_status: session.payment_status,
              payment_intent: session.payment_intent,
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
        } else if (session.status === "expired") {
          // Mark as failed
          console.log(`Session expired for order ${order.order_number}, marking as failed`);
          
          const { error: failError } = await supabase
            .from("orders")
            .update({
              payment_status: "failed",
            })
            .eq("id", order.id);

          if (failError) {
            console.error(`Failed to mark order as failed:`, failError);
            results.failed++;
          } else {
            results.updated++;
            results.details.push({
              order_number: order.order_number,
              status: "marked_failed",
              stripe_status: session.status,
              reason: "Session expired",
            });
          }
        } else {
          console.log(`Order ${order.order_number} session status is ${session.status}, payment status is ${session.payment_status}, not updating`);
          results.details.push({
            order_number: order.order_number,
            status: "skipped",
            stripe_status: session.status,
            payment_status: session.payment_status,
            reason: "Payment not completed",
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
