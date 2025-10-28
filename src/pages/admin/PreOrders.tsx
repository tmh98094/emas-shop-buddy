import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/price-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PreOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPreOrder, setSelectedPreOrder] = useState<any>(null);
  const [balanceDue, setBalanceDue] = useState("");
  const [notes, setNotes] = useState("");

  const { data: preOrders, isLoading } = useQuery({
    queryKey: ["admin-pre-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pre_orders")
        .select(`
          *,
          orders (
            id,
            order_number,
            full_name,
            phone_number,
            email,
            created_at
          ),
          products (
            id,
            name,
            gold_type,
            weight_grams,
            labour_fee,
            preorder_deposit
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updatePreOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("pre_orders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pre-orders"] });
      toast({
        title: "预订已更新",
        description: "预订状态已成功更新。",
      });
      setSelectedPreOrder(null);
      setBalanceDue("");
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "错误",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkAsReady = (preOrder: any) => {
    const balance = parseFloat(balanceDue);
    if (!balance || balance <= 0) {
      toast({
        title: "错误",
        description: "请输入有效的余额。",
        variant: "destructive",
      });
      return;
    }

    updatePreOrderMutation.mutate({
      id: preOrder.id,
      updates: {
        status: "ready_for_payment",
        balance_due: balance,
        ready_at: new Date().toISOString(),
        notes: notes || preOrder.notes,
      },
    });
  };

  const handleMarkAsCompleted = (preOrder: any) => {
    updatePreOrderMutation.mutate({
      id: preOrder.id,
      updates: {
        status: "completed",
        final_payment_at: new Date().toISOString(),
      },
    });
  };

  const handleCancel = (preOrder: any) => {
    updatePreOrderMutation.mutate({
      id: preOrder.id,
      updates: {
        status: "cancelled",
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800 border-amber-300",
      ready_for_payment: "bg-blue-100 text-blue-800 border-blue-300",
      completed: "bg-green-100 text-green-800 border-green-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
    };

    const labels = {
      pending: "待处理",
      ready_for_payment: "等待付款",
      completed: "已完成",
      cancelled: "已取消",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-5 w-5 text-amber-500" />,
      ready_for_payment: <Package className="h-5 w-5 text-blue-500" />,
      completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      cancelled: <XCircle className="h-5 w-5 text-red-500" />,
    };
    return icons[status as keyof typeof icons];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">预订管理</h2>
        <p className="text-muted-foreground">
          管理客户预订和订金支付
        </p>
      </div>

      <div className="grid gap-4">
        {preOrders && preOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">暂无预订</p>
          </Card>
        ) : (
          preOrders?.map((preOrder: any) => (
            <Card key={preOrder.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(preOrder.status)}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {preOrder.orders?.order_number}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {preOrder.products?.name}
                    </p>
                  </div>
                </div>
                {getStatusBadge(preOrder.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">客户信息</p>
                  <p className="font-medium">{preOrder.orders?.full_name}</p>
                  <p className="text-sm">{preOrder.orders?.phone_number}</p>
                  {preOrder.orders?.email && (
                    <p className="text-sm">{preOrder.orders?.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">产品详情</p>
                  <p className="text-sm">
                    黄金类型: {preOrder.products?.gold_type}
                  </p>
                  <p className="text-sm">
                    重量: {preOrder.products?.weight_grams}g
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">已支付订金</p>
                  <p className="font-bold text-primary">
                    RM {formatPrice(preOrder.deposit_paid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">剩余余额</p>
                  <p className="font-bold">
                    RM {formatPrice(preOrder.balance_due)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="text-sm">
                    {new Date(preOrder.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>

              {preOrder.notes && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-sm text-amber-900">
                    <strong>备注:</strong> {preOrder.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {preOrder.status === "pending" && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setSelectedPreOrder(preOrder);
                          setNotes(preOrder.notes || "");
                        }}
                      >
                        标记为准备就绪
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>标记预订为准备就绪</DialogTitle>
                        <DialogDescription>
                          输入余额金额并通知客户产品已准备好。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="balance">余额金额 (RM)</Label>
                          <Input
                            id="balance"
                            type="number"
                            step="0.01"
                            value={balanceDue}
                            onChange={(e) => setBalanceDue(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">备注（可选）</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="添加任何附加说明..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => handleMarkAsReady(preOrder)}
                          disabled={updatePreOrderMutation.isPending}
                        >
                          {updatePreOrderMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          确认
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {preOrder.status === "ready_for_payment" && (
                  <>
                    <Button onClick={() => handleMarkAsCompleted(preOrder)}>
                      标记为已完成
                    </Button>
                    {preOrder.ready_at && (
                      <p className="text-sm text-muted-foreground self-center">
                        准备时间:{" "}
                        {new Date(preOrder.ready_at).toLocaleDateString("zh-CN")}
                      </p>
                    )}
                  </>
                )}

                {preOrder.status === "completed" && preOrder.final_payment_at && (
                  <p className="text-sm text-muted-foreground self-center">
                    完成时间:{" "}
                    {new Date(preOrder.final_payment_at).toLocaleDateString("zh-CN")}
                  </p>
                )}

                {preOrder.status !== "cancelled" && preOrder.status !== "completed" && (
                  <Button
                    variant="destructive"
                    onClick={() => handleCancel(preOrder)}
                  >
                    取消
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
