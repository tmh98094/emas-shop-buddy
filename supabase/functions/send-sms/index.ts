import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SMS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get Bulk360 credentials from environment
    const appKey = Deno.env.get("BULK360_APP_KEY");
    const appSecret = Deno.env.get("BULK360_APP_SECRET");
    
    if (!appKey || !appSecret) {
      throw new Error("Bulk360 credentials not configured");
    }
    
    logStep("Credentials verified");

    // Parse request body from Supabase Auth
    const body = await req.json();
    logStep("Request body received", { to: body.to, message: body.sms });

    // Validate required fields
    if (!body.to || !body.sms) {
      throw new Error("Missing required fields: 'to' or 'sms'");
    }

    // Format phone number for Bulk360 (remove + sign)
    const phoneNumber = body.to.replace(/^\+/, "");
    logStep("Phone number formatted", { original: body.to, formatted: phoneNumber });

    // Prepare Bulk360 API request
    const bulk360Url = "https://sms.360.my/gw/bulk360/v3_0/send.php";
    const params = new URLSearchParams({
      user: appKey,
      pass: appSecret,
      to: phoneNumber,
      text: body.sms,
      detail: "1", // Get detailed response with balance info
    });

    logStep("Calling Bulk360 API", { url: bulk360Url, to: phoneNumber });

    // Make request to Bulk360
    const response = await fetch(`${bulk360Url}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseText = await response.text();
    logStep("Bulk360 API response received", { status: response.status, body: responseText });

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      logStep("Failed to parse Bulk360 response as JSON", { response: responseText });
      throw new Error(`Invalid response from Bulk360: ${responseText}`);
    }

    // Check Bulk360 response code
    if (responseData.code === 200) {
      logStep("SMS sent successfully", { ref: responseData.ref, balance: responseData.balance });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "SMS sent successfully",
          ref: responseData.ref,
          balance: responseData.balance 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Handle Bulk360 error codes
      const errorMessages: Record<number, string> = {
        400: "Missing parameters or invalid field type",
        401: "Invalid credentials",
        402: "Insufficient credit",
        403: "API not enabled or IP not whitelisted",
        405: "Invalid message type",
        406: "Message content not approved",
        407: "Banned content detected",
        412: "Account suspended/terminated",
        413: "Account under observation",
        500: "Internal server error",
      };

      const errorMessage = errorMessages[responseData.code] || `Unknown error (code: ${responseData.code})`;
      logStep("Bulk360 error", { code: responseData.code, message: errorMessage });

      throw new Error(`Bulk360 error: ${errorMessage} - ${responseData.desc || ''}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-sms", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
