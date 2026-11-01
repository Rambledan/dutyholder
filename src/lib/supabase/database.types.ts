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
      appointment_signatories: {
        Row: {
          appointment_id: string
          member_id: string
          party: string
        }
        Insert: {
          appointment_id: string
          member_id: string
          party: string
        }
        Update: {
          appointment_id?: string
          member_id?: string
          party?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_signatories_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_signatories_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_signatures: {
        Row: {
          appointment_id: string
          id: string
          ip_address: unknown
          letter_sha256: string
          member_id: string
          party: string
          signed_at: string
          typed_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          appointment_id: string
          id?: string
          ip_address?: unknown
          letter_sha256: string
          member_id: string
          party: string
          signed_at?: string
          typed_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string
          id?: string
          ip_address?: unknown
          letter_sha256?: string
          member_id?: string
          party?: string
          signed_at?: string
          typed_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_signatures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_signatures_appointment_id_member_id_party_fkey"
            columns: ["appointment_id", "member_id", "party"]
            isOneToOne: true
            referencedRelation: "appointment_signatories"
            referencedColumns: ["appointment_id", "member_id", "party"]
          },
          {
            foreignKeyName: "appointment_signatures_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointee_member_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["appointment_kind"]
          letter_sha256: string
          letter_text: string
          letter_title: string
          project_id: string
          status: string
          template_version: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          appointee_member_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["appointment_kind"]
          letter_sha256: string
          letter_text: string
          letter_title: string
          project_id: string
          status?: string
          template_version: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          appointee_member_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          letter_sha256?: string
          letter_text?: string
          letter_title?: string
          project_id?: string
          status?: string
          template_version?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointee_member_id_fkey"
            columns: ["appointee_member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      competence_change_reports: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          member_id: string
          note: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          member_id: string
          note: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          member_id?: string
          note?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competence_change_reports_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competence_change_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      exports: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          expires_at: string | null
          file_count: number | null
          file_name: string | null
          id: string
          project_id: string
          requested_by: string
          sha256: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
          warnings: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string | null
          file_count?: number | null
          file_name?: string | null
          id?: string
          project_id: string
          requested_by: string
          sha256?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          warnings?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string | null
          file_count?: number | null
          file_name?: string | null
          id?: string
          project_id?: string
          requested_by?: string
          sha256?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          warnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          member_id: string | null
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
          member_id?: string | null
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
          member_id?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
        ]
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
          job_title: string
          memberships: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string
          id: string
          job_title?: string
          memberships?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string
          memberships?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          accepted_at: string | null
          added_by: string | null
          chasing_paused: boolean
          created_at: string
          declined_at: string | null
          demo_persona: string | null
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
          accepted_at?: string | null
          added_by?: string | null
          chasing_paused?: boolean
          created_at?: string
          declined_at?: string | null
          demo_persona?: string | null
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
          accepted_at?: string | null
          added_by?: string | null
          chasing_paused?: boolean
          created_at?: string
          declined_at?: string | null
          demo_persona?: string | null
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
          clock_offset_days: number
          construction_start_date: string | null
          created_at: string
          created_by: string | null
          demo_started_at: string | null
          demo_state: Json
          description: string
          domestic_duties_to_pd: boolean
          expected_contractors: number
          id: string
          is_demo: boolean
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
          clock_offset_days?: number
          construction_start_date?: string | null
          created_at?: string
          created_by?: string | null
          demo_started_at?: string | null
          demo_state?: Json
          description?: string
          domestic_duties_to_pd?: boolean
          expected_contractors?: number
          id?: string
          is_demo?: boolean
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
          clock_offset_days?: number
          construction_start_date?: string | null
          created_at?: string
          created_by?: string | null
          demo_started_at?: string | null
          demo_state?: Json
          description?: string
          domestic_duties_to_pd?: boolean
          expected_contractors?: number
          id?: string
          is_demo?: boolean
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
      reminders: {
        Row: {
          body_text: string | null
          cc_emails: string[]
          created_at: string
          detail: string | null
          id: string
          item_ids: string[]
          kind: string
          member_id: string
          project_day: string
          project_id: string
          recipient_email: string
          sent_at: string | null
          simulated: boolean
          status: string
          step_key: string
          subject: string | null
        }
        Insert: {
          body_text?: string | null
          cc_emails?: string[]
          created_at?: string
          detail?: string | null
          id?: string
          item_ids?: string[]
          kind: string
          member_id: string
          project_day: string
          project_id: string
          recipient_email: string
          sent_at?: string | null
          simulated?: boolean
          status?: string
          step_key: string
          subject?: string | null
        }
        Update: {
          body_text?: string | null
          cc_emails?: string[]
          created_at?: string
          detail?: string | null
          id?: string
          item_ids?: string[]
          kind?: string
          member_id?: string
          project_day?: string
          project_id?: string
          recipient_email?: string
          sent_at?: string | null
          simulated?: boolean
          status?: string
          step_key?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          checklist_item_id: string
          competence_statement_id: string
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          ip_address: unknown
          member_id: string
          note: string
          project_id: string
          reviewer_id: string
          statement_sha256: string
          statement_version: number
        }
        Insert: {
          checklist_item_id: string
          competence_statement_id: string
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          ip_address?: unknown
          member_id: string
          note?: string
          project_id: string
          reviewer_id: string
          statement_sha256: string
          statement_version: number
        }
        Update: {
          checklist_item_id?: string
          competence_statement_id?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          ip_address?: unknown
          member_id?: string
          note?: string
          project_id?: string
          reviewer_id?: string
          statement_sha256?: string
          statement_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_competence_statement_id_fkey"
            columns: ["competence_statement_id"]
            isOneToOne: false
            referencedRelation: "competence_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      accept_invitation: { Args: { p_member_id: string }; Returns: string }
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
      appointment_item_code: {
        Args: { p_kind: Database["public"]["Enums"]["appointment_kind"] }
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
      chase_state: { Args: never; Returns: Json }
      check_invite: { Args: { p_token: string }; Returns: string }
      checklist_wanted: {
        Args: { p_project_id: string }
        Returns: {
          member_id: string
          template_code: string
          template_id: string
        }[]
      }
      claim_reminders: {
        Args: { p_reminders: Json }
        Returns: {
          body_text: string | null
          cc_emails: string[]
          created_at: string
          detail: string | null
          id: string
          item_ids: string[]
          kind: string
          member_id: string
          project_day: string
          project_id: string
          recipient_email: string
          sent_at: string | null
          simulated: boolean
          status: string
          step_key: string
          subject: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "reminders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_form_item: { Args: { p_item_id: string }; Returns: undefined }
      complete_upload_item: { Args: { p_item_id: string }; Returns: undefined }
      create_demo_project: { Args: never; Returns: string }
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
      decline_invitation: { Args: { p_member_id: string }; Returns: undefined }
      demo_step: {
        Args: {
          p_changes: Json
          p_expected_day: number
          p_project_id: string
          p_reminders: Json
          p_state: Json
        }
        Returns: number
      }
      finish_export: {
        Args: {
          p_error: string
          p_export_id: string
          p_file_count: number
          p_file_name: string
          p_path: string
          p_sha256: string
          p_size: number
          p_status: string
          p_warnings: number
        }
        Returns: undefined
      }
      finish_manual_chase: {
        Args: { p_detail: string; p_reminder_id: string; p_sent: boolean }
        Returns: undefined
      }
      finish_reminders: {
        Args: { p_detail: string; p_ids: string[]; p_status: string }
        Returns: undefined
      }
      generate_checklist: { Args: { p_project_id: string }; Returns: undefined }
      generate_recovery_codes: { Args: never; Returns: string[] }
      invite_project_member: {
        Args: { p_member_id: string }
        Returns: {
          email: string
          existing_account: boolean
          owner_company: string
          owner_name: string
          project_id: string
          project_name: string
          token: string
        }[]
      }
      is_aal2: { Args: never; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      is_project_reviewer: { Args: { p_project_id: string }; Returns: boolean }
      my_invitations: {
        Args: never
        Returns: {
          invited_at: string
          member_id: string
          owner_company: string
          owner_name: string
          project_address: string
          project_id: string
          project_name: string
          role: Database["public"]["Enums"]["dutyholder_role"]
        }[]
      }
      my_partners: {
        Args: never
        Returns: {
          accepted_at: string
          my_roles: string[]
          owner_company: string
          owner_email: string
          owner_name: string
          project_id: string
          project_name: string
        }[]
      }
      normalise_name: { Args: { p_name: string }; Returns: string }
      normalise_recovery_code: { Args: { p_code: string }; Returns: string }
      owns_project_using_statement: {
        Args: { p_statement_id: string }
        Returns: boolean
      }
      prepare_appointment: {
        Args: {
          p_appointee_member_id: string
          p_kind: Database["public"]["Enums"]["appointment_kind"]
          p_letter_text: string
          p_letter_title: string
          p_project_id: string
          p_template_version: string
        }
        Returns: string
      }
      project_now: { Args: { p_project_id: string }; Returns: string }
      record_email: {
        Args: {
          p_detail: string
          p_kind: string
          p_member_id: string
          p_project_id: string
          p_sent: boolean
        }
        Returns: undefined
      }
      record_export_download: {
        Args: { p_export_id: string }
        Returns: undefined
      }
      record_invite_email: {
        Args: { p_detail: string; p_member_id: string; p_sent: boolean }
        Returns: undefined
      }
      record_manual_chase: { Args: { p_member_id: string }; Returns: string }
      record_mfa_enrolled: { Args: never; Returns: undefined }
      recovery_codes_remaining: { Args: never; Returns: number }
      refresh_review_items: {
        Args: { p_project_id: string }
        Returns: undefined
      }
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
      report_competence_change: {
        Args: { p_note: string; p_project_id: string }
        Returns: string
      }
      request_export: { Args: { p_project_id: string }; Returns: string }
      request_ip: { Args: never; Returns: unknown }
      review_competence: {
        Args: {
          p_decision: Database["public"]["Enums"]["review_decision"]
          p_item_id: string
          p_note: string
        }
        Returns: string
      }
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
      sign_appointment: {
        Args: {
          p_appointment_id: string
          p_party: string
          p_typed_name: string
          p_user_agent?: string
        }
        Returns: string
      }
      start_competence_draft: { Args: never; Returns: string }
      submit_competence: { Args: { p_item_id: string }; Returns: string }
      submit_competence_passport: { Args: never; Returns: string }
      use_recovery_code: { Args: { p_code: string }; Returns: boolean }
      void_appointment: {
        Args: { p_appointment_id: string; p_reason: string }
        Returns: undefined
      }
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
      appointment_kind:
        | "pd_appointment"
        | "pc_appointment"
        | "lead_designer_agreement"
        | "cdm_certification"
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
      review_decision: "satisfied" | "needs_info"
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
      appointment_kind: [
        "pd_appointment",
        "pc_appointment",
        "lead_designer_agreement",
        "cdm_certification",
      ],
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
      review_decision: ["satisfied", "needs_info"],
    },
  },
} as const
