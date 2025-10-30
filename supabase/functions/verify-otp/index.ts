import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-OTP] ${step}${detailsStr}`);
};

// Input validation schema
const requestSchema = z.object({
  phoneNumber: z.string()
    .min(8, "Phone number too short")
    .max(20, "Phone number too long")
    .regex(/^\+[1-9]\d{7,19}$/, "Phone number must be in international format (e.g., +60123456789)"),
  otpCode: z.string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
  fullName: z.string()
    .max(100, "Name must be less than 100 characters")
    .trim()
    .optional()
    .or(z.literal('')),
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

    const { phoneNumber, otpCode, fullName } = validation.data;

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
    let isNewUser = false;

    if (!existingProfile) {
      logStep("No profile found, checking auth user");
      
      // Try to create a new auth user with phone
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: {
          full_name: fullName || "",
        },
      });

      if (authError) {
        // If user already exists in auth, try to find them
        if (authError.message?.includes("phone_exists") || authError.message?.includes("already registered")) {
          logStep("Auth user already exists, looking up by phone");
          
          // List users and find by phone
          const { data: users, error: listError } = await supabase.auth.admin.listUsers();
          
          if (listError) {
            logStep("Failed to list users", { error: listError });
            throw new Error("Failed to verify user account");
          }
          
          const existingAuthUser = users.users.find(u => u.phone === phoneNumber);
          
          if (!existingAuthUser) {
            logStep("Auth user not found after phone_exists error");
            throw new Error("User verification failed");
          }
          
          userId = existingAuthUser.id;
          logStep("Found existing auth user", { userId });
        } else {
          logStep("Failed to create auth user", { error: authError });
          throw new Error("Failed to create user account");
        }
      } else {
        userId = authData.user.id;
        isNewUser = true;
        logStep("Auth user created", { userId });
      }

      // Create or update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          phone_number: phoneNumber,
          full_name: fullName || "",
        }, {
          onConflict: "id"
        });

      if (profileError) {
        logStep("Failed to create/update profile", { error: profileError });
      } else {
        logStep("Profile created/updated", { userId });
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
        isNewUser: isNewUser || !existingProfile,
        tempPassword: otpCode, // Return OTP as temp password for frontend to auto-login
        phoneNumber, // Return normalized phone for consistency
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
