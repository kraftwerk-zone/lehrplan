/**
 * Supabase schema types.
 *
 * Regenerate after schema changes:
 *   npx supabase gen types typescript --project-id zsekgyxjtquobqxlzoez > lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          subject_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey",
            columns: ["subject_id"],
            isOneToOne: false,
            referencedRelation: "subjects",
            referencedColumns: ["id"],
          },
        ]
      }
      sub_topics: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          name: string
          duration_in_days: number
          buffer_in_days: number
          differentiation_support: string
          differentiation_challenge: string
          points: Json
          reference_items: Json
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          topic_id: string
          name: string
          duration_in_days?: number
          buffer_in_days?: number
          differentiation_support?: string
          differentiation_challenge?: string
          points?: Json
          reference_items?: Json
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          name?: string
          duration_in_days?: number
          buffer_in_days?: number
          differentiation_support?: string
          differentiation_challenge?: string
          points?: Json
          reference_items?: Json
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_topics_topic_id_fkey",
            columns: ["topic_id"],
            isOneToOne: false,
            referencedRelation: "topics",
            referencedColumns: ["id"],
          },
        ]
      }
      materials: {
        Row: {
          id: string
          user_id: string
          sub_topic_id: string
          name: string
          folder: string | null
          storage_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          sub_topic_id: string
          name: string
          folder?: string | null
          storage_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sub_topic_id?: string
          name?: string
          folder?: string | null
          storage_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_sub_topic_id_fkey",
            columns: ["sub_topic_id"],
            isOneToOne: false,
            referencedRelation: "sub_topics",
            referencedColumns: ["id"],
          },
        ]
      }
      scheduled_blocks: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          subject_id: string
          start_date: string
          end_date: string
          understanding_level: number
          completed_sub_topics: number
          differentiation_support: string
          differentiation_challenge: string
          topic_snapshot: Json
          materials: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          topic_id: string
          subject_id: string
          start_date: string
          end_date: string
          understanding_level?: number
          completed_sub_topics?: number
          differentiation_support?: string
          differentiation_challenge?: string
          topic_snapshot: Json
          materials?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          subject_id?: string
          start_date?: string
          end_date?: string
          understanding_level?: number
          completed_sub_topics?: number
          differentiation_support?: string
          differentiation_challenge?: string
          topic_snapshot?: Json
          materials?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      seed_curriculum_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      repair_my_curriculum: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
