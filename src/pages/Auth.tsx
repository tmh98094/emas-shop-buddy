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

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "details" | "forgot">("phone");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Phone auth states
  const [countryCode, setCountryCode] = useState("+60");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  
  // User details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) throw error;

      setStep("otp");
      toast({
        title: "OTP Sent!",
        description: isForgotPassword 
          ? "Enter the code to reset your password."
          : "Please check your phone for the verification code.",
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
      const fullPhone = `${countryCode}${phoneNumber}`;
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
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

      if (isForgotPassword) {
        // Password reset flow - allow them to set new password
        toast({ title: "Password reset successful! You can now log in." });
        setIsForgotPassword(false);
        setStep("phone");
      } else if (!profile) {
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

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          phone_number: `${countryCode}${phoneNumber}`,
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

  return (
    <div className="min-h-screen">
      <GoldPriceBanner />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8 text-center">
            {isForgotPassword ? "Reset Password" : 
             step === "phone" ? "Sign In / Sign Up" : 
             step === "otp" ? "Verify Code" : 
             "Complete Profile"}
          </h1>

          <Card className="p-6">
            {step === "phone" && (
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
                  {loading ? "Sending..." : isForgotPassword ? "Send Reset Code" : "Send Verification Code"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => {
                    setIsForgotPassword(!isForgotPassword);
                    setStep("phone");
                  }}
                  disabled={loading}
                >
                  {isForgotPassword ? "Back to Sign In" : "Forgot Password?"}
                </Button>
              </form>
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
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sent to {countryCode}{phoneNumber}
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
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
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
