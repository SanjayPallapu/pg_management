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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          record_name: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          record_name?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          record_name?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      collector_names: {
        Row: {
          collector_key: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collector_key: string
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collector_key?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      day_guests: {
        Row: {
          amount_paid: number | null
          created_at: string
          from_date: string
          guest_name: string
          id: string
          id_proof: string | null
          mobile_number: string | null
          notes: string | null
          number_of_days: number
          payment_entries: Json | null
          payment_status: string
          per_day_rate: number
          room_id: string
          to_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          from_date: string
          guest_name: string
          id?: string
          id_proof?: string | null
          mobile_number?: string | null
          notes?: string | null
          number_of_days: number
          payment_entries?: Json | null
          payment_status?: string
          per_day_rate?: number
          room_id: string
          to_date: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          from_date?: string
          guest_name?: string
          id?: string
          id_proof?: string | null
          mobile_number?: string | null
          notes?: string | null
          number_of_days?: number
          payment_entries?: Json | null
          payment_status?: string
          per_day_rate?: number
          room_id?: string
          to_date?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_guests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      key_numbers: {
        Row: {
          created_at: string
          id: string
          room_number: string
          serial_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_number: string
          serial_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          room_number?: string
          serial_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          month: number
          pg_id: string
          updated_at: string
          year: number
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          month: number
          pg_id: string
          updated_at?: string
          year: number
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          month?: number
          pg_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pgs: {
        Row: {
          address: string | null
          created_at: string
          floors: number | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          floors?: number | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          floors?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_new_signup: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_new_signup?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_new_signup?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          floor: number
          id: string
          notes: string | null
          pg_id: string | null
          property_id: string | null
          rent_amount: number
          room_no: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          floor: number
          id?: string
          notes?: string | null
          pg_id?: string | null
          property_id?: string | null
          rent_amount: number
          room_no: string
          status: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          floor?: number
          id?: string
          notes?: string | null
          pg_id?: string | null
          property_id?: string | null
          rent_amount?: number
          room_no?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          approved_by: string | null
          created_at: string
          expires_at: string | null
          features: Json | null
          id: string
          max_pgs: number
          max_tenants_per_pg: number
          payment_approved_at: string | null
          payment_proof_url: string | null
          payment_requested_at: string | null
          plan: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_pgs?: number
          max_tenants_per_pg?: number
          payment_approved_at?: string | null
          payment_proof_url?: string | null
          payment_requested_at?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_pgs?: number
          max_tenants_per_pg?: number
          payment_approved_at?: string | null
          payment_proof_url?: string | null
          payment_requested_at?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_payments: {
        Row: {
          amount: number
          amount_paid: number | null
          created_at: string
          id: string
          month: number
          notes: string | null
          payment_date: string | null
          payment_entries: Json | null
          payment_status: string
          tenant_id: string
          updated_at: string
          whatsapp_sent: boolean | null
          whatsapp_sent_at: string | null
          year: number
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          payment_date?: string | null
          payment_entries?: Json | null
          payment_status?: string
          tenant_id: string
          updated_at?: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          payment_date?: string | null
          payment_entries?: Json | null
          payment_status?: string
          tenant_id?: string
          updated_at?: string
          whatsapp_sent?: boolean | null
          whatsapp_sent_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_locked: boolean
          monthly_rent: number
          name: string
          payment_date: string | null
          payment_status: string
          phone: string
          room_id: string
          security_deposit_amount: number | null
          security_deposit_date: string | null
          security_deposit_mode: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_locked?: boolean
          monthly_rent: number
          name: string
          payment_date?: string | null
          payment_status: string
          phone: string
          room_id: string
          security_deposit_amount?: number | null
          security_deposit_date?: string | null
          security_deposit_mode?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_locked?: boolean
          monthly_rent?: number
          name?: string
          payment_date?: string | null
          payment_status?: string
          phone?: string
          room_id?: string
          security_deposit_amount?: number | null
          security_deposit_date?: string | null
          security_deposit_mode?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      subscription_status: "free" | "pending" | "active" | "expired"
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
      app_role: ["admin", "staff"],
      subscription_status: ["free", "pending", "active", "expired"],
    },
  },
} as const
