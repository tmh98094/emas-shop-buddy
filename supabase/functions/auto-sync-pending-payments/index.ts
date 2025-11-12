import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  try {
    console.log("🔄 Starting automatic payment sync for recent pending orders...");

    // Query only recent pending orders with Stripe session ID (last 48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_status", "pending")
      .not("stripe_session_id", "is", null)
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("❌ Error fetching pending orders:", fetchError);
      throw fetchError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log("✅ No recent pending orders to sync");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pending orders to sync",
          checked: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${pendingOrders.length} recent pending orders to check`);

    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const order of pendingOrders) {
      try {
        console.log(`\n🔍 Checking order ${order.order_number} (Session: ${order.stripe_session_id})`);

        // Retrieve the Stripe checkout session
        const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
        
        console.log(`📊 Session status: ${session.status}, Payment status: ${session.payment_status}`);

        if (session.payment_status === "paid") {
          // Payment successful - update order
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              payment_status: "completed",
              order_status: "processing",
              stripe_payment_id: session.payment_intent as string,
            })
            .eq("id", order.id);

          if (updateError) {
            console.error(`❌ Failed to update order ${order.order_number}:`, updateError);
            failedCount++;
          } else {
            console.log(`✅ Successfully synced order ${order.order_number} - Payment completed`);
            
            // Create admin notification
            await supabase.from("admin_notifications").insert({
              type: "new_order",
              title: "订单支付已同步",
              message: `订单 ${order.order_number} 的支付已通过自动同步确认完成`,
              order_id: order.id,
            });
            
            syncedCount++;
          }
        } else if (session.status === "expired") {
          // Session expired - mark as failed
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              order_status: "cancelled",
            })
            .eq("id", order.id);

          if (updateError) {
            console.error(`❌ Failed to update expired order ${order.order_number}:`, updateError);
            failedCount++;
          } else {
            console.log(`⏰ Order ${order.order_number} marked as expired`);
            syncedCount++;
          }
        } else {
          console.log(`⏳ Order ${order.order_number} still pending - no action needed`);
          skippedCount++;
        }
      } catch (orderError) {
        console.error(`❌ Error processing order ${order.order_number}:`, orderError);
        failedCount++;
      }
    }

    const summary = {
      success: true,
      total: pendingOrders.length,
      synced: syncedCount,
      failed: failedCount,
      skipped: skippedCount,
      timestamp: new Date().toISOString(),
    };

    console.log("\n📊 Sync Summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Auto-sync error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
