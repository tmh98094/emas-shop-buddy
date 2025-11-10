export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          calculated_price: number | null
          color_id: string | null
          created_at: string
          gold_price_snapshot: number | null
          id: string
          locked_at: string | null
          product_id: string
          quantity: number
          selected_variants: Json | null
          session_id: string | null
          updated_at: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          calculated_price?: number | null
          color_id?: string | null
          created_at?: string
          gold_price_snapshot?: number | null
          id?: string
          locked_at?: string | null
          product_id: string
          quantity?: number
          selected_variants?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          calculated_price?: number | null
          color_id?: string | null
          created_at?: string
          gold_price_snapshot?: number | null
          id?: string
          locked_at?: string | null
          product_id?: string
          quantity?: number
          selected_variants?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          description_zh: string | null
          display_order: number | null
          id: string
          image_url: string | null
          name: string
          name_zh: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_zh?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name: string
          name_zh?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_zh?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name?: string
          name_zh?: string | null
          slug?: string
        }
        Relationships: []
      }
      content_pages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          key: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          key: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          key?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string | null
          error_message: string
          id: string
          metadata: Json | null
          route: string | null
          stack_trace: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          id?: string
          metadata?: Json | null
          route?: string | null
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          id?: string
          metadata?: Json | null
          route?: string | null
          stack_trace?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color_name: string | null
          created_at: string
          gold_price_at_purchase: number
          gold_type: Database["public"]["Enums"]["gold_type"]
          id: string
          labour_fee: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          variant_name: string | null
          variant_selection: string | null
          variant_value: string | null
          weight_grams: number
        }
        Insert: {
          color_name?: string | null
          created_at?: string
          gold_price_at_purchase: number
          gold_type: Database["public"]["Enums"]["gold_type"]
          id?: string
          labour_fee: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          subtotal: number
          variant_name?: string | null
          variant_selection?: string | null
          variant_value?: string | null
          weight_grams: number
        }
        Update: {
          color_name?: string | null
          created_at?: string
          gold_price_at_purchase?: number
          gold_type?: Database["public"]["Enums"]["gold_type"]
          id?: string
          labour_fee?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          variant_name?: string | null
          variant_selection?: string | null
          variant_value?: string | null
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_notes: string | null
          email: string | null
          full_name: string
          guest_name: string | null
          guest_phone: string | null
          ic_number: string
          id: string
          notes: string | null
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"]
          payment_link_generated_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone_number: string
          postage_delivery_id: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postcode: string | null
          shipping_state: string | null
          stripe_payment_id: string | null
          stripe_session_expires_at: string | null
          stripe_session_url: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_notes?: string | null
          email?: string | null
          full_name: string
          guest_name?: string | null
          guest_phone?: string | null
          ic_number?: string
          id?: string
          notes?: string | null
          order_number: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_link_generated_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone_number: string
          postage_delivery_id?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          shipping_state?: string | null
          stripe_payment_id?: string | null
          stripe_session_expires_at?: string | null
          stripe_session_url?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_notes?: string | null
          email?: string | null
          full_name?: string
          guest_name?: string | null
          guest_phone?: string | null
          ic_number?: string
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"]
          payment_link_generated_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone_number?: string
          postage_delivery_id?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          shipping_state?: string | null
          stripe_payment_id?: string | null
          stripe_session_expires_at?: string | null
          stripe_session_url?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      pre_orders: {
        Row: {
          balance_due: number
          created_at: string
          deposit_paid: number
          final_payment_at: string | null
          id: string
          notes: string | null
          order_id: string
          product_id: string
          ready_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          balance_due: number
          created_at?: string
          deposit_paid: number
          final_payment_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          ready_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          balance_due?: number
          created_at?: string
          deposit_paid?: number
          final_payment_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          ready_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          created_at: string
          hex_code: string | null
          id: string
          name: string
          product_id: string
        }
        Insert: {
          created_at?: string
          hex_code?: string | null
          id?: string
          name: string
          product_id: string
        }
        Update: {
          created_at?: string
          hex_code?: string | null
          id?: string
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          blur_placeholder: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_thumbnail: boolean | null
          media_type: string | null
          product_id: string
        }
        Insert: {
          blur_placeholder?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_thumbnail?: boolean | null
          media_type?: string | null
          product_id: string
        }
        Update: {
          blur_placeholder?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_thumbnail?: boolean | null
          media_type?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          name: string
          price_adjustment: number | null
          product_id: string
          stock_adjustment: number | null
          value: string
          weight_adjustment: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_adjustment?: number | null
          product_id: string
          stock_adjustment?: number | null
          value: string
          weight_adjustment?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_adjustment?: number | null
          product_id?: string
          stock_adjustment?: number | null
          value?: string
          weight_adjustment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cached_current_price: number | null
          category_id: string | null
          created_at: string
          description: string | null
          description_zh: string | null
          gold_type: Database["public"]["Enums"]["gold_type"]
          id: string
          is_best_seller: boolean | null
          is_featured: boolean | null
          is_new_arrival: boolean | null
          is_preorder: boolean | null
          labour_fee: number
          low_stock_threshold: number | null
          name: string
          name_zh: string | null
          preorder_deposit: number | null
          slug: string
          stock: number
          sub_category_id: string | null
          updated_at: string
          weight_grams: number
        }
        Insert: {
          cached_current_price?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_zh?: string | null
          gold_type: Database["public"]["Enums"]["gold_type"]
          id?: string
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          is_new_arrival?: boolean | null
          is_preorder?: boolean | null
          labour_fee?: number
          low_stock_threshold?: number | null
          name: string
          name_zh?: string | null
          preorder_deposit?: number | null
          slug: string
          stock?: number
          sub_category_id?: string | null
          updated_at?: string
          weight_grams: number
        }
        Update: {
          cached_current_price?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_zh?: string | null
          gold_type?: Database["public"]["Enums"]["gold_type"]
          id?: string
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          is_new_arrival?: boolean | null
          is_preorder?: boolean | null
          labour_fee?: number
          low_stock_threshold?: number | null
          name?: string
          name_zh?: string | null
          preorder_deposit?: number | null
          slug?: string
          stock?: number
          sub_category_id?: string | null
          updated_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          email_verification_sent_at: string | null
          email_verification_token: string | null
          email_verified: boolean | null
          full_name: string | null
          ic_number: string | null
          id: string
          phone_number: string
          postcode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          ic_number?: string | null
          id: string
          phone_number: string
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          email_verification_sent_at?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          ic_number?: string | null
          id?: string
          phone_number?: string
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          search_query: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          search_query: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          search_query?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      stock_notifications: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          notified: boolean | null
          notified_at: string | null
          phone: string | null
          product_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          phone?: string | null
          product_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          notified?: boolean | null
          notified_at?: string | null
          phone?: string | null
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_categories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          description_zh: string | null
          display_order: number | null
          featured_on_homepage: boolean | null
          id: string
          image_url: string | null
          name: string
          name_zh: string | null
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          description_zh?: string | null
          display_order?: number | null
          featured_on_homepage?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          name_zh?: string | null
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          description_zh?: string | null
          display_order?: number | null
          featured_on_homepage?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          name_zh?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      touch_n_go_payments: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          receipt_image_url: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          receipt_image_url: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          receipt_image_url?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "touch_n_go_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variant_stock: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          stock: number
          updated_at: string | null
          variant_combination: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          stock?: number
          updated_at?: string | null
          variant_combination: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          stock?: number
          updated_at?: string | null
          variant_combination?: Json
        }
        Relationships: [
          {
            foreignKeyName: "variant_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_product_total_stock: {
        Args: { p_product_id: string }
        Returns: number
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      expire_unpaid_orders: { Args: never; Returns: undefined }
      get_next_order_sequence: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_phone_sql: { Args: { p_input: string }; Returns: string }
      restore_stock_for_expired_orders: { Args: never; Returns: undefined }
      update_product_cached_prices: { Args: never; Returns: undefined }
      upsert_gold_settings: {
        Args: {
          price_916: number
          price_999: number
          qr_url: string
          updated_by: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      gold_type: "916" | "999"
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "cancelled"
        | "refunded"
        | "stock_released"
      payment_method: "stripe_fpx" | "touch_n_go"
      payment_status: "pending" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      gold_type: ["916", "999"],
      order_status: [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "refunded",
        "stock_released",
      ],
      payment_method: ["stripe_fpx", "touch_n_go"],
      payment_status: ["pending", "completed", "failed"],
    },
  },
} as const
