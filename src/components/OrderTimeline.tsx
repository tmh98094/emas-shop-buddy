import { Clock, Package, Truck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: "pending" | "processing" | "shipped" | "completed" | "cancelled";
}

export function OrderTimeline({ status }: OrderTimelineProps) {
  const stages = [
    { key: "pending", label: "Pending", icon: Clock, color: "text-yellow-500" },
    { key: "processing", label: "Processing", icon: Package, color: "text-blue-500" },
    { key: "shipped", label: "Shipped", icon: Truck, color: "text-purple-500" },
    { key: "completed", label: "Completed", icon: CheckCircle, color: "text-green-500" },
  ];

  const currentStageIndex = stages.findIndex(s => s.key === status);
  
  if (status === "cancelled") {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive font-medium">Order Cancelled</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          
          return (
            <div key={stage.key} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-1/2 top-5 w-full h-0.5 -translate-y-1/2",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                  style={{ left: "50%", right: "-50%" }}
                />
              )}
              
              {/* Stage circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background transition-all",
                  isCompleted
                    ? "border-primary bg-primary/10"
                    : "border-muted",
                  isCurrent && "ring-4 ring-primary/20"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5",
                    isCompleted ? stage.color : "text-muted-foreground"
                  )} 
                />
              </div>
              
              {/* Stage label */}
              <span 
                className={cn(
                  "text-xs mt-2 text-center",
                  isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}