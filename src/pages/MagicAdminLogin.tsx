import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MagicAdminLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyAndLogin = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        setStatus("error");
        setErrorMessage("No token provided in URL");
        return;
      }

      try {
        // Call the edge function to verify token and get credentials
        const { data, error } = await supabase.functions.invoke("admin-magic-login", {
          body: { token },
        });

        if (error) throw error;

        if (!data || !data.success) {
          throw new Error(data?.error || "Invalid or expired token");
        }

        // Sign in with the returned credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (signInError) throw signInError;

        setStatus("success");
        toast({
          title: "Admin Access Granted",
          description: "Redirecting to admin dashboard...",
        });

        // Redirect to admin dashboard
        setTimeout(() => {
          navigate("/admin");
        }, 1000);

      } catch (error: any) {
        console.error("Magic login error:", error);
        setStatus("error");
        setErrorMessage(error.message || "Failed to verify token");
        toast({
          title: "Login Failed",
          description: error.message || "Invalid or expired token",
          variant: "destructive",
        });
      }
    };

    verifyAndLogin();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>
            {status === "loading" && "Verifying Access..."}
            {status === "success" && "Access Granted"}
            {status === "error" && "Access Denied"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your magic admin token"}
            {status === "success" && "Redirecting to admin dashboard"}
            {status === "error" && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {status === "loading" && (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
          {status === "error" && (
            <p className="text-sm text-muted-foreground text-center">
              Please contact the administrator for a new magic login link.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}