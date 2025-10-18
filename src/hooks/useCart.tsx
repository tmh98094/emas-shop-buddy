import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  variant_id?: string;
  color_id?: string;
  product?: any;
}

interface CartContextType {
  items: CartItem[];
  addItem: (productId: string, quantity?: number, variantId?: string, colorId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Get or create session ID for guest users
  const getSessionId = () => {
    let sessionId = localStorage.getItem("guest_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("guest_session_id", sessionId);
    }
    return sessionId;
  };

  const fetchCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      let query = supabase
        .from("cart_items")
        .select(`
          *,
          product:products(*)
        `);

      if (user) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("session_id", sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addItem = async (productId: string, quantity = 1, variantId?: string, colorId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      const { error } = await supabase.from("cart_items").insert({
        product_id: productId,
        quantity,
        variant_id: variantId,
        color_id: colorId,
        user_id: user?.id,
        session_id: user ? null : sessionId,
      });

      if (error) throw error;
      await fetchCart();
      toast({ title: "Added to cart!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId);

      if (error) throw error;
      await fetchCart();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      await fetchCart();
      toast({ title: "Removed from cart" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      let query = supabase.from("cart_items").delete();

      if (user) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("session_id", sessionId);
      }

      const { error } = await query;
      if (error) throw error;
      setItems([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
