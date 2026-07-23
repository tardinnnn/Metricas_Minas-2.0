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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          categoria_id: string | null
          created_at: string
          data_aquisicao: string | null
          data_instalacao: string | null
          desgaste_atual: number | null
          fornecedor_id: string | null
          horas_mes: number | null
          horas_trabalhadas: number
          horimetro_inicial: number | null
          id: string
          id_peca: string | null
          localizacao: string | null
          modelo: string | null
          nome: string
          nota_fiscal_url: string | null
          status: string
          vida_util_horas: number | null
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          data_aquisicao?: string | null
          data_instalacao?: string | null
          desgaste_atual?: number | null
          fornecedor_id?: string | null
          horas_mes?: number | null
          horas_trabalhadas?: number
          horimetro_inicial?: number | null
          id?: string
          id_peca?: string | null
          localizacao?: string | null
          modelo?: string | null
          nome: string
          nota_fiscal_url?: string | null
          status?: string
          vida_util_horas?: number | null
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          data_aquisicao?: string | null
          data_instalacao?: string | null
          desgaste_atual?: number | null
          fornecedor_id?: string | null
          horas_mes?: number | null
          horas_trabalhadas?: number
          horimetro_inicial?: number | null
          id?: string
          id_peca?: string | null
          localizacao?: string | null
          modelo?: string | null
          nome?: string
          nota_fiscal_url?: string | null
          status?: string
          vida_util_horas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      historico_trocas: {
        Row: {
          created_at: string
          created_by: string | null
          data_troca: string
          equipamento_id: string
          fornecedor_nome: string | null
          horas_no_momento: number | null
          id: string
          observacoes: string | null
          peca_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_troca?: string
          equipamento_id: string
          fornecedor_nome?: string | null
          horas_no_momento?: number | null
          id?: string
          observacoes?: string | null
          peca_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_troca?: string
          equipamento_id?: string
          fornecedor_nome?: string | null
          horas_no_momento?: number | null
          id?: string
          observacoes?: string | null
          peca_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_trocas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_trocas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          created_by: string | null
          data_movimentacao: string
          equipamento_id: string | null
          id: string
          nota_fiscal_id: string | null
          observacoes: string | null
          peca_id: string
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          equipamento_id?: string | null
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          peca_id: string
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          equipamento_id?: string | null
          id?: string
          nota_fiscal_id?: string | null
          observacoes?: string | null
          peca_id?: string
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          arquivo_url: string | null
          chave: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          fornecedor_cnpj: string | null
          fornecedor_nome: string | null
          id: string
          numero: string | null
          raw_xml: string | null
          serie: string | null
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          arquivo_url?: string | null
          chave?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_nome?: string | null
          id?: string
          numero?: string | null
          raw_xml?: string | null
          serie?: string | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          arquivo_url?: string | null
          chave?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          fornecedor_cnpj?: string | null
          fornecedor_nome?: string | null
          id?: string
          numero?: string | null
          raw_xml?: string | null
          serie?: string | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: []
      }
      pecas: {
        Row: {
          codigo: string | null
          created_at: string
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          nome: string
          saldo: number
          vida_util_horas: number | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome: string
          saldo?: number
          vida_util_horas?: number | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome?: string
          saldo?: number
          vida_util_horas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string
          created_at: string
          funcao: string
          id: string
          nome: string
          setor: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          funcao: string
          id: string
          nome: string
          setor: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          setor?: string
          updated_at?: string
        }
        Relationships: []
      }
      registros_horas: {
        Row: {
          created_at: string
          data_registro: string
          equipamento_id: string
          horas: number
          id: string
          observacoes: string | null
        }
        Insert: {
          created_at?: string
          data_registro?: string
          equipamento_id: string
          horas: number
          id?: string
          observacoes?: string | null
        }
        Update: {
          created_at?: string
          data_registro?: string
          equipamento_id?: string
          horas?: number
          id?: string
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_horas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
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
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "operador"
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
      app_role: ["admin", "supervisor", "operador"],
    },
  },
} as const
