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
        Row: { id: string; event_id: string; guest_id: string; mock_image_url: string | null; cloudinary_public_id: string | null; client_upload_id: string | null; width: number | null; height: number | null; caption: string | null; original_filename: string | null; format: string | null; bytes: number | null; status: "processing" | "published" | "hidden"; created_at: string };
        Insert: { id?: string; event_id: string; guest_id: string; mock_image_url?: string | null; cloudinary_public_id?: string | null; client_upload_id?: string | null; width?: number | null; height?: number | null; caption?: string | null; original_filename?: string | null; format?: string | null; bytes?: number | null; status?: "processing" | "published" | "hidden"; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "photos_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "photos_guest_event_fkey"; columns: ["guest_id", "event_id"]; isOneToOne: false; referencedRelation: "guests"; referencedColumns: ["id", "event_id"] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
