import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mountain, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso — MétricaMinas" },
      { name: "description", content: "Faça login ou cadastre-se para acessar o sistema de controle da pedreira." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("signup");
  const [busy, setBusy] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // signup
  const [form, setForm] = useState({ nome: "", cpf: "", setor: "", funcao: "", email: "", senha: "" });

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.cpf || !form.setor || !form.funcao || !form.email || form.senha.length < 6) {
      return toast.error("Preencha todos os campos (senha ≥ 6 caracteres).");
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: form.nome, cpf: form.cpf, setor: form.setor, funcao: form.funcao },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro concluído — entrando...");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Mountain className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">MétricaMinas</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Controle Operacional</div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Acesso ao sistema</CardTitle>
            <CardDescription>Cadastre-se ou entre com sua conta corporativa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                <TabsTrigger value="login">Entrar</TabsTrigger>
              </TabsList>
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                    <div><Label>CPF *</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
                    <div><Label>Setor *</Label><Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Manutenção" /></div>
                    <div><Label>Função *</Label><Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Operador" /></div>
                  </div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Senha *</Label><Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar conta
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    O primeiro usuário cadastrado assume o papel de administrador.
                  </p>
                </form>
              </TabsContent>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3 pt-4">
                  <div><Label>Email</Label><Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></div>
                  <div><Label>Senha</Label><Input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}