import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-OTP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { phoneNumber, otpCode, fullName } = await req.json();
    
    if (!phoneNumber || !otpCode) {
      throw new Error("Phone number and OTP code are required");
    }

    logStep("Received verification request", { phoneNumber, otpCode: "******" });

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid OTP
    const { data: otpRecords, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("otp_code", otpCode)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      logStep("Database fetch error", { error: fetchError });
      throw new Error("Failed to verify OTP");
    }

    if (!otpRecords || otpRecords.length === 0) {
      logStep("Invalid or expired OTP");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired OTP code",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const otpRecord = otpRecords[0];
    logStep("Valid OTP found", { id: otpRecord.id });

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq("id", otpRecord.id);

    if (updateError) {
      logStep("Failed to mark OTP as verified", { error: updateError });
    }

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    let userId = existingProfile?.id;

    if (!existingProfile) {
      logStep("Creating new user");
      
      // Create a new auth user with phone
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName || "",
        },
      });

      if (authError || !authData.user) {
        logStep("Failed to create auth user", { error: authError });
        throw new Error("Failed to create user account");
      }

      userId = authData.user.id;
      logStep("Auth user created", { userId });

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          phone_number: phoneNumber,
          full_name: fullName || "",
        });

      if (profileError) {
        logStep("Failed to create profile", { error: profileError });
      }
    } else {
      logStep("Existing user found", { userId });
    }

    // Update user's phone to be confirmed and set temporary password
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(userId, {
      phone_confirm: true,
      password: otpCode, // Set OTP as temporary password for this session
    });

    if (updateUserError) {
      logStep("Failed to update user", { error: updateUserError });
      throw new Error("Failed to finalize authentication");
    }

    logStep("OTP verified successfully", { userId });

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        userId,
        isNewUser: !existingProfile,
        tempPassword: otpCode, // Return OTP as temp password for frontend to auto-login
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-otp", { message: errorMessage });

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
