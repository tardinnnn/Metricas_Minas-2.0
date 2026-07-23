import { supabase } from "@/integrations/supabase/client";

export type Categoria = {
  id: string;
  nome: string;
  descricao: string | null;
};

export type Fornecedor = {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
};

export type Equipamento = {
  id: string;
  nome: string;
  modelo: string | null;
  categoria_id: string | null;
  fornecedor_id: string | null;
  horas_trabalhadas: number;
  status: string;
  data_aquisicao: string | null;
  id_peca: string | null;
  data_instalacao: string | null;
  horimetro_inicial: number | null;
  horas_mes: number | null;
  vida_util_horas: number | null;
  desgaste_atual: number | null;
  nota_fiscal_url: string | null;
  localizacao: string | null;
  categorias?: { nome: string } | null;
  fornecedores?: { nome: string } | null;
};

export type RegistroHoras = {
  id: string;
  equipamento_id: string;
  horas: number;
  data_registro: string;
  observacoes: string | null;
  equipamentos?: { nome: string } | null;
};

export type Peca = {
  id: string;
  codigo: string | null;
  nome: string;
  fornecedor_id: string | null;
  saldo: number;
  estoque_minimo: number;
  vida_util_horas: number | null;
  fornecedores?: { nome: string } | null;
};

export type Movimentacao = {
  id: string;
  peca_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  equipamento_id: string | null;
  nota_fiscal_id: string | null;
  data_movimentacao: string;
  observacoes: string | null;
  pecas?: { nome: string; codigo: string | null } | null;
  equipamentos?: { nome: string } | null;
  notas_fiscais?: { numero: string | null; fornecedor_nome: string | null } | null;
};

export type NotaFiscal = {
  id: string;
  numero: string | null;
  serie: string | null;
  chave: string | null;
  fornecedor_nome: string | null;
  fornecedor_cnpj: string | null;
  data_emissao: string | null;
  valor_total: number;
  xml_url: string | null;
  arquivo_url: string | null;
  created_at: string;
};

export type HistoricoTroca = {
  id: string;
  equipamento_id: string;
  peca_id: string | null;
  data_troca: string;
  fornecedor_nome: string | null;
  horas_no_momento: number | null;
  observacoes: string | null;
  pecas?: { nome: string } | null;
};

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from("categorias").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function fetchFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function fetchEquipamentos(): Promise<Equipamento[]> {
  const { data, error } = await supabase
    .from("equipamentos")
    .select("*, categorias(nome), fornecedores(nome)")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Equipamento[];
}

export async function fetchRegistros(): Promise<RegistroHoras[]> {
  const { data, error } = await supabase
    .from("registros_horas")
    .select("*, equipamentos(nome)")
    .order("data_registro", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as RegistroHoras[];
}

export async function fetchPecas(): Promise<Peca[]> {
  const { data, error } = await supabase
    .from("pecas")
    .select("*, fornecedores(nome)")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Peca[];
}

export async function fetchMovimentacoes(): Promise<Movimentacao[]> {
  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .select("*, pecas(nome, codigo), equipamentos(nome), notas_fiscais(numero, fornecedor_nome)")
    .order("data_movimentacao", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as Movimentacao[];
}

export async function fetchNotasFiscais(): Promise<NotaFiscal[]> {
  const { data, error } = await supabase
    .from("notas_fiscais")
    .select("*")
    .order("data_emissao", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as NotaFiscal[];
}

export async function fetchHistoricoTrocas(equipamentoId: string): Promise<HistoricoTroca[]> {
  const { data, error } = await supabase
    .from("historico_trocas")
    .select("*, pecas(nome)")
    .eq("equipamento_id", equipamentoId)
    .order("data_troca", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HistoricoTroca[];
}

export const STATUS_OPTIONS = ["operacional", "manutencao", "parada"] as const;
export type StatusEquipamento = (typeof STATUS_OPTIONS)[number];

export const STATUS_LABEL: Record<string, string> = {
  operacional: "Operacional",
  manutencao: "Em Manutenção",
  parada: "Parada",
};