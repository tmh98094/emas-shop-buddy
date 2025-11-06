import { useState, useRef } from "react";
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
import ReCAPTCHA from "react-google-recaptcha";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  // Form states
  const [countryCode, setCountryCode] = useState("+60");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const handleSendEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify CAPTCHA
      const captchaToken = await recaptchaRef.current?.executeAsync();
      if (!captchaToken) {
        toast({
          title: "验证失败",
          description: "请完成验证",
          variant: "destructive",
        });
        return;
      }

      if (!email || !email.includes('@')) {
        toast({
          title: "邮箱无效",
          description: "请输入有效的邮箱地址",
          variant: "destructive",
        });
        return;
      }

      const normalizedPhone = normalizePhone(phoneNumber, countryCode);

      const { error } = await supabase.functions.invoke("send-verification-email", {
        body: {
          email,
          phoneNumber: normalizedPhone,
        },
      });

      if (error) throw error;

      setEmailVerificationSent(true);
      toast({
        title: "验证邮件已发送",
        description: "请检查您的邮箱并点击验证链接",
      });
    } catch (error: any) {
      toast({
        title: "发送失败",
        description: error.message || "发送验证邮件失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      recaptchaRef.current?.reset();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!emailVerified) {
        toast({
          title: "请先验证邮箱",
          description: "请先验证您的邮箱地址",
          variant: "destructive",
        });
        return;
      }

      if (!fullName.trim()) {
        toast({
          title: "注册失败",
          description: "请输入您的全名",
          variant: "destructive",
        });
        return;
      }

      const normalizedPhone = normalizePhone(phoneNumber, countryCode);
      
      // Sign up with phone + password
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

      if (error) {
        let errorMessage = "注册失败，请稍后重试";
        if (error.message.includes("already registered")) {
          errorMessage = "该手机号码已被注册";
        } else if (error.message.includes("Password should be")) {
          errorMessage = "密码必须至少6个字符";
        }
        toast({
          title: "注册失败",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Create or update profile (idempotent)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName,
            phone_number: normalizedPhone,
            email: email || null,
          }, { onConflict: 'id' });
        if (profileError) {
          console.error('Profile upsert error:', profileError);
        }
      }

      toast({
        title: "注册成功！",
        description: "您的账户已创建。",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "注册失败",
        description: "发生意外错误，请稍后重试",
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

      if (error) {
        let errorMessage = "登录失败，请检查您的信息";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "手机号码或密码不正确";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "请先确认您的邮箱";
        }
        toast({
          title: "登录失败",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "登录成功！",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: "发生意外错误，请稍后重试",
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
      console.log('Sending OTP to:', { original: phoneNumber, countryCode, normalized: normalizedPhone });
      
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
          ...(fullName ? { fullName } : {}),
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to verify OTP");
      }

      // Use the phone number returned by the server to ensure consistency
      const serverPhone = data.phoneNumber || normalizedPhone;

      // Sign in with phone and the OTP code (which was set as temporary password)
      let signInSuccess = false;
      let lastError = null;

      // Retry up to 3 times with exponential backoff
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          // Wait before retry: 500ms, 1000ms, 2000ms
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
          console.log(`[OTP] Retry sign-in attempt ${attempt + 1}`);
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          phone: serverPhone,
          password: otp, // Use the OTP code that the user entered
        });

        if (!signInError) {
          signInSuccess = true;
          console.log(`[OTP] Sign-in successful on attempt ${attempt + 1}`);
          break;
        }

        lastError = signInError;
        console.error(`[OTP] Sign-in attempt ${attempt + 1} failed:`, signInError);
      }

      if (!signInSuccess) {
        console.error("[OTP] All sign-in attempts failed:", lastError);
        throw new Error("登录失败，请重试或重新获取验证码。");
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
                  <>
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
                  </>
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
                {!emailVerificationSent && !emailVerified && (
                  <form onSubmit={handleSendEmailVerification} className="space-y-4">
                    <div className="bg-muted p-4 rounded-md mb-4">
                      <p className="text-sm text-muted-foreground">
                        <T zh="为了防止滥用，我们需要先验证您的邮箱。验证后即可完成注册。" 
                           en="To prevent abuse, we need to verify your email first. You can complete registration after verification." />
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="email-verify"><T zh="电子邮件" en="Email" /> *</Label>
                      <Input
                        id="email-verify"
                        type="email"
                        value={email}
                        placeholder="example@email.com"
                        onChange={(e) => setEmail(e.target.value)}
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
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                      size="invisible"
                    />
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <T zh="发送中..." en="Sending..." /> : <T zh="发送验证邮件" en="Send Verification Email" />}
                    </Button>
                  </form>
                )}

                {emailVerificationSent && !emailVerified && (
                  <div className="space-y-4">
                    <div className="bg-primary/10 p-4 rounded-md">
                      <p className="text-sm">
                        <T zh="验证邮件已发送至" en="Verification email sent to" /> <strong>{email}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <T zh="请检查您的邮箱并点击验证链接。验证成功后，请返回此页面继续注册。" 
                           en="Please check your email and click the verification link. After verification, return to this page to continue." />
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        const { data } = await supabase.functions.invoke("verify-email-token", {
                          body: { token: new URLSearchParams(window.location.search).get('token') }
                        });
                        if (data?.success) {
                          setEmailVerified(true);
                          toast({
                            title: "邮箱验证成功",
                            description: "您现在可以完成注册了",
                          });
                        }
                      }}
                    >
                      <T zh="我已验证，继续注册" en="I've Verified, Continue Registration" />
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="w-full"
                      onClick={() => {
                        setEmailVerificationSent(false);
                        setEmail("");
                      }}
                    >
                      <T zh="使用其他邮箱" en="Use Different Email" />
                    </Button>
                  </div>
                )}

                {emailVerified && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md mb-4">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ <T zh="邮箱已验证" en="Email Verified" />
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="full-name"><T zh="全名" en="Full Name" /> *</Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="例如：李小明"
                        required
                      />
                    </div>
                    <div>
                      <Label><T zh="手机号码" en="Mobile Phone" /></Label>
                      <Input
                        value={normalizePhone(phoneNumber, countryCode)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label><T zh="电子邮件" en="Email" /></Label>
                      <Input
                        value={email}
                        disabled
                        className="bg-muted"
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
                      {loading ? <T zh="注册中..." en="Signing up..." /> : <T zh="完成注册" en="Complete Registration" />}
                    </Button>
                  </form>
                )}
              </TabsContent>

            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
}