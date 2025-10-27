import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-OTP] ${step}${detailsStr}`);
};

// Input validation schema
const requestSchema = z.object({
  phoneNumber: z.string()
    .min(8, "Phone number too short")
    .max(20, "Phone number too long")
    .regex(/^\+[1-9]\d{7,19}$/, "Phone number must be in international format (e.g., +60123456789)"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json();
    
    // Validate input
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      logStep("Validation failed", validation.error.issues);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input: " + validation.error.issues.map(i => i.message).join(", "),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { phoneNumber } = validation.data;
    
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    logStep("Received phone number", { phoneNumber });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    logStep("OTP generated", { otpCode: "******", expiresAt });

    // Store OTP in database
    const { error: dbError } = await supabase
      .from("otp_verifications")
      .insert({
        phone_number: phoneNumber,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      logStep("Database error", { error: dbError });
      throw new Error(`Failed to store OTP: ${dbError.message}`);
    }

    logStep("OTP stored in database");

    // Send SMS via send-sms function
    const smsMessage = `Your JJ Gold & Jewellery verification code is: ${otpCode}. Valid for 5 minutes.`;
    
    const { data: smsData, error: smsError } = await supabase.functions.invoke("send-sms", {
      body: {
        to: phoneNumber,
        sms: smsMessage,
      },
    });

    if (smsError) {
      logStep("SMS sending error", { error: smsError });
      throw new Error(`Failed to send SMS: ${smsError.message}`);
    }

    logStep("SMS sent successfully", { ref: smsData?.ref });

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        expiresIn: 300, // 5 minutes in seconds
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in generate-otp", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
