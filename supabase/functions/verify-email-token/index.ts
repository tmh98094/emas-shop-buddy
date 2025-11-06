import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    console.log('Email verification token check:', { token: token?.substring(0, 10) });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find profile with this token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email_verification_token', token)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired (24 hours)
    const sentAt = new Date(profile.email_verification_sent_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return new Response(
        JSON.stringify({ error: 'Verification token expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark email as verified
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        email_verification_token: null,
      })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    console.log('Email verified successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        email: profile.email,
        phoneNumber: profile.phone_number 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-email-token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify email';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
