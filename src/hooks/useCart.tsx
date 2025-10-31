import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { SelectedVariantsMap } from "@/lib/cart-utils";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  calculated_price?: number;
  gold_price_snapshot?: number;
  locked_at?: string;
  selected_variants?: SelectedVariantsMap;
  product?: any;
}

interface CartContextType {
  items: CartItem[];
  addItem: (productId: string, quantity?: number, selectedVariants?: SelectedVariantsMap) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshPrices: () => Promise<void>;
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
          product:products(
            *,
            product_images(*)
          )
        `)
        .order('created_at', { ascending: true });

      if (user) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("session_id", sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map the data to CartItem type, converting selected_variants from Json to SelectedVariantsMap
      const mappedItems: CartItem[] = (data || []).map(item => ({
        ...item,
        selected_variants: (item.selected_variants as any) || {},
      }));
      
      setItems(mappedItems);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addItem = async (productId: string, quantity = 1, selectedVariants?: SelectedVariantsMap) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      // Fetch product details to calculate locked price
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("gold_type, weight_grams, labour_fee")
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      // Fetch current gold prices
      const { data: settings, error: settingsError } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);

      if (settingsError) throw settingsError;

      const goldPrices: Record<string, number> = {};
      settings?.forEach(item => {
        if (item.key === "gold_price_916") goldPrices["916"] = (item.value as any).price;
        else if (item.key === "gold_price_999") goldPrices["999"] = (item.value as any).price;
      });

      const goldPrice = goldPrices[product.gold_type as "916" | "999"] || 0;
      let weightGrams = typeof product.weight_grams === 'number' ? product.weight_grams : parseFloat(product.weight_grams as string);
      
      // Use variant weight adjustment if available
      if (selectedVariants) {
        const firstVariant = Object.values(selectedVariants)[0];
        if (firstVariant?.weight_adjustment) {
          weightGrams = firstVariant.weight_adjustment;
        }
      }
      
      const labourFee = typeof product.labour_fee === 'number' ? product.labour_fee : parseFloat(product.labour_fee as string);
      const calculatedPrice = Math.round((goldPrice * weightGrams + labourFee) * 100) / 100;

      const { error } = await supabase.from("cart_items").insert([{
        product_id: productId,
        quantity,
        user_id: user?.id,
        session_id: user ? null : sessionId,
        calculated_price: calculatedPrice,
        gold_price_snapshot: goldPrice,
        locked_at: new Date().toISOString(),
        selected_variants: JSON.parse(JSON.stringify(selectedVariants || {})),
      }]);

      if (error) throw error;
      await fetchCart();
      toast({ title: "Added!", duration: 2000 });
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

  const refreshPrices = async () => {
    try {
      // Fetch current gold prices
      const { data: settings, error: settingsError } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["gold_price_916", "gold_price_999"]);

      if (settingsError) throw settingsError;

      const goldPrices: Record<string, number> = {};
      settings?.forEach(item => {
        if (item.key === "gold_price_916") goldPrices["916"] = (item.value as any).price;
        else if (item.key === "gold_price_999") goldPrices["999"] = (item.value as any).price;
      });

      // Update all cart items with new prices
      for (const item of items) {
        const product = item.product;
        if (!product) continue;

        const goldPrice = goldPrices[product.gold_type as "916" | "999"] || 0;
        const weightGrams = typeof product.weight_grams === 'number' ? product.weight_grams : parseFloat(product.weight_grams as string);
        const labourFee = typeof product.labour_fee === 'number' ? product.labour_fee : parseFloat(product.labour_fee as string);
        const calculatedPrice = Math.round((goldPrice * weightGrams + labourFee) * 100) / 100;

        await supabase
          .from("cart_items")
          .update({
            calculated_price: calculatedPrice,
            gold_price_snapshot: goldPrice,
            locked_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }

      await fetchCart();
      toast({ title: "Prices Updated", description: "All cart prices have been refreshed with current gold prices." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, refreshPrices, loading }}>
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
