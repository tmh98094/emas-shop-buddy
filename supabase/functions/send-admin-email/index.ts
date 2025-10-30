import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "out_of_stock" | "new_pre_order" | "new_touch_n_go_payment";
  admin_email: string;
  // Out of stock fields
  product_id?: string;
  product_name?: string;
  gold_type?: string;
  weight_grams?: number;
  // Pre-order fields
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  deposit_paid?: number;
  balance_due?: number;
  order_id?: string;
  // Touch N Go fields
  total_amount?: number;
  receipt_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();
    console.log("Email notification request:", data.type);

    let subject = "";
    let html = "";

    switch (data.type) {
      case "out_of_stock":
        subject = `🚨 Product Out of Stock: ${data.product_name}`;
        html = `
          <h2>Product Out of Stock Alert</h2>
          <p>A product has just gone out of stock and may need restocking.</p>
          <h3>Product Details:</h3>
          <ul>
            <li><strong>Product:</strong> ${data.product_name}</li>
            <li><strong>Gold Type:</strong> ${data.gold_type}</li>
            <li><strong>Weight:</strong> ${data.weight_grams}g</li>
            <li><strong>Product ID:</strong> ${data.product_id}</li>
          </ul>
          <p><a href="https://0cf0a8a6-18c7-41f6-b527-9d28858fbafe.lovableproject.com/admin/stock" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View Stock Management</a></p>
        `;
        break;

      case "new_pre_order":
        subject = `🎁 New Pre-Order Received: Order #${data.order_number}`;
        html = `
          <h2>New Pre-Order Notification</h2>
          <p>A new pre-order has been placed and requires your attention.</p>
          <h3>Order Details:</h3>
          <ul>
            <li><strong>Order Number:</strong> ${data.order_number}</li>
            <li><strong>Customer:</strong> ${data.customer_name}</li>
            <li><strong>Phone:</strong> ${data.customer_phone}</li>
            <li><strong>Deposit Paid:</strong> RM ${data.deposit_paid?.toFixed(2)}</li>
            <li><strong>Balance Due:</strong> RM ${data.balance_due?.toFixed(2)}</li>
          </ul>
          <p><a href="https://0cf0a8a6-18c7-41f6-b527-9d28858fbafe.lovableproject.com/admin/pre-orders" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View Pre-Orders</a></p>
        `;
        break;

      case "new_touch_n_go_payment":
        subject = `💳 New Touch N Go Payment: Order #${data.order_number}`;
        html = `
          <h2>Touch N Go Payment Received</h2>
          <p>A customer has uploaded a Touch N Go payment receipt that needs verification.</p>
          <h3>Payment Details:</h3>
          <ul>
            <li><strong>Order Number:</strong> ${data.order_number}</li>
            <li><strong>Customer:</strong> ${data.customer_name}</li>
            <li><strong>Amount:</strong> RM ${data.total_amount?.toFixed(2)}</li>
          </ul>
          <p><strong>Receipt Image:</strong> <a href="${data.receipt_url}">View Receipt</a></p>
          <p><a href="https://0cf0a8a6-18c7-41f6-b527-9d28858fbafe.lovableproject.com/admin/touch-ngo" style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Verify Payment</a></p>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "Jing Jing Gold <onboarding@resend.dev>",
      to: [data.admin_email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);