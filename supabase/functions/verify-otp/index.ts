import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-OTP] ${step}${detailsStr}`);
};

// Input validation schema
const requestSchema = z.object({
  phoneNumber: z
    .string()
    .min(8, "Phone number too short")
    .max(20, "Phone number too long")
    .regex(/^\+[1-9]\d{7,19}$/, "Phone number must be in international format (e.g., +60123456789)"),
  otpCode: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
  fullName: z.string().max(100, "Name must be less than 100 characters").trim().optional().or(z.literal("")),
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
          error: "Invalid input: " + validation.error.issues.map((i) => i.message).join(", "),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
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
        },
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

    // Locate or create auth user by email format (converted from phone)
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    const emailFormat = `${cleanPhone}@jj-emas.app`;

    // Helper to robustly find a user by email across pages
    const findUserByEmail = async (email: string) => {
      const perPage = 200;
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) {
          logStep("listUsers error during search", {
            status: (error as any)?.status,
            code: (error as any)?.code,
            message: (error as any)?.message || String(error),
          });
          break;
        }
        const match = data?.users?.find((u: any) => u.email === email);
        if (match) return match;
        if (!data?.users?.length || data.users.length < perPage) break;
      }
      return null;
    };

    let userId: string | undefined;
    let isNewUser = false;

    const existingAuthUser = await findUserByEmail(emailFormat);
    if (existingAuthUser) {
      userId = existingAuthUser.id;
      logStep("Found existing auth user by email (paginated)", { userId });
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: emailFormat,
        email_confirm: true,
        password: crypto.randomUUID(), // Generate random password
        user_metadata: {
          full_name: fullName || "",
          phone_number: phoneNumber,
        },
      });

      if (authError) {
        logStep("Failed to create auth user", {
          status: (authError as any)?.status,
          code: (authError as any)?.code,
          message: (authError as any)?.message || String(authError),
        });
        const fallback = await findUserByEmail(emailFormat);
        if (!fallback) {
          throw new Error("Failed to create or locate user account");
        }
        userId = fallback.id;
        logStep("Recovered existing auth user after createUser failure", { userId });
      } else {
        userId = authData!.user.id;
        isNewUser = true;
        logStep("Auth user created", { userId });
      }
    }

    if (!userId) {
      throw new Error("Failed to resolve user account");
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
      await supabase.from("profiles").delete().eq("id", existingProfile.id);

      // Create new profile with migrated data, but override with new fullName if provided
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
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
        },
        { onConflict: "id" },
      );

      if (profileError) {
        logStep("Failed to migrate profile", { error: profileError });
      } else {
        logStep("Profile migrated successfully", { userId });
      }
    } else {
      // No orphaned profile, just upsert normally
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          phone_number: phoneNumber,
          full_name: fullName || "",
        },
        { onConflict: "id" },
      );

      if (profileError) {
        logStep("Failed to create/update profile", { error: profileError });
      } else {
        logStep("Profile created/updated successfully", { userId });
      }
    }

    import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
    import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
    import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    const logStep = (step: string, details?: any) => {
      const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
      console.log(`[VERIFY-OTP] ${step}${detailsStr}`);
    };

    // Input validation schema
    const requestSchema = z.object({
      phoneNumber: z
        .string()
        .min(8, "Phone number too short")
        .max(20, "Phone number too long")
        .regex(/^\+[1-9]\d{7,19}$/, "Phone number must be in international format (e.g., +60123456789)"),
      otpCode: z
        .string()
        .length(6, "OTP must be exactly 6 digits")
        .regex(/^\d{6}$/, "OTP must contain only digits"),
      fullName: z.string().max(100, "Name must be less than 100 characters").trim().optional().or(z.literal("")),
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
              error: "Invalid input: " + validation.error.issues.map((i) => i.message).join(", "),
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
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
            },
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

        // Locate or create auth user by email format (converted from phone)
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
        const emailFormat = `${cleanPhone}@jj-emas.app`;

        // Helper to robustly find a user by email across pages
        const findUserByEmail = async (email: string) => {
          const perPage = 200;
          for (let page = 1; page <= 10; page++) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
            if (error) {
              logStep("listUsers error during search", {
                status: (error as any)?.status,
                code: (error as any)?.code,
                message: (error as any)?.message || String(error),
              });
              break;
            }
            const match = data?.users?.find((u: any) => u.email === email);
            if (match) return match;
            if (!data?.users?.length || data.users.length < perPage) break;
          }
          return null;
        };

        let userId: string | undefined;
        let isNewUser = false;

        const existingAuthUser = await findUserByEmail(emailFormat);
        if (existingAuthUser) {
          userId = existingAuthUser.id;
          logStep("Found existing auth user by email (paginated)", { userId });
        } else {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: emailFormat,
            email_confirm: true,
            password: crypto.randomUUID(), // Generate random password
            user_metadata: {
              full_name: fullName || "",
              phone_number: phoneNumber,
            },
          });

          if (authError) {
            logStep("Failed to create auth user", {
              status: (authError as any)?.status,
              code: (authError as any)?.code,
              message: (authError as any)?.message || String(authError),
            });
            const fallback = await findUserByEmail(emailFormat);
            if (!fallback) {
              throw new Error("Failed to create or locate user account");
            }
            userId = fallback.id;
            logStep("Recovered existing auth user after createUser failure", { userId });
          } else {
            userId = authData!.user.id;
            isNewUser = true;
            logStep("Auth user created", { userId });
          }
        }

        if (!userId) {
          throw new Error("Failed to resolve user account");
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
          await supabase.from("profiles").delete().eq("id", existingProfile.id);

          // Create new profile with migrated data, but override with new fullName if provided
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
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
            },
            { onConflict: "id" },
          );

          if (profileError) {
            logStep("Failed to migrate profile", { error: profileError });
          } else {
            logStep("Profile migrated successfully", { userId });
          }
        } else {
          // No orphaned profile, just upsert normally
          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              id: userId,
              phone_number: phoneNumber,
              full_name: fullName || "",
            },
            { onConflict: "id" },
          );

          if (profileError) {
            logStep("Failed to create/update profile", { error: profileError });
          } else {
            logStep("Profile created/updated successfully", { userId });
          }
        }

        // ============= NEW CODE - INSERT AFTER LINE 234 =============
        // Check if this is a migrated user (has old orders without user_id)
        const { data: existingOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id, order_number")
          .eq("phone_number", phoneNumber)
          .is("user_id", null);

        const isMigrated = existingOrders && existingOrders.length > 0;
        let ordersRemapped = 0;

        if (isMigrated) {
          logStep("Detected migrated user with orphaned orders", {
            phoneNumber,
            orderCount: existingOrders.length,
          });

          // Remap all orders to this user
          const { error: remapError } = await supabase
            .from("orders")
            .update({ user_id: userId })
            .eq("phone_number", phoneNumber)
            .is("user_id", null);

          if (remapError) {
            logStep("Failed to remap orders", { error: remapError });
          } else {
            ordersRemapped = existingOrders.length;
            logStep(`Successfully remapped ${ordersRemapped} orders to user ${userId}`);
          }
        }
        // ============= END NEW CODE =============

        // Set temporary password for this session (phone is stored in profile and user_metadata)
        const { error: updateUserError } = await supabase.auth.admin.updateUserById(userId, {
          password: otpCode, // Set OTP as temporary password for this session
        });

        if (updateUserError) {
          logStep("Failed to update user", {
            status: (updateUserError as any)?.status,
            code: (updateUserError as any)?.code,
            message: (updateUserError as any)?.message || String(updateUserError),
          });
          throw new Error("Failed to finalize authentication");
        }

        logStep("OTP verified successfully", { userId });

        return new Response(
          JSON.stringify({
            success: true,
            message: isMigrated
              ? `Welcome back! ${ordersRemapped} order(s) linked to your account.`
              : "OTP verified successfully",
            userId,
            isNewUser,
            isMigrated,
            ordersRemapped,
            requiresPasswordReset: isMigrated, // Flag for frontend to show password reset modal
            phoneNumber, // Return normalized phone for consistency
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
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
          },
        );
      }
    });

    // Set temporary password for this session (phone is stored in profile and user_metadata)
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(userId, {
      password: otpCode, // Set OTP as temporary password for this session
    });

    if (updateUserError) {
      logStep("Failed to update user", {
        status: (updateUserError as any)?.status,
        code: (updateUserError as any)?.code,
        message: (updateUserError as any)?.message || String(updateUserError),
      });
      throw new Error("Failed to finalize authentication");
    }

    logStep("OTP verified successfully", { userId });

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        userId,
        isNewUser,
        phoneNumber, // Return normalized phone for consistency
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
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
      },
    );
  }
});
