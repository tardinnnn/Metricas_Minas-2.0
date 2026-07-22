
-- 1. ROLES ENUM & TABLES
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'operador');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  setor TEXT NOT NULL,
  funcao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'supervisor') $$;

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile placeholder + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM auth.users WHERE id <> NEW.id) INTO is_first;
  INSERT INTO public.profiles (id, nome, cpf, setor, funcao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'cpf', NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'setor', ''),
    COALESCE(NEW.raw_user_meta_data->>'funcao', '')
  ) ON CONFLICT (id) DO NOTHING;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. EQUIPAMENTOS: add fields
ALTER TABLE public.equipamentos
  ADD COLUMN id_peca TEXT,
  ADD COLUMN data_instalacao DATE,
  ADD COLUMN horimetro_inicial NUMERIC DEFAULT 0,
  ADD COLUMN horas_mes NUMERIC DEFAULT 0,
  ADD COLUMN vida_util_horas NUMERIC DEFAULT 0,
  ADD COLUMN desgaste_atual NUMERIC DEFAULT 0,
  ADD COLUMN nota_fiscal_url TEXT,
  ADD COLUMN localizacao TEXT;

-- 3. Tighten RLS on existing tables (edit-only for admin/supervisor)
DROP POLICY IF EXISTS "public read categorias" ON public.categorias;
DROP POLICY IF EXISTS "public write categorias" ON public.categorias;
DROP POLICY IF EXISTS "public read equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "public write equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "public read fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "public write fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "public read registros" ON public.registros_horas;
DROP POLICY IF EXISTS "public write registros" ON public.registros_horas;

REVOKE ALL ON public.categorias, public.equipamentos, public.fornecedores, public.registros_horas FROM anon;

CREATE POLICY "read cat" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit cat" ON public.categorias FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "read eq" ON public.equipamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit eq" ON public.equipamentos FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "read fo" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit fo" ON public.fornecedores FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "read rh" ON public.registros_horas FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit rh" ON public.registros_horas FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- 4. NOTAS FISCAIS
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT,
  serie TEXT,
  chave TEXT UNIQUE,
  fornecedor_nome TEXT,
  fornecedor_cnpj TEXT,
  data_emissao DATE,
  valor_total NUMERIC DEFAULT 0,
  xml_url TEXT,
  arquivo_url TEXT,
  raw_xml TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fiscais TO authenticated;
GRANT ALL ON public.notas_fiscais TO service_role;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read nf" ON public.notas_fiscais FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit nf" ON public.notas_fiscais FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- 5. PECAS (estoque)
CREATE TABLE public.pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  nome TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  saldo NUMERIC NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC NOT NULL DEFAULT 0,
  vida_util_horas NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pecas TO authenticated;
GRANT ALL ON public.pecas TO service_role;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read pc" ON public.pecas FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit pc" ON public.pecas FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- 6. MOVIMENTACOES DE ESTOQUE
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id UUID NOT NULL REFERENCES public.pecas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade NUMERIC NOT NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id),
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id),
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read mv" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit mv" ON public.movimentacoes_estoque FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

-- Trigger: atualiza saldo da peça
CREATE OR REPLACE FUNCTION public.atualizar_saldo_peca()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.pecas SET saldo = saldo + NEW.quantidade WHERE id = NEW.peca_id;
  ELSE
    UPDATE public.pecas SET saldo = saldo - NEW.quantidade WHERE id = NEW.peca_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_atualizar_saldo AFTER INSERT ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_saldo_peca();

-- 7. HISTORICO DE TROCAS
CREATE TABLE public.historico_trocas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  peca_id UUID REFERENCES public.pecas(id),
  data_troca DATE NOT NULL DEFAULT CURRENT_DATE,
  fornecedor_nome TEXT,
  horas_no_momento NUMERIC,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_trocas TO authenticated;
GRANT ALL ON public.historico_trocas TO service_role;
ALTER TABLE public.historico_trocas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ht" ON public.historico_trocas FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit ht" ON public.historico_trocas FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
