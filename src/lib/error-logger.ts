import { supabase } from "@/integrations/supabase/client";

interface ErrorLog {
  error_message: string;
  stack_trace?: string;
  route?: string;
  user_agent?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export const logProductionError = async (
  error: Error,
  context?: {
    route?: string;
    action?: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    // Get current user if available
    const { data: { user } } = await supabase.auth.getUser();

    const errorLog: ErrorLog = {
      error_message: error.message || "Unknown error",
      stack_trace: error.stack,
      route: context?.route || window.location.pathname,
      user_agent: navigator.userAgent,
      user_id: user?.id,
      metadata: {
        action: context?.action,
        timestamp: new Date().toISOString(),
        ...context?.metadata,
      },
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error("Production Error Log:", errorLog);
    }

    // Only log to database in production or when explicitly enabled
    if (!import.meta.env.DEV) {
      await supabase.from("error_logs").insert([errorLog]);
    }
  } catch (loggingError) {
    // Don't throw errors from error logging
    console.error("Failed to log error:", loggingError);
  }
};

export const logCheckoutError = (error: Error, orderId?: string) => {
  return logProductionError(error, {
    action: "checkout",
    route: "/checkout",
    metadata: { orderId },
  });
};

export const logImageLoadError = (imageUrl: string, productId?: string) => {
  return logProductionError(new Error("Image load failed"), {
    action: "image_load",
    metadata: { imageUrl, productId },
  });
};

export const logProductCreationError = (error: Error, formData?: any) => {
  return logProductionError(error, {
    action: "product_creation",
    route: "/admin/products",
    metadata: { formData },
  });
};
