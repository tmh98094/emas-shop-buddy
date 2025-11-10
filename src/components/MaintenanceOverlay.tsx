import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function MaintenanceOverlay({ isAdminRoute }: { isAdminRoute: boolean }) {
  const isAuthRoute = window.location.pathname.startsWith('/auth');
  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 60_000,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["user-role", session?.id],
    queryFn: async () => {
      if (!session?.id) return false;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.id)
        .eq("role", "admin")
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!session?.id,
    staleTime: 60_000,
  });

  const { data } = useQuery({
    queryKey: ["settings", "site_maintenance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "site_maintenance")
        .maybeSingle();
      return (data?.value as any) || { enabled: false };
    },
    staleTime: 60_000,
  });

  const enabled = data?.enabled && !isAuthRoute && !isAdmin;
  const message = data?.message || "We're performing urgent maintenance. We'll be back shortly.";
  const whatsapp = data?.whatsapp || "+60122379178";

  useEffect(() => {
    if (enabled) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border rounded-lg p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold mb-3">网站维护中</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <button
          onClick={() => {
            const url = `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hi, I saw the site is under maintenance. Can you help me?")}`;
            window.location.href = url;
          }}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          联系WhatsApp客服
        </button>
      </div>
    </div>
  );
}
