import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInput } from "@/components/PhoneInput";
import { normalizePhone } from "@/lib/phone-utils";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  
  // Phone auth states
  const [countryCode, setCountryCode] = useState("+60");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  
  // Email auth states
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  
  // User details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) throw error;

      setStep("otp");
      toast({
        title: "OTP Sent!",
        description: "Please check your phone for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      if (!profile) {
        // New user, go to details step
        setStep("details");
      } else {
        // Existing user, redirect home
        toast({ title: "Welcome back!" });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (!fullName.trim()) {
        throw new Error('Full name is required');
      }

      const normalizedPhone = normalizePhone(phoneNumber, countryCode);

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          phone_number: normalizedPhone,
          email: email || null,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your account has been created.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setEmailInput("admin@jjemas.com");
  };

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8 text-center">
            {authMode === "email" 
              ? "Admin Login (Temporary)" 
              : step === "phone" 
                ? "Sign In / Sign Up" 
                : step === "otp" 
                  ? "Verify Code" 
                  : "Complete Profile"}
          </h1>

          <Card className="p-6">
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "phone" | "email")} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="phone">Phone Login</TabsTrigger>
                <TabsTrigger value="email">Email Login (Temporary)</TabsTrigger>
              </TabsList>
            </Tabs>

            {authMode === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password-login">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleQuickAdminLogin}
                  disabled={loading}
                >
                  Quick Admin Login
                </Button>
              </form>
            )}

            {authMode === "phone" && step === "phone" && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <PhoneInput
                  countryCode={countryCode}
                  phoneNumber={phoneNumber}
                  onCountryCodeChange={setCountryCode}
                  onPhoneNumberChange={setPhoneNumber}
                  label="Phone Number"
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Verification Code (OTP)"}
                </Button>
              </form>
            )}

            {authMode === "phone" && step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sent to {normalizePhone(phoneNumber, countryCode)}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => setStep("phone")}
                  disabled={loading}
                >
                  Change Phone Number
                </Button>
              </form>
            )}

            {authMode === "phone" && step === "details" && (
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div>
                  <Label htmlFor="full-name">Full Name *</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email-optional">Email (Optional)</Label>
                  <Input
                    id="email-optional"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional - for order receipts and notifications
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Complete Registration"}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
