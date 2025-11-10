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

    const results = {
      total: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    // PHASE 1: Process orders WITH session data
    console.log("=== PHASE 1: Processing orders with session data ===");
    const { data: ordersWithSession, error: fetchError1 } = await supabase
      .from("orders")
      .select("id, order_number, stripe_payment_id, stripe_session_url, stripe_session_id, payment_status, order_status, full_name, total_amount")
      .eq("payment_status", "pending")
      .or("stripe_session_url.not.is.null,stripe_session_id.not.is.null");

    if (fetchError1) {
      console.error("Error fetching orders with session:", fetchError1);
      throw fetchError1;
    }

    console.log(`Found ${ordersWithSession?.length || 0} pending orders with session data`);
    results.total += ordersWithSession?.length || 0;

    if (ordersWithSession && ordersWithSession.length > 0) {
      for (const order of ordersWithSession) {
        try {
          console.log(`Checking order ${order.order_number} (ID: ${order.id})`);
          
          let sessionId = order.stripe_session_id;
          
          if (!sessionId && order.stripe_session_url) {
            console.log(`Parsing session URL: ${order.stripe_session_url}`);
            try {
              const url = new URL(order.stripe_session_url);
              const lastSegment = url.pathname.split('/').pop();
              sessionId = lastSegment?.split(/[?#]/)[0];
            } catch (urlError) {
              console.error(`Invalid URL format: ${order.stripe_session_url}`);
            }
          }
          
          if (!sessionId || !sessionId.startsWith('cs_') || sessionId.length > 66) {
            console.error(`Invalid session ID for order ${order.order_number}: ${sessionId}`);
            results.failed++;
            results.details.push({
              order_number: order.order_number,
              status: "failed",
              error: "Invalid session ID format",
              phase: "session_check",
            });
            continue;
          }

          console.log(`Using session ID: ${sessionId.substring(0, 15)}...`);
          
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          
          console.log(`Session status: ${session.status}, payment_status: ${session.payment_status}`);

          if (session.payment_status === "paid") {
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
                phase: "session_check",
              });
            } else {
              console.log(`✅ Updated order ${order.order_number} to completed/processing`);
              results.updated++;
              results.details.push({
                order_number: order.order_number,
                status: "updated",
                stripe_status: session.payment_status,
                payment_intent: session.payment_intent,
                phase: "session_check",
              });
              
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
            console.log(`Session expired for order ${order.order_number}, marking as failed`);
            
            const { error: failError } = await supabase
              .from("orders")
              .update({ payment_status: "failed" })
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
                phase: "session_check",
              });
            }
          } else {
            console.log(`Order ${order.order_number} not ready, skipping`);
            results.skipped++;
            results.details.push({
              order_number: order.order_number,
              status: "skipped",
              stripe_status: session.status,
              payment_status: session.payment_status,
              reason: "Payment not completed",
              phase: "session_check",
            });
          }
        } catch (error: any) {
          console.error(`Error processing order ${order.order_number}:`, error);
          results.failed++;
          results.details.push({
            order_number: order.order_number,
            status: "error",
            error: error.message,
            phase: "session_check",
          });
        }
      }
    }

    // PHASE 2: Process orders WITHOUT session data using PaymentIntent search
    console.log("\n=== PHASE 2: Processing orders without session data ===");
    const { data: ordersWithoutSession, error: fetchError2 } = await supabase
      .from("orders")
      .select("id, order_number, payment_status, order_status, full_name, total_amount")
      .eq("payment_status", "pending")
      .is("stripe_session_id", null)
      .is("stripe_session_url", null);

    if (fetchError2) {
      console.error("Error fetching orders without session:", fetchError2);
      throw fetchError2;
    }

    console.log(`Found ${ordersWithoutSession?.length || 0} pending orders without session data`);
    results.total += ordersWithoutSession?.length || 0;

    if (ordersWithoutSession && ordersWithoutSession.length > 0) {
      for (const order of ordersWithoutSession) {
        try {
          console.log(`\nSearching PaymentIntent for order ${order.order_number} (ID: ${order.id})`);
          
          // Search for PaymentIntent by metadata
          const query = `metadata['orderNumber']:'${order.order_number}' OR metadata['orderId']:'${order.id}'`;
          console.log(`Search query: ${query}`);
          
          const paymentIntents = await stripe.paymentIntents.search({
            query: query,
            limit: 1,
          });

          if (paymentIntents.data.length === 0) {
            console.log(`No PaymentIntent found for order ${order.order_number}`);
            results.skipped++;
            results.details.push({
              order_number: order.order_number,
              status: "skipped",
              reason: "No PaymentIntent found in Stripe",
              phase: "paymentintent_search",
            });
            continue;
          }

          const paymentIntent = paymentIntents.data[0];
          console.log(`Found PaymentIntent: ${paymentIntent.id}, status: ${paymentIntent.status}`);

          if (paymentIntent.status === "succeeded") {
            console.log(`PaymentIntent succeeded for order ${order.order_number}`);
            
            // Update order to completed
            const { error: updateError } = await supabase
              .from("orders")
              .update({
                payment_status: "completed",
                order_status: "processing",
                stripe_payment_id: paymentIntent.id,
              })
              .eq("id", order.id);

            if (updateError) {
              console.error(`Failed to update order ${order.order_number}:`, updateError);
              results.failed++;
              results.details.push({
                order_number: order.order_number,
                status: "failed",
                error: updateError.message,
                phase: "paymentintent_search",
              });
              continue;
            }

            // Try to backfill session info
            try {
              const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1,
              });

              if (sessions.data.length > 0) {
                const session = sessions.data[0];
                console.log(`Backfilling session info: ${session.id}`);
                
                await supabase
                  .from("orders")
                  .update({
                    stripe_session_id: session.id,
                    stripe_session_url: session.url || null,
                  })
                  .eq("id", order.id);
              }
            } catch (sessionError) {
              console.log(`Could not backfill session info (non-critical):`, sessionError);
            }

            console.log(`✅ Updated order ${order.order_number} to completed/processing`);
            results.updated++;
            results.details.push({
              order_number: order.order_number,
              status: "updated",
              payment_intent: paymentIntent.id,
              stripe_status: paymentIntent.status,
              phase: "paymentintent_search",
            });

            // Create admin notification
            try {
              await supabase.from("admin_notifications").insert({
                type: "new_order",
                title: "Payment Status Synced",
                message: `Order ${order.order_number} payment status updated from pending to completed (found via PaymentIntent search)`,
                order_id: order.id,
              });
            } catch (notifError) {
              console.error("Failed to create notification:", notifError);
            }
          } else if (paymentIntent.status === "canceled" || paymentIntent.status === "requires_payment_method") {
            console.log(`PaymentIntent ${paymentIntent.status} for order ${order.order_number}, marking as failed`);
            
            const { error: failError } = await supabase
              .from("orders")
              .update({
                payment_status: "failed",
                stripe_payment_id: paymentIntent.id,
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
                payment_intent: paymentIntent.id,
                stripe_status: paymentIntent.status,
                reason: `PaymentIntent ${paymentIntent.status}`,
                phase: "paymentintent_search",
              });
            }
          } else {
            console.log(`PaymentIntent status ${paymentIntent.status} for order ${order.order_number}, skipping`);
            results.skipped++;
            results.details.push({
              order_number: order.order_number,
              status: "skipped",
              payment_intent: paymentIntent.id,
              stripe_status: paymentIntent.status,
              reason: `PaymentIntent in ${paymentIntent.status} state`,
              phase: "paymentintent_search",
            });
          }
        } catch (error: any) {
          console.error(`Error searching PaymentIntent for order ${order.order_number}:`, error);
          results.failed++;
          results.details.push({
            order_number: order.order_number,
            status: "error",
            error: error.message,
            phase: "paymentintent_search",
          });
        }
      }
    }

    console.log("\n=== SYNC COMPLETED ===");
    console.log(`Total: ${results.total}, Updated: ${results.updated}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

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
