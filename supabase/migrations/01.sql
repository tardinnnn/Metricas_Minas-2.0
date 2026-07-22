
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  modelo TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  horas_trabalhadas NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'operacional',
  data_aquisicao DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.registros_horas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  horas NUMERIC NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_horas TO anon, authenticated;
GRANT ALL ON public.categorias, public.fornecedores, public.equipamentos, public.registros_horas TO service_role;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_horas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read categorias" ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write categorias" ON public.categorias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public read fornecedores" ON public.fornecedores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write fornecedores" ON public.fornecedores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public read equipamentos" ON public.equipamentos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write equipamentos" ON public.equipamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public read registros" ON public.registros_horas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public write registros" ON public.registros_horas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Update equipamento horas when a registro is inserted
CREATE OR REPLACE FUNCTION public.atualizar_horas_equipamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.equipamentos
  SET horas_trabalhadas = horas_trabalhadas + NEW.horas
  WHERE id = NEW.equipamento_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_atualizar_horas
AFTER INSERT ON public.registros_horas
FOR EACH ROW EXECUTE FUNCTION public.atualizar_horas_equipamento();

-- Seed data
INSERT INTO public.categorias (nome, descricao) VALUES
  ('Britagem', 'Equipamentos de britagem primária e secundária'),
  ('Peneiramento', 'Peneiras vibratórias e classificadores'),
  ('Transporte', 'Correias transportadoras e caminhões'),
  ('Perfuração', 'Perfuratrizes e equipamentos de sondagem');

INSERT INTO public.fornecedores (nome, cnpj, contato, telefone, email) VALUES
  ('Metso Outotec', '12.345.678/0001-90', 'Carlos Silva', '(31) 3333-1000', 'contato@metso.com'),
  ('Sandvik Mining', '98.765.432/0001-10', 'Ana Souza', '(31) 3222-4500', 'vendas@sandvik.com'),
  ('Britec Peças', '55.444.333/0001-22', 'João Pereira', '(31) 3777-8888', 'suporte@britec.com.br');

INSERT INTO public.equipamentos (nome, modelo, categoria_id, fornecedor_id, horas_trabalhadas, status, data_aquisicao)
SELECT 'Britador de Mandíbulas 01', 'C120', c.id, f.id, 4820, 'operacional', '2022-03-15'
FROM public.categorias c, public.fornecedores f WHERE c.nome='Britagem' AND f.nome='Metso Outotec';

INSERT INTO public.equipamentos (nome, modelo, categoria_id, fornecedor_id, horas_trabalhadas, status, data_aquisicao)
SELECT 'Britador Cônico 02', 'CH660', c.id, f.id, 3210, 'operacional', '2023-01-20'
FROM public.categorias c, public.fornecedores f WHERE c.nome='Britagem' AND f.nome='Sandvik Mining';

INSERT INTO public.equipamentos (nome, modelo, categoria_id, fornecedor_id, horas_trabalhadas, status, data_aquisicao)
SELECT 'Peneira Vibratória 01', 'PV-3D', c.id, f.id, 5600, 'manutencao', '2021-08-10'
FROM public.categorias c, public.fornecedores f WHERE c.nome='Peneiramento' AND f.nome='Metso Outotec';

INSERT INTO public.equipamentos (nome, modelo, categoria_id, fornecedor_id, horas_trabalhadas, status, data_aquisicao)
SELECT 'Correia Transportadora TC-05', 'TC-1200', c.id, f.id, 2100, 'operacional', '2023-06-01'
FROM public.categorias c, public.fornecedores f WHERE c.nome='Transporte' AND f.nome='Britec Peças';

INSERT INTO public.equipamentos (nome, modelo, categoria_id, fornecedor_id, horas_trabalhadas, status, data_aquisicao)
SELECT 'Perfuratriz DP-01', 'DP1500i', c.id, f.id, 1850, 'parada', '2023-11-05'
FROM public.categorias c, public.fornecedores f WHERE c.nome='Perfuração' AND f.nome='Sandvik Mining';
