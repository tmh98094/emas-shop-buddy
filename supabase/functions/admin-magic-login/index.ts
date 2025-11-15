import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { token } = await req.json();
    
    if (!token) {
      console.error('[admin-magic-login] No token provided');
      return new Response(
        JSON.stringify({ success: false, error: 'No token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[admin-magic-login] Verifying token:', token.substring(0, 10) + '...');

    // Get magic token settings from database
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'magic_admin_token')
      .single();

    if (settingsError || !settingsData) {
      console.error('[admin-magic-login] Failed to fetch settings:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Magic login not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const settings = settingsData.value as {
      token: string;
      expires_at: string;
      enabled: boolean;
      temp_admin_email: string;
      temp_admin_password: string;
    };

    console.log('[admin-magic-login] Settings retrieved, enabled:', settings.enabled);

    // Validate token
    if (!settings.enabled) {
      console.error('[admin-magic-login] Magic login is disabled');
      return new Response(
        JSON.stringify({ success: false, error: 'Magic login is currently disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (settings.token !== token) {
      console.error('[admin-magic-login] Token mismatch');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check expiration
    const expiresAt = new Date(settings.expires_at);
    if (expiresAt < new Date()) {
      console.error('[admin-magic-login] Token expired at:', expiresAt);
      return new Response(
        JSON.stringify({ success: false, error: 'Token has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('[admin-magic-login] Token valid, checking/creating temp admin user');

    // Check if temp admin user exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    let tempAdminUser = existingUser?.users?.find(u => u.email === settings.temp_admin_email);

    if (!tempAdminUser) {
      console.log('[admin-magic-login] Creating new temp admin user');
      
      // Create temp admin user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: settings.temp_admin_email,
        password: settings.temp_admin_password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Temporary Admin',
          is_temp_admin: true,
        }
      });

      if (createError) {
        console.error('[admin-magic-login] Failed to create user:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create admin user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      tempAdminUser = newUser.user;

      // Add admin role
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: tempAdminUser.id,
          role: 'admin'
        });

      if (roleError) {
        console.error('[admin-magic-login] Failed to assign admin role:', roleError);
      }

      console.log('[admin-magic-login] Temp admin user created with ID:', tempAdminUser.id);
    } else {
      console.log('[admin-magic-login] Using existing temp admin user:', tempAdminUser.id);
    }

    // Return credentials for client-side login
    return new Response(
      JSON.stringify({
        success: true,
        email: settings.temp_admin_email,
        password: settings.temp_admin_password,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[admin-magic-login] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});