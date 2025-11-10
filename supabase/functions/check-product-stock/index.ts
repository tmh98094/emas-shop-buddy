import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Checking stock for order:", orderId);

    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity, variant_selection")
      .eq("order_id", orderId);

    if (itemsError || !orderItems) {
      console.error("Failed to fetch order items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch order items" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Check stock for each item
    const outOfStockItems = [];

    for (const item of orderItems) {
      // Check if product has variants
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", item.product_id)
        .limit(1);

      const hasVariants = variants && variants.length > 0;

      if (hasVariants && item.variant_selection) {
        // Parse variant selection to JSONB
        const variantCombo: Record<string, string> = {};
        const items = item.variant_selection.split(', ');
        for (const varItem of items) {
          if (varItem.includes(': ')) {
            const [key, value] = varItem.split(': ');
            variantCombo[key] = value;
          }
        }

        // Check variant stock
        const { data: variantStock } = await supabase
          .from("variant_stock")
          .select("stock")
          .eq("product_id", item.product_id)
          .contains("variant_combination", variantCombo)
          .single();

        if (!variantStock || variantStock.stock < item.quantity) {
          outOfStockItems.push({
            product_id: item.product_id,
            required: item.quantity,
            available: variantStock?.stock || 0,
          });
        }
      } else {
        // Check product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock, name")
          .eq("id", item.product_id)
          .single();

        if (!product || product.stock < item.quantity) {
          outOfStockItems.push({
            product_id: item.product_id,
            product_name: product?.name,
            required: item.quantity,
            available: product?.stock || 0,
          });
        }
      }
    }

    if (outOfStockItems.length > 0) {
      console.log("Out of stock items found:", outOfStockItems);
      return new Response(
        JSON.stringify({ 
          inStock: false, 
          outOfStockItems 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("All items in stock");
    return new Response(
      JSON.stringify({ inStock: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking stock:", error);
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
