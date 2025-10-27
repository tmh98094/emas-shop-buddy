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
import { T } from "@/components/T";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  
  // Form states
  const [countryCode, setCountryCode] = useState("+60");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  
  // Admin email login
  const [emailInput, setEmailInput] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!fullName.trim()) {
        throw new Error("Full name is required");
      }

      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      // Sign up with password
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: password,
        options: {
          data: {
            full_name: fullName,
            email: email || null,
          }
        }
      });

      if (error) throw error;

      // Create profile
      if (data.user) {
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            phone_number: normalizedPhone,
            email: email || null,
          });
      }

      toast({
        title: "注册成功！",
        description: "您的账户已创建。",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "注册失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      const { error } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password: password,
      });

      if (error) throw error;

      toast({
        title: "登录成功！",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      // Call custom generate-otp edge function
      const { data, error } = await supabase.functions.invoke("generate-otp", {
        body: {
          phoneNumber: normalizedPhone,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send OTP");
      }

      setOtpSent(true);
      toast({
        title: "验证码已发送",
        description: "请检查您的手机。验证码5分钟内有效。",
      });
    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      // Call custom verify-otp edge function
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: {
          phoneNumber: normalizedPhone,
          otpCode: otp,
          fullName: fullName || "", // Use fullName if provided in signup flow
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to verify OTP");
      }

      // Sign in with phone and temporary password (the OTP code)
      if (data.tempPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password: data.tempPassword,
        });

        if (signInError) {
          console.error("Auto sign-in error:", signInError);
          throw signInError;
        }
      }

      toast({
        title: "登录成功！",
        description: data.isNewUser ? "欢迎新用户！" : "欢迎回来！",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "验证失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      // Call custom generate-otp edge function
      const { data, error } = await supabase.functions.invoke("generate-otp", {
        body: {
          phoneNumber: normalizedPhone,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send OTP");
      }

      setOtpSent(true);
      toast({
        title: "验证码已发送",
        description: "请使用验证码登录。验证码5分钟内有效。",
      });
    } catch (error: any) {
      toast({
        title: "发送失败",
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
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: emailPassword,
      });

      if (error) throw error;

      toast({
        title: "登录成功！",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "登录失败",
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
            <T zh="登录 / 注册" en="Sign In / Sign Up" />
          </h1>

          <Card className="p-6">
            <Tabs value={authTab} onValueChange={(v) => {
              setAuthTab(v as "signin" | "signup");
              setUseOtp(false);
              setOtpSent(false);
              setOtp("");
              setShowRecovery(false);
            }} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin"><T zh="登录" en="Sign In" /></TabsTrigger>
                <TabsTrigger value="signup"><T zh="注册" en="Sign Up" /></TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin">
                {!showRecovery && !useOtp && !otpSent && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label><T zh="手机号码" en="Mobile Phone" /> *</Label>
                      <PhoneInput
                        countryCode={countryCode}
                        phoneNumber={phoneNumber}
                        onCountryCodeChange={setCountryCode}
                        onPhoneNumberChange={setPhoneNumber}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password"><T zh="密码" en="Password" /> *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecovery(true)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                      >
                        <T zh="忘记密码？" en="Forgot password?" />
                      </button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <T zh="登录中..." en="Signing in..." /> : <T zh="登录" en="Sign In" />}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => setUseOtp(true)}
                    >
                      <T zh="使用验证码登录" en="Login with Verification Code" />
                    </Button>
                  </form>
                )}

                {!showRecovery && useOtp && !otpSent && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <Label><T zh="手机号码" en="Mobile Phone" /> *</Label>
                      <PhoneInput
                        countryCode={countryCode}
                        phoneNumber={phoneNumber}
                        onCountryCodeChange={setCountryCode}
                        onPhoneNumberChange={setPhoneNumber}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <T zh="发送中..." en="Sending..." /> : <T zh="发送验证码" en="Send Verification Code" />}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => setUseOtp(false)}
                    >
                      <T zh="使用密码登录" en="Login with Password" />
                    </Button>
                  </form>
                )}

                {!showRecovery && otpSent && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="otp"><T zh="验证码" en="Verification Code" /></Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <T zh="已发送至" en="Sent to" /> {normalizePhone(phoneNumber, countryCode)}
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                      {loading ? <T zh="验证中..." en="Verifying..." /> : <T zh="验证" en="Verify" />}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                    >
                      <T zh="重新输入手机号" en="Change Phone Number" />
                    </Button>
                  </form>
                )}

                {/* Password Recovery Flow */}
                {showRecovery && !otpSent && (
                  <form onSubmit={handleRecoverPassword} className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      <T zh="输入您的手机号码以接收验证码" en="Enter your phone number to receive a verification code" />
                    </p>
                    <div>
                      <Label><T zh="手机号码" en="Mobile Phone" /> *</Label>
                      <PhoneInput
                        countryCode={countryCode}
                        phoneNumber={phoneNumber}
                        onCountryCodeChange={setCountryCode}
                        onPhoneNumberChange={setPhoneNumber}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <T zh="发送中..." en="Sending..." /> : <T zh="获取验证码" en="Get Verification Code" />}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => setShowRecovery(false)}
                    >
                      <T zh="返回登录" en="Back to Sign In" />
                    </Button>
                  </form>
                )}

                {showRecovery && otpSent && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <Label htmlFor="otp-recover"><T zh="验证码" en="Verification Code" /></Label>
                      <Input
                        id="otp-recover"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <T zh="已发送至" en="Sent to" /> {normalizePhone(phoneNumber, countryCode)}
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                      {loading ? <T zh="验证中..." en="Verifying..." /> : <T zh="验证并登录" en="Verify & Login" />}
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setShowRecovery(false);
                      }}
                    >
                      <T zh="返回登录" en="Back to Sign In" />
                    </Button>
                  </form>
                )}
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="full-name"><T zh="全名" en="Full Name" /> *</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="张三"
                      required
                    />
                  </div>
                  <div>
                    <Label><T zh="手机号码" en="Mobile Phone" /> *</Label>
                    <PhoneInput
                      countryCode={countryCode}
                      phoneNumber={phoneNumber}
                      onCountryCodeChange={setCountryCode}
                      onPhoneNumberChange={setPhoneNumber}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-signup"><T zh="电子邮件（可选）" en="Email (Optional)" /></Label>
                    <Input
                      id="email-signup"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password-signup"><T zh="密码" en="Password" /> *</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <T zh="注册中..." en="Signing up..." /> : <T zh="注册" en="Sign Up" />}
                  </Button>
                </form>
              </TabsContent>

            </Tabs>

            {/* Admin Email Login (Temporary) */}
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-muted-foreground mb-4 text-center">
                <T zh="管理员邮箱登录（临时）" en="Admin Email Login (Temporary)" />
              </p>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email-login"><T zh="邮箱" en="Email" /></Label>
                  <Input
                    id="email-login"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="admin@jjemas.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password-login"><T zh="密码" en="Password" /></Label>
                  <Input
                    id="password-login"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} variant="outline">
                  {loading ? <T zh="登录中..." en="Logging in..." /> : <T zh="邮箱登录" en="Email Login" />}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}