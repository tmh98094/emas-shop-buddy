import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { GoldPriceBanner } from "@/components/GoldPriceBanner";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";
import { normalizePhone, parseE164 } from "@/lib/phone-utils";
import { T } from "@/components/T";

export default function UserProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [countryCode, setCountryCode] = useState("+60");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone_number: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setInitialLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        console.log("Loaded profile data:", data);
        
        // Parse existing phone number for country code and number
        const phone = data.phone_number || "";
        
        if (phone) {
          const { countryCode: parsedCC, national } = parseE164(phone);
          setCountryCode(parsedCC);
          setPhoneNumber(national);
        }
        
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone_number: phone,
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const normalizedPhone = normalizePhone(phoneNumber, countryCode);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          phone_number: normalizedPhone,
        });

      if (error) throw error;

      toast({
        title: "个人资料已更新",
        description: "您的个人资料已成功更新。",
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "错误",
        description: "新密码不匹配",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "错误",
        description: "密码必须至少6个字符",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "密码已更新",
        description: "您的密码已成功更改。",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
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

  return (
    <div className="min-h-screen bg-background">
      <GoldPriceBanner />
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6"><T zh="我的个人资料" en="My Profile" /></h1>

        {initialLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground"><T zh="正在加载您的个人资料..." en="Loading your profile..." /></p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile"><T zh="个人资料信息" en="Profile Information" /></TabsTrigger>
              <TabsTrigger value="password"><T zh="更改密码" en="Change Password" /></TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle><T zh="个人资料信息" en="Profile Information" /></CardTitle>
                  <CardDescription>
                    <T zh="更新您的个人信息" en="Update your personal information" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name"><T zh="全名" en="Full Name" /></Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) =>
                          setProfile({ ...profile, full_name: e.target.value })
                        }
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email"><T zh="电子邮件（可选）" en="Email (Optional)" /></Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        disabled={loading}
                      />
                    </div>

                    <PhoneInput
                      countryCode={countryCode}
                      phoneNumber={phoneNumber}
                      onCountryCodeChange={setCountryCode}
                      onPhoneNumberChange={setPhoneNumber}
                      label="Phone Number"
                      required
                    />

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <T zh="更新个人资料" en="Update Profile" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card>
                <CardHeader>
                  <CardTitle><T zh="更改密码" en="Change Password" /></CardTitle>
                  <CardDescription>
                    <T zh="更新您的密码以保护您的帐户安全" en="Update your password to keep your account secure" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword"><T zh="新密码" en="New Password" /></Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword"><T zh="确认新密码" en="Confirm New Password" /></Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        disabled={loading}
                        required
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <T zh="更改密码" en="Change Password" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
}
