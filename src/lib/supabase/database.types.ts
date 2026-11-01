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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          occurred_at: string
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          occurred_at?: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          occurred_at?: string
          project_id?: string | null
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          answer: Json | null
          competence_statement_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          member_id: string
          project_id: string
          status: Database["public"]["Enums"]["item_status"]
          template_code: string
          template_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          answer?: Json | null
          competence_statement_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          member_id: string
          project_id: string
          status?: Database["public"]["Enums"]["item_status"]
          template_code: string
          template_id: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          answer?: Json | null
          competence_statement_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          member_id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["item_status"]
          template_code?: string
          template_id?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_competence_statement_id_fkey"
            columns: ["competence_statement_id"]
            isOneToOne: false
            referencedRelation: "competence_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "duty_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      competence_evidence: {
        Row: {
          document_id: string
          statement_id: string
        }
        Insert: {
          document_id: string
          statement_id: string
        }
        Update: {
          document_id?: string
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competence_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competence_evidence_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "competence_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      competence_statements: {
        Row: {
          behaviour_compliance: string
          behaviour_cooperation: string
          behaviour_limits: string
          content_sha256: string | null
          created_at: string
          experience: string
          has_serious_sanctions: boolean | null
          id: string
          knowledge: string
          organisational_capability: string
          sanctions_details: string
          skills: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          behaviour_compliance?: string
          behaviour_cooperation?: string
          behaviour_limits?: string
          content_sha256?: string | null
          created_at?: string
          experience?: string
          has_serious_sanctions?: boolean | null
          id?: string
          knowledge?: string
          organisational_capability?: string
          sanctions_details?: string
          skills?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          version: number
        }
        Update: {
          behaviour_compliance?: string
          behaviour_cooperation?: string
          behaviour_limits?: string
          content_sha256?: string | null
          created_at?: string
          experience?: string
          has_serious_sanctions?: boolean | null
          id?: string
          knowledge?: string
          organisational_capability?: string
          sanctions_details?: string
          skills?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          checklist_item_id: string | null
          created_at: string
          file_name: string
          id: string
          kind: string
          mime_type: string
          owner_id: string
          project_id: string | null
          sha256: string
          size_bytes: number
          storage_path: string
          withdrawn_at: string | null
          withdrawn_reason: string | null
        }
        Insert: {
          checklist_item_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          kind: string
          mime_type: string
          owner_id: string
          project_id?: string | null
          sha256: string
          size_bytes: number
          storage_path: string
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
        }
        Update: {
          checklist_item_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string
          owner_id?: string
          project_id?: string | null
          sha256?: string
          size_bytes?: number
          storage_path?: string
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_templates: {
        Row: {
          code: string
          conditions: Json
          created_at: string
          domestic_transfer_to:
            | Database["public"]["Enums"]["dutyholder_role"]
            | null
          explanation: string
          id: string
          item_type: Database["public"]["Enums"]["item_type"]
          legal_reference: string
          legislation_url: string | null
          roles: Database["public"]["Enums"]["dutyholder_role"][]
          sort_order: number
          superseded_at: string | null
          title: string
          version: number
        }
        Insert: {
          code: string
          conditions?: Json
          created_at?: string
          domestic_transfer_to?:
            | Database["public"]["Enums"]["dutyholder_role"]
            | null
          explanation: string
          id?: string
          item_type: Database["public"]["Enums"]["item_type"]
          legal_reference: string
          legislation_url?: string | null
          roles: Database["public"]["Enums"]["dutyholder_role"][]
          sort_order?: number
          superseded_at?: string | null
          title: string
          version?: number
        }
        Update: {
          code?: string
          conditions?: Json
          created_at?: string
          domestic_transfer_to?:
            | Database["public"]["Enums"]["dutyholder_role"]
            | null
          explanation?: string
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          legal_reference?: string
          legislation_url?: string | null
          roles?: Database["public"]["Enums"]["dutyholder_role"][]
          sort_order?: number
          superseded_at?: string | null
          title?: string
          version?: number
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_by: string | null
          chasing_paused: boolean
          created_at: string
          discipline: string | null
          display_name: string
          email: string
          id: string
          invited_at: string | null
          is_firm: boolean
          is_owner: boolean
          project_id: string
          removed_at: string | null
          role: Database["public"]["Enums"]["dutyholder_role"] | null
          user_id: string | null
        }
        Insert: {
          added_by?: string | null
          chasing_paused?: boolean
          created_at?: string
          discipline?: string | null
          display_name?: string
          email: string
          id?: string
          invited_at?: string | null
          is_firm?: boolean
          is_owner?: boolean
          project_id: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["dutyholder_role"] | null
          user_id?: string | null
        }
        Update: {
          added_by?: string | null
          chasing_paused?: boolean
          created_at?: string
          discipline?: string | null
          display_name?: string
          email?: string
          id?: string
          invited_at?: string | null
          is_firm?: boolean
          is_owner?: boolean
          project_id?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["dutyholder_role"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          cdm_pd_certified: boolean
          created_at: string
          created_by: string | null
          description: string
          domestic_duties_to_pd: boolean
          expected_contractors: number
          id: string
          is_domestic_client: boolean
          is_higher_risk: boolean
          jurisdiction: Database["public"]["Enums"]["jurisdiction"]
          name: string
          retention_years: number
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          address?: string
          cdm_pd_certified?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          domestic_duties_to_pd?: boolean
          expected_contractors?: number
          id?: string
          is_domestic_client?: boolean
          is_higher_risk?: boolean
          jurisdiction?: Database["public"]["Enums"]["jurisdiction"]
          name: string
          retention_years?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          cdm_pd_certified?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          domestic_duties_to_pd?: boolean
          expected_contractors?: number
          id?: string
          is_domestic_client?: boolean
          is_higher_risk?: boolean
          jurisdiction?: Database["public"]["Enums"]["jurisdiction"]
          name?: string
          retention_years?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          checklist_item_id: string
          id: string
          ip_address: unknown
          member_id: string
          project_id: string
          signed_at: string
          statement: string
          statement_sha256: string
          template_code: string
          template_version: number
          typed_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          id?: string
          ip_address?: unknown
          member_id: string
          project_id: string
          signed_at?: string
          statement: string
          statement_sha256: string
          template_code: string
          template_version: number
          typed_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          id?: string
          ip_address?: unknown
          member_id?: string
          project_id?: string
          signed_at?: string
          statement?: string
          statement_sha256?: string
          template_code?: string
          template_version?: number
          typed_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: true
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member: {
        Args: {
          p_discipline: string
          p_display_name: string
          p_email: string
          p_is_firm: boolean
          p_project_id: string
          p_role: Database["public"]["Enums"]["dutyholder_role"]
        }
        Returns: string
      }
      assert_my_item: {
        Args: { p_item_id: string }
        Returns: {
          answer: Json | null
          competence_statement_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          member_id: string
          project_id: string
          status: Database["public"]["Enums"]["item_status"]
          template_code: string
          template_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "checklist_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_simple_form: {
        Args: { v_item: Database["public"]["Tables"]["checklist_items"]["Row"] }
        Returns: undefined
      }
      can_read_document: { Args: { p_document_id: string }; Returns: boolean }
      can_read_storage_path: { Args: { p_path: string }; Returns: boolean }
      check_invite: { Args: { p_token: string }; Returns: string }
      checklist_wanted: {
        Args: { p_project_id: string }
        Returns: {
          member_id: string
          template_code: string
          template_id: string
        }[]
      }
      complete_form_item: { Args: { p_item_id: string }; Returns: undefined }
      complete_upload_item: { Args: { p_item_id: string }; Returns: undefined }
      create_invite: { Args: { p_email: string }; Returns: string }
      create_project: {
        Args: {
          p_address: string
          p_cdm_pd_certified: boolean
          p_description: string
          p_domestic_duties_to_pd: boolean
          p_expected_contractors: number
          p_is_domestic_client: boolean
          p_is_higher_risk: boolean
          p_name: string
          p_owner_role: Database["public"]["Enums"]["dutyholder_role"]
        }
        Returns: string
      }
      generate_checklist: { Args: { p_project_id: string }; Returns: undefined }
      generate_recovery_codes: { Args: never; Returns: string[] }
      invite_project_member: {
        Args: { p_member_id: string }
        Returns: {
          email: string
          owner_name: string
          project_id: string
          project_name: string
          token: string
        }[]
      }
      is_aal2: { Args: never; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      normalise_name: { Args: { p_name: string }; Returns: string }
      normalise_recovery_code: { Args: { p_code: string }; Returns: string }
      owns_project_using_statement: {
        Args: { p_statement_id: string }
        Returns: boolean
      }
      record_invite_email: {
        Args: { p_detail: string; p_member_id: string; p_sent: boolean }
        Returns: undefined
      }
      record_mfa_enrolled: { Args: never; Returns: undefined }
      recovery_codes_remaining: { Args: never; Returns: number }
      register_document: {
        Args: {
          p_file_name: string
          p_item_id?: string
          p_mime_type: string
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      request_ip: { Args: never; Returns: unknown }
      save_item_answer: {
        Args: { p_item_id: string; p_text: string }
        Returns: undefined
      }
      sha256_hex: { Args: { p_value: string }; Returns: string }
      shares_project_with: { Args: { p_user_id: string }; Returns: boolean }
      sign_acknowledgement: {
        Args: { p_item_id: string; p_typed_name: string; p_user_agent?: string }
        Returns: string
      }
      start_competence_draft: { Args: never; Returns: string }
      submit_competence: { Args: { p_item_id: string }; Returns: string }
      use_recovery_code: { Args: { p_code: string }; Returns: boolean }
      withdraw_document: {
        Args: { p_document_id: string; p_reason: string }
        Returns: undefined
      }
      write_audit: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      write_project_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
          p_project_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      dutyholder_role:
        | "client"
        | "principal_designer"
        | "designer"
        | "principal_contractor"
        | "contractor"
      item_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "needs_info"
        | "complete"
      item_type: "acknowledge" | "upload" | "form" | "sign" | "review"
      jurisdiction: "england" | "wales"
      project_status: "setup" | "active" | "complete" | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      dutyholder_role: [
        "client",
        "principal_designer",
        "designer",
        "principal_contractor",
        "contractor",
      ],
      item_status: [
        "not_started",
        "in_progress",
        "submitted",
        "needs_info",
        "complete",
      ],
      item_type: ["acknowledge", "upload", "form", "sign", "review"],
      jurisdiction: ["england", "wales"],
      project_status: ["setup", "active", "complete", "archived"],
    },
  },
} as const
