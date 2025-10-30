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

    // Find OTP record (idempotent): allow already-verified within expiry
    const { data: otpRecords, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("otp_code", otpCode)
      .gte("expires_at", new Date().toISOString())
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

    // Mark OTP as verified if not already (idempotent)
    if (!otpRecord.verified) {
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
    } else {
      logStep("OTP already verified - idempotent success", { id: otpRecord.id });
    }

    // Locate or create auth user strictly by phone
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      logStep("Failed to list users", { error: listError });
      throw new Error("Failed to verify user account");
    }

    const digitsOnly = phoneNumber.replace(/^\+/, "");
    const existingAuthUser = users.users.find((u: any) => u.phone === phoneNumber || u.phone === digitsOnly);

    let userId = existingAuthUser?.id;
    let isNewUser = false;

    if (!userId) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: { full_name: fullName || "" },
      });

      if (authError) {
        // If creation failed because phone exists, resolve to that user
        if (authError.message?.includes("phone_exists") || authError.message?.includes("already registered")) {
          const existingByPhone = users.users.find((u: any) => u.phone === phoneNumber || u.phone === digitsOnly);
          if (!existingByPhone) {
            logStep("Auth user not found after phone_exists error");
            throw new Error("User verification failed");
          }
          userId = existingByPhone.id;
          logStep("Found existing auth user after phone_exists", { userId });
        } else {
          logStep("Failed to create auth user", { error: authError });
          throw new Error("Failed to create user account");
        }
      } else {
        userId = authData.user.id;
        isNewUser = true;
        logStep("Auth user created", { userId });
      }
    } else {
      logStep("Found existing auth user by phone", { userId });
    }

    // Handle profile creation/update with orphaned profile cleanup
    // First, check if there's an existing profile with this phone but different user_id
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    // If profile exists with different user_id, migrate the data (orphaned profile cleanup)
    if (existingProfile && existingProfile.id !== userId) {
      logStep("Migrating orphaned profile data", { orphanedId: existingProfile.id, currentUserId: userId });
      
      // Delete the orphaned profile first
      await supabase
        .from("profiles")
        .delete()
        .eq("id", existingProfile.id);
      
      // Create new profile with migrated data, but override with new fullName if provided
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          phone_number: phoneNumber,
          full_name: fullName || existingProfile.full_name || "",
          email: existingProfile.email,
          address_line1: existingProfile.address_line1,
          address_line2: existingProfile.address_line2,
          city: existingProfile.city,
          state: existingProfile.state,
          postcode: existingProfile.postcode,
          country: existingProfile.country,
        }, { onConflict: "id" });

      if (profileError) {
        logStep("Failed to migrate profile", { error: profileError });
      } else {
        logStep("Profile migrated successfully", { userId });
      }
    } else {
      // No orphaned profile, just upsert normally
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          phone_number: phoneNumber,
          full_name: fullName || "",
        }, { onConflict: "id" });

      if (profileError) {
        logStep("Failed to create/update profile", { error: profileError });
      } else {
        logStep("Profile created/updated successfully", { userId });
      }
    }

    // Update user's phone to be confirmed and set temporary password
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(userId, {
      phone: phoneNumber,
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
        isNewUser,
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
