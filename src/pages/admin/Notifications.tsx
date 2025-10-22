import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { T } from "@/components/T";

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            <T zh="通知" en="Notifications" />
          </h1>
          <p className="text-muted-foreground mt-1">
            <T zh="管理系统通知和订单提醒" en="Manage system notifications and order alerts" />
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={() => markAllAsReadMutation.mutate()}>
            <CheckCheck className="h-4 w-4 mr-2" />
            <T zh="全部标记为已读" en="Mark All as Read" />
          </Button>
        )}
      </div>

      {unreadCount > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">
              <T 
                zh={`您有 ${unreadCount} 条未读通知`} 
                en={`You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`} 
              />
            </span>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {notifications?.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              <T zh="暂无通知" en="No notifications yet" />
            </p>
          </Card>
        ) : (
          notifications?.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 transition-colors ${
                !notification.is_read ? "bg-blue-50 border-blue-200" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.is_read && (
                      <Badge variant="default" className="text-xs">
                        <T zh="新" en="New" />
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {notification.order_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/orders/${notification.order_id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        <T zh="查看订单" en="View Order" />
                      </Link>
                    </Button>
                  )}
                  {!notification.is_read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
