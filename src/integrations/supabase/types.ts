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
      activos: {
        Row: {
          clasificacion: number | null
          costo: number | null
          descripcion: string | null
          estatus: number | null
          f_alta: string | null
          f_factura: string | null
          folio_factura: string | null
          id_consecutivo: number
          id_cta_contable: number | null
          marca: string | null
          modelo: string | null
          numero_inventario: string | null
          numero_serie: string | null
          observaciones: string | null
          tipo: number | null
          ultimo_nomina: string | null
        }
        Insert: {
          clasificacion?: number | null
          costo?: number | null
          descripcion?: string | null
          estatus?: number | null
          f_alta?: string | null
          f_factura?: string | null
          folio_factura?: string | null
          id_consecutivo?: never
          id_cta_contable?: number | null
          marca?: string | null
          modelo?: string | null
          numero_inventario?: string | null
          numero_serie?: string | null
          observaciones?: string | null
          tipo?: number | null
          ultimo_nomina?: string | null
        }
        Update: {
          clasificacion?: number | null
          costo?: number | null
          descripcion?: string | null
          estatus?: number | null
          f_alta?: string | null
          f_factura?: string | null
          folio_factura?: string | null
          id_consecutivo?: never
          id_cta_contable?: number | null
          marca?: string | null
          modelo?: string | null
          numero_inventario?: string | null
          numero_serie?: string | null
          observaciones?: string | null
          tipo?: number | null
          ultimo_nomina?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_activos_clasificacion"
            columns: ["clasificacion"]
            isOneToOne: false
            referencedRelation: "clasificacion"
            referencedColumns: ["id_clasificacion"]
          },
          {
            foreignKeyName: "fk_activos_cta_contable"
            columns: ["id_cta_contable"]
            isOneToOne: false
            referencedRelation: "ctas_contables"
            referencedColumns: ["id_ctacontable"]
          },
        ]
      }
      activos_stg: {
        Row: {
          clasificacion: string | null
          costo: string | null
          descripcion: string | null
          estatus: string | null
          f_alta: string | null
          f_factura: string | null
          folio_factura: string | null
          id_consecutivo: string | null
          id_cta_contable: string | null
          marca: string | null
          modelo: string | null
          numero_inventario: string | null
          numero_serie: string | null
          observaciones: string | null
          tipo: string | null
          ultimo_nomina: string | null
        }
        Insert: {
          clasificacion?: string | null
          costo?: string | null
          descripcion?: string | null
          estatus?: string | null
          f_alta?: string | null
          f_factura?: string | null
          folio_factura?: string | null
          id_consecutivo?: string | null
          id_cta_contable?: string | null
          marca?: string | null
          modelo?: string | null
          numero_inventario?: string | null
          numero_serie?: string | null
          observaciones?: string | null
          tipo?: string | null
          ultimo_nomina?: string | null
        }
        Update: {
          clasificacion?: string | null
          costo?: string | null
          descripcion?: string | null
          estatus?: string | null
          f_alta?: string | null
          f_factura?: string | null
          folio_factura?: string | null
          id_consecutivo?: string | null
          id_cta_contable?: string | null
          marca?: string | null
          modelo?: string | null
          numero_inventario?: string | null
          numero_serie?: string | null
          observaciones?: string | null
          tipo?: string | null
          ultimo_nomina?: string | null
        }
        Relationships: []
      }
      bienes_inmuebles: {
        Row: {
          clave_catastral: string | null
          codigo_postal: string | null
          colonia: string | null
          costo_adquisicion: number | null
          descripcion: string | null
          direccion: string
          escritura_url: string | null
          estado: string | null
          estatus: number | null
          fecha_adquisicion: string | null
          fecha_escritura: string | null
          fecha_modificacion: string | null
          fecha_registro: string | null
          folio_registro: string | null
          id: number
          id_cta_contable: number | null
          id_tipo_inmueble: number | null
          latitud: number | null
          longitud: number | null
          municipio: string | null
          niveles: number | null
          nombre: string | null
          notaria: string | null
          numero_escritura: string | null
          numero_inventario: string
          observaciones: string | null
          responsable_nomina: string | null
          superficie_construccion: number | null
          superficie_terreno: number | null
          uso_actual: string | null
          valor_catastral: number | null
          valor_comercial: number | null
          volumen_libro: string | null
        }
        Insert: {
          clave_catastral?: string | null
          codigo_postal?: string | null
          colonia?: string | null
          costo_adquisicion?: number | null
          descripcion?: string | null
          direccion: string
          escritura_url?: string | null
          estado?: string | null
          estatus?: number | null
          fecha_adquisicion?: string | null
          fecha_escritura?: string | null
          fecha_modificacion?: string | null
          fecha_registro?: string | null
          folio_registro?: string | null
          id?: number
          id_cta_contable?: number | null
          id_tipo_inmueble?: number | null
          latitud?: number | null
          longitud?: number | null
          municipio?: string | null
          niveles?: number | null
          nombre?: string | null
          notaria?: string | null
          numero_escritura?: string | null
          numero_inventario: string
          observaciones?: string | null
          responsable_nomina?: string | null
          superficie_construccion?: number | null
          superficie_terreno?: number | null
          uso_actual?: string | null
          valor_catastral?: number | null
          valor_comercial?: number | null
          volumen_libro?: string | null
        }
        Update: {
          clave_catastral?: string | null
          codigo_postal?: string | null
          colonia?: string | null
          costo_adquisicion?: number | null
          descripcion?: string | null
          direccion?: string
          escritura_url?: string | null
          estado?: string | null
          estatus?: number | null
          fecha_adquisicion?: string | null
          fecha_escritura?: string | null
          fecha_modificacion?: string | null
          fecha_registro?: string | null
          folio_registro?: string | null
          id?: number
          id_cta_contable?: number | null
          id_tipo_inmueble?: number | null
          latitud?: number | null
          longitud?: number | null
          municipio?: string | null
          niveles?: number | null
          nombre?: string | null
          notaria?: string | null
          numero_escritura?: string | null
          numero_inventario?: string
          observaciones?: string | null
          responsable_nomina?: string | null
          superficie_construccion?: number | null
          superficie_terreno?: number | null
          uso_actual?: string | null
          valor_catastral?: number | null
          valor_comercial?: number | null
          volumen_libro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bienes_inmuebles_id_cta_contable_fkey"
            columns: ["id_cta_contable"]
            isOneToOne: false
            referencedRelation: "ctas_contables"
            referencedColumns: ["id_ctacontable"]
          },
          {
            foreignKeyName: "bienes_inmuebles_id_tipo_inmueble_fkey"
            columns: ["id_tipo_inmueble"]
            isOneToOne: false
            referencedRelation: "tipos_inmueble"
            referencedColumns: ["id"]
          },
        ]
      }
      clasificacion: {
        Row: {
          clasificacion: string | null
          estatus: number
          id_clasificacion: number
        }
        Insert: {
          clasificacion?: string | null
          estatus?: number
          id_clasificacion?: never
        }
        Update: {
          clasificacion?: string | null
          estatus?: number
          id_clasificacion?: never
        }
        Relationships: []
      }
      consignas: {
        Row: {
          consigna: string | null
          estatus: number
          id_consigna: number
        }
        Insert: {
          consigna?: string | null
          estatus?: number
          id_consigna: number
        }
        Update: {
          consigna?: string | null
          estatus?: number
          id_consigna?: number
        }
        Relationships: []
      }
      ctas_contables: {
        Row: {
          cta_contable: string | null
          descripcion: string | null
          estatus: number
          id_clasificacion_cta: number | null
          id_ctacontable: number
        }
        Insert: {
          cta_contable?: string | null
          descripcion?: string | null
          estatus?: number
          id_clasificacion_cta?: number | null
          id_ctacontable: number
        }
        Update: {
          cta_contable?: string | null
          descripcion?: string | null
          estatus?: number
          id_clasificacion_cta?: number | null
          id_ctacontable?: number
        }
        Relationships: []
      }
      resguardos: {
        Row: {
          estatus: boolean | null
          fecha: string | null
          folio: string | null
          id_resguardo: number
          id_usuario: number | null
          nomina: string | null
          numero_inventario: string
        }
        Insert: {
          estatus?: boolean | null
          fecha?: string | null
          folio?: string | null
          id_resguardo?: never
          id_usuario?: number | null
          nomina?: string | null
          numero_inventario: string
        }
        Update: {
          estatus?: boolean | null
          fecha?: string | null
          folio?: string | null
          id_resguardo?: never
          id_usuario?: number | null
          nomina?: string | null
          numero_inventario?: string
        }
        Relationships: []
      }
      revision_sesiones: {
        Row: {
          created_at: string
          estatus: string
          expected: Json
          id: string
          id_usuario: number
          mode: string
          notes: string | null
          responsable_id: string | null
          responsable_nombre: string | null
          responsable_tipo: string | null
          scans: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          estatus?: string
          expected?: Json
          id?: string
          id_usuario: number
          mode?: string
          notes?: string | null
          responsable_id?: string | null
          responsable_nombre?: string | null
          responsable_tipo?: string | null
          scans?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          estatus?: string
          expected?: Json
          id?: string
          id_usuario?: number
          mode?: string
          notes?: string | null
          responsable_id?: string | null
          responsable_nombre?: string | null
          responsable_tipo?: string | null
          scans?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tipos_inmueble: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          id_usuario: number
          nombre: string | null
          password: string | null
          password_hash: string | null
          permisos: number | null
          usuario: string | null
        }
        Insert: {
          id_usuario?: number
          nombre?: string | null
          password?: string | null
          password_hash?: string | null
          permisos?: number | null
          usuario?: string | null
        }
        Update: {
          id_usuario?: number
          nombre?: string | null
          password?: string | null
          password_hash?: string | null
          permisos?: number | null
          usuario?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
