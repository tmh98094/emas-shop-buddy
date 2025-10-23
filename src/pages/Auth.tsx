import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizePhone } from "@/lib/phone-utils";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  
  // Phone auth states
  const [countryCode, setCountryCode] = useState("+60");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  
  // Email auth states
  const [emailAuth, setEmailAuth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // User details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const { error } = await supabase.auth.signUp({
          email: emailAuth,
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        // Set step to details for new users
        setStep("details");
        toast({
          title: "Account created!",
          description: "Please complete your profile.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailAuth,
          password: password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
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

      const normalizedPhone = phoneNumber 
        ? normalizePhone(phoneNumber, countryCode)
        : null;

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          phone_number: normalizedPhone || emailAuth,
          email: email || emailAuth || null,
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

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8 text-center">
            {step === "phone" 
              ? authMode === "signup" 
                ? "Sign Up" 
                : "Sign In" 
              : step === "otp" 
                ? "Verify Code" 
                : "Complete Profile"}
          </h1>

          <Card className="p-6">
            {step === "phone" && (
              <Tabs defaultValue="phone" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="phone">Phone Number</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>

                <TabsContent value="phone">
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div>
                      <Label htmlFor="country-code">Country Code</Label>
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+60">🇲🇾 Malaysia (+60)</SelectItem>
                          <SelectItem value="+65">🇸🇬 Singapore (+65)</SelectItem>
                          <SelectItem value="+86">🇨🇳 China (+86)</SelectItem>
                          <SelectItem value="+1">🇺🇸 USA (+1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="123456789"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your phone number without the country code
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Verification Code (OTP)"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="email">
                  <div className="mb-4">
                    <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "signin" | "signup")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                      <Label htmlFor="email-auth">Email</Label>
                      <Input
                        id="email-auth"
                        type="email"
                        placeholder="your.email@example.com"
                        value={emailAuth}
                        onChange={(e) => setEmailAuth(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    {authMode === "signup" && (
                      <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Processing..." : authMode === "signup" ? "Sign Up" : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            {step === "otp" && (
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

            {step === "details" && (
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
                {/* Show phone input for email signup, email input for phone signup */}
                {emailAuth && !phoneNumber && (
                  <div>
                    <Label>Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+60">🇲🇾 +60</SelectItem>
                          <SelectItem value="+65">🇸🇬 +65</SelectItem>
                          <SelectItem value="+86">🇨🇳 +86</SelectItem>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        placeholder="123456789"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>
                )}
                {phoneNumber && !emailAuth && (
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
                )}
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
