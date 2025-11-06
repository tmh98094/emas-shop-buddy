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
    const { email, phoneNumber } = await req.json();
    console.log('Email verification request:', { email, phoneNumber });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate verification token
    const token = crypto.randomUUID();

    // Store token in profiles (create temporary profile if needed)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      // Create temporary profile for email verification
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          email,
          phone_number: phoneNumber,
          email_verification_token: token,
          email_verification_sent_at: new Date().toISOString(),
          email_verified: false
        });

      if (insertError) throw insertError;
    } else {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email_verification_token: token,
          email_verification_sent_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;
    }

    // Send verification email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const verificationLink = `${supabaseUrl.replace('/v1', '')}/verify-email?token=${token}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'JJ Emas <noreply@jjemas.com>',
        to: email,
        subject: 'Verify your email - JJ Emas',
        html: `
          <h2>Verify Your Email</h2>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}">${verificationLink}</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error('Failed to send verification email');
    }

    console.log('Verification email sent successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Verification email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-verification-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
