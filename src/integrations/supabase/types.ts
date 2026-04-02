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
      agenda_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          source: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          source?: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agenda_recurrences: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          description: string | null
          event_time: string | null
          frequency: string
          id: string
          last_event_id: string | null
          next_run_at: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
          weekday: number | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          description?: string | null
          event_time?: string | null
          frequency: string
          id?: string
          last_event_id?: string | null
          next_run_at: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
          weekday?: number | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          description?: string | null
          event_time?: string | null
          frequency?: string
          id?: string
          last_event_id?: string | null
          next_run_at?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_recurrences_last_event_id_fkey"
            columns: ["last_event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_slug: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_hash: string | null
          latency_ms: number | null
          response_content: string | null
          status: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          agent_slug?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_hash?: string | null
          latency_ms?: number | null
          response_content?: string | null
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          agent_slug?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_hash?: string | null
          latency_ms?: number | null
          response_content?: string | null
          status?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "agent_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active: boolean
          created_at: string | null
          description: string | null
          id: string
          max_tokens: number
          model: string
          name: string
          prompt: string
          routing_keywords: string[] | null
          slug: string
          temperature: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          max_tokens?: number
          model?: string
          name: string
          prompt?: string
          routing_keywords?: string[] | null
          slug: string
          temperature?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          max_tokens?: number
          model?: string
          name?: string
          prompt?: string
          routing_keywords?: string[] | null
          slug?: string
          temperature?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          alert_at_100: boolean | null
          alert_at_70: boolean | null
          alert_at_90: boolean | null
          created_at: string | null
          id: string
          monthly_limit: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_at_100?: boolean | null
          alert_at_70?: boolean | null
          alert_at_90?: boolean | null
          created_at?: string | null
          id?: string
          monthly_limit?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_at_100?: boolean | null
          alert_at_70?: boolean | null
          alert_at_90?: boolean | null
          created_at?: string | null
          id?: string
          monthly_limit?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      commitment_reminders: {
        Row: {
          channel: string
          commitment_id: string
          created_at: string
          custom_days: number | null
          id: string
          last_sent_at: string | null
          next_alert_date: string | null
          recurrence_mode: string | null
          status: string
          timing: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          commitment_id: string
          created_at?: string
          custom_days?: number | null
          id?: string
          last_sent_at?: string | null
          next_alert_date?: string | null
          recurrence_mode?: string | null
          status?: string
          timing?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          commitment_id?: string
          created_at?: string
          custom_days?: number | null
          id?: string
          last_sent_at?: string | null
          next_alert_date?: string | null
          recurrence_mode?: string | null
          status?: string
          timing?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_reminders_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "financial_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_buffer: {
        Row: {
          agent_slug: string | null
          channel: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          message_type: string
          raw_payload: Json | null
          role: string
          user_id: string
        }
        Insert: {
          agent_slug?: string | null
          channel?: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          raw_payload?: Json | null
          role: string
          user_id: string
        }
        Update: {
          agent_slug?: string | null
          channel?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          raw_payload?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_buffer_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "conversation_buffer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_secrets: {
        Row: {
          created_at: string | null
          encrypted_value: string
          id: string
          key_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_value: string
          id?: string
          key_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_value?: string
          id?: string
          key_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_commitments: {
        Row: {
          amount: number | null
          category_id: string | null
          created_at: string | null
          current_installment: number | null
          date: string
          frequency: string | null
          id: string
          is_indefinite: boolean | null
          origin: string
          start_date: string | null
          status: string
          time: string | null
          title: string
          total_amount_paid: number | null
          total_installments: number | null
          total_payments_made: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          current_installment?: number | null
          date: string
          frequency?: string | null
          id?: string
          is_indefinite?: boolean | null
          origin?: string
          start_date?: string | null
          status?: string
          time?: string | null
          title: string
          total_amount_paid?: number | null
          total_installments?: number | null
          total_payments_made?: number | null
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          current_installment?: number | null
          date?: string
          frequency?: string | null
          id?: string
          is_indefinite?: boolean | null
          origin?: string
          start_date?: string | null
          status?: string
          time?: string | null
          title?: string
          total_amount_paid?: number | null
          total_installments?: number | null
          total_payments_made?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_commitments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          created_at: string | null
          current_amount: number | null
          deadline: string | null
          id: string
          status: string | null
          target_amount: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          id?: string
          status?: string | null
          target_amount: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          deadline?: string | null
          id?: string
          status?: string | null
          target_amount?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_messages: {
        Row: {
          channel: string
          content: string | null
          id: string
          media_base64: string | null
          message_id: string
          message_type: string
          processed: boolean
          processed_at: string | null
          raw_payload: Json | null
          received_at: string
          remote_jid: string
          user_id: string | null
        }
        Insert: {
          channel?: string
          content?: string | null
          id?: string
          media_base64?: string | null
          message_id: string
          message_type?: string
          processed?: boolean
          processed_at?: string | null
          raw_payload?: Json | null
          received_at?: string
          remote_jid: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          content?: string | null
          id?: string
          media_base64?: string | null
          message_id?: string
          message_type?: string
          processed?: boolean
          processed_at?: string | null
          raw_payload?: Json | null
          received_at?: string
          remote_jid?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_evolution: {
        Row: {
          active: boolean
          api_key: string
          api_url: string
          created_at: string | null
          id: string
          instance_name: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          active?: boolean
          api_key?: string
          api_url?: string
          created_at?: string | null
          id?: string
          instance_name?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          active?: boolean
          api_key?: string
          api_url?: string
          created_at?: string | null
          id?: string
          instance_name?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      message_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          inbound_message_id: string
          last_error: string | null
          next_run_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          inbound_message_id: string
          last_error?: string | null
          next_run_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          inbound_message_id?: string
          last_error?: string | null
          next_run_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_inbound_message_id_fkey"
            columns: ["inbound_message_id"]
            isOneToOne: true
            referencedRelation: "inbound_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_locks: {
        Row: {
          locked_until: string
          updated_at: string
          user_id: string
        }
        Insert: {
          locked_until: string
          updated_at?: string
          user_id: string
        }
        Update: {
          locked_until?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_locks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          telefone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          amount: number
          commitment_id: string
          created_at: string | null
          due_date: string
          id: string
          paid_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          commitment_id: string
          created_at?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          commitment_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "financial_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string
          id: string
          next_execution: string | null
          origin: string | null
          recurrence: string | null
          reminder_date: string | null
          reminder_time: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description: string
          id?: string
          next_execution?: string | null
          origin?: string | null
          recurrence?: string | null
          reminder_date?: string | null
          reminder_time?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string
          id?: string
          next_execution?: string | null
          origin?: string | null
          recurrence?: string | null
          reminder_date?: string | null
          reminder_time?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          end_date: string | null
          id: string
          last_renewal: string | null
          next_billing: string | null
          observacoes: string | null
          origin: string | null
          plan: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          last_renewal?: string | null
          next_billing?: string | null
          observacoes?: string | null
          origin?: string | null
          plan?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          last_renewal?: string | null
          next_billing?: string | null
          observacoes?: string | null
          origin?: string | null
          plan?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          origin: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          origin?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          origin?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      cleanup_expired_buffer: { Args: never; Returns: number }
      decrypt_secret: { Args: { encrypted: string }; Returns: string }
      delete_user_account: { Args: never; Returns: undefined }
      encrypt_secret: { Args: { secret: string }; Returns: string }
      get_decrypted_secret: { Args: { p_key_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      upsert_encrypted_secret: {
        Args: { p_key_name: string; p_value: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
