export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: { id: string; slug: string; title: string; event_date: string | null; upload_enabled: boolean; public_gallery_enabled: boolean; created_at: string };
        Insert: { id?: string; slug: string; title: string; event_date?: string | null; upload_enabled?: boolean; public_gallery_enabled?: boolean; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      guests: {
        Row: { id: string; event_id: string; nickname: string; created_at: string };
        Insert: { id?: string; event_id: string; nickname: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["guests"]["Insert"]>;
        Relationships: [{ foreignKeyName: "guests_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] }];
      };
      photos: {
        Row: { id: string; event_id: string; guest_id: string; mock_image_url: string | null; cloudinary_public_id: string | null; client_upload_id: string | null; upload_group_id: string | null; upload_group_created_at: string | null; upload_group_position: number | null; width: number | null; height: number | null; caption: string | null; original_filename: string | null; format: string | null; bytes: number | null; status: "processing" | "published" | "hidden"; created_at: string };
        Insert: { id?: string; event_id: string; guest_id: string; mock_image_url?: string | null; cloudinary_public_id?: string | null; client_upload_id?: string | null; upload_group_id?: string | null; upload_group_created_at?: string | null; upload_group_position?: number | null; width?: number | null; height?: number | null; caption?: string | null; original_filename?: string | null; format?: string | null; bytes?: number | null; status?: "processing" | "published" | "hidden"; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "photos_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "photos_guest_event_fkey"; columns: ["guest_id", "event_id"]; isOneToOne: false; referencedRelation: "guests"; referencedColumns: ["id", "event_id"] },
        ];
      };
      photo_likes: {
        Row: { id: string; photo_id: string; guest_id: string; created_at: string };
        Insert: { id?: string; photo_id: string; guest_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["photo_likes"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "photo_likes_photo_id_fkey"; columns: ["photo_id"]; isOneToOne: false; referencedRelation: "photos"; referencedColumns: ["id"] },
          { foreignKeyName: "photo_likes_guest_id_fkey"; columns: ["guest_id"]; isOneToOne: false; referencedRelation: "guests"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_public_photos_with_likes: {
        Args: { target_event_id: string; target_guest_id?: string | null; target_current_guest_id?: string | null; sort_order?: string; page_limit?: number; cursor_created_at?: string | null; cursor_id?: string | null };
        Returns: Array<{ id: string; post_id: string; post_created_at: string; group_position: number; mock_image_url: string | null; cloudinary_public_id: string | null; width: number | null; height: number | null; caption: string | null; created_at: string; guest_id: string; guest_nickname: string; like_count: number; liked_by_current_guest: boolean }>;
      };
      list_admin_photos_with_likes: {
        Args: { target_event_id: string; status_filter: string; sort_order: string; page_limit: number; cursor_created_at?: string | null; cursor_id?: string | null; cursor_like_count?: number | null };
        Returns: Array<{ id: string; cloudinary_public_id: string | null; mock_image_url: string | null; caption: string | null; created_at: string; status: string; guest_id: string; guest_nickname: string; like_count: number }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
