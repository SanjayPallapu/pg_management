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
          collected_by: string | null
          created_at: string
          from_date: string
          gender: string | null
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
          room_no: string | null
          to_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          collected_by?: string | null
          created_at?: string
          from_date: string
          gender?: string | null
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
          room_no?: string | null
          to_date: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          collected_by?: string | null
          created_at?: string
          from_date?: string
          gender?: string | null
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
          room_no?: string | null
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
      expense_entries: {
        Row: {
          amount: number
          category: string
          created_at: string
          entry_date: string
          floor: number | null
          id: string
          label: string
          month: number
          notes: string | null
          pg_id: string
          room_id: string | null
          subcategory: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          entry_date?: string
          floor?: number | null
          id?: string
          label: string
          month: number
          notes?: string | null
          pg_id: string
          room_id?: string | null
          subcategory?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          entry_date?: string
          floor?: number | null
          id?: string
          label?: string
          month?: number
          notes?: string | null
          pg_id?: string
          room_id?: string | null
          subcategory?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_room_id_fkey"
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
          pg_id: string | null
          room_number: string
          serial_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pg_id?: string | null
          room_number: string
          serial_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pg_id?: string | null
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
      monthly_budgets: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: number
          pg_id: string
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          month: number
          pg_id: string
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: number
          pg_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_pg_id_fkey"
            columns: ["pg_id"]
            isOneToOne: false
            referencedRelation: "pgs"
            referencedColumns: ["id"]
          },
        ]
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
          electricity_unit_price: number
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
          electricity_unit_price?: number
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
          electricity_unit_price?: number
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
          is_archived: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_electricity_readings: {
        Row: {
          created_at: string
          end_reading: number | null
          id: string
          month: number
          room_id: string
          source: string | null
          split_count: number | null
          split_type: string | null
          start_reading: number | null
          unit_price: number
          units: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          end_reading?: number | null
          id?: string
          month: number
          room_id: string
          source?: string | null
          split_count?: number | null
          split_type?: string | null
          start_reading?: number | null
          unit_price?: number
          units?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          end_reading?: number | null
          id?: string
          month?: number
          room_id?: string
          source?: string | null
          split_count?: number | null
          split_type?: string | null
          start_reading?: number | null
          unit_price?: number
          units?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_electricity_readings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          floor: number
          id: string
          is_ac: boolean
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
          is_ac?: boolean
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
          is_ac?: boolean
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
          ac_payment_status: string | null
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
          ac_payment_status?: string | null
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
          ac_payment_status?: string | null
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
      tenant_snoozes: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          snoozed_until: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          snoozed_until: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          snoozed_until?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_snoozes_tenant_id_fkey"
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
      tenant_onboarding_profiles: {
        Row: {
          id: string
          tenant_id: string
          pg_id: string
          owner_id: string
          status: string
          verification_status: string
          full_name: string | null
          date_of_birth: string | null
          gender: string | null
          blood_group: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id_proof_type: string | null
          id_proof_number: string | null
          id_proof_url: string | null
          address_proof_url: string | null
          email: string | null
          alternate_phone: string | null
          permanent_address: string | null
          occupation: string | null
          company_name: string | null
          office_address: string | null
          stay_purpose: string | null
          expected_stay_duration: string | null
          move_in_date: string | null
          payment_mode: string | null
          upi_id: string | null
          bank_account_number: string | null
          ifsc_code: string | null
          bank_name: string | null
          food_preference: string | null
          dietary_restrictions: string | null
          rules_acknowledged: boolean | null
          agreement_accepted: boolean | null
          agreement_signed_at: string | null
          form_progress: number | null
          last_saved_step: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          pg_id: string
          owner_id: string
          status?: string
          verification_status?: string
          full_name?: string | null
          date_of_birth?: string | null
          gender?: string | null
          blood_group?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id_proof_type?: string | null
          id_proof_number?: string | null
          id_proof_url?: string | null
          address_proof_url?: string | null
          email?: string | null
          alternate_phone?: string | null
          permanent_address?: string | null
          occupation?: string | null
          company_name?: string | null
          office_address?: string | null
          stay_purpose?: string | null
          expected_stay_duration?: string | null
          move_in_date?: string | null
          payment_mode?: string | null
          upi_id?: string | null
          bank_account_number?: string | null
          ifsc_code?: string | null
          bank_name?: string | null
          food_preference?: string | null
          dietary_restrictions?: string | null
          rules_acknowledged?: boolean | null
          agreement_accepted?: boolean | null
          agreement_signed_at?: string | null
          form_progress?: number | null
          last_saved_step?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
      tenant_onboarding_links: {
        Row: {
          id: string
          tenant_id: string
          pg_id: string
          owner_id: string
          token: string
          status: string
          sent_via: string | null
          sent_at: string | null
          viewed_at: string | null
          started_at: string | null
          submitted_at: string | null
          completed_at: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          pg_id: string
          owner_id: string
          token?: string
          status?: string
          sent_via?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          started_at?: string | null
          submitted_at?: string | null
          completed_at?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
      tenant_onboarding_documents: {
        Row: {
          id: string
          onboarding_profile_id: string
          tenant_id: string
          document_type: string
          document_name: string | null
          file_url: string
          file_size: number | null
          mime_type: string | null
          status: string
          rejection_reason: string | null
          uploaded_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          onboarding_profile_id: string
          tenant_id: string
          document_type: string
          document_name?: string | null
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          status?: string
          rejection_reason?: string | null
          uploaded_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
      tenant_onboarding_timeline: {
        Row: {
          id: string
          tenant_id: string
          pg_id: string
          onboarding_profile_id: string | null
          event_type: string
          event_description: string | null
          event_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          pg_id: string
          onboarding_profile_id?: string | null
          event_type: string
          event_description?: string | null
          event_metadata?: Json | null
          created_at?: string
        }
        Update: {
          [key: string]: any
        }
        Relationships: []
      }
      tenant_onboarding_notifications: {
        Row: {
          id: string
          owner_id: string
          tenant_id: string
          pg_id: string
          notification_type: string
          title: string
          message: string | null
          is_read: boolean
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          tenant_id: string
          pg_id: string
          notification_type: string
          title: string
          message?: string | null
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
        Update: {
          [key: string]: any
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
      generate_onboarding_link: { Args: { p_tenant_id: string; p_pg_id: string; p_owner_id: string; p_sent_via?: string }; Returns: any }
      validate_onboarding_link: { Args: { p_token: string }; Returns: any }
      save_onboarding_form_data: { Args: { p_token: string; p_form_data: Json; p_step?: string; p_progress?: number; p_submit?: boolean }; Returns: any }
      verify_tenant_onboarding: { Args: { p_tenant_id: string; p_action: string; p_rejection_reason?: string; p_verifier_id: string }; Returns: any }
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
