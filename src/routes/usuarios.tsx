import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — MétricaMinas" },
      { name: "description", content: "Gestão de usuários e papéis do sistema (admin, supervisor, operador)." },
    ],
  }),
  component: UsuariosPage,
});

type Row = {
  id: string;
  nome: string;
  cpf: string;
  setor: string;
  funcao: string;
  role: "admin" | "supervisor" | "operador";
};

async function fetchUsuarios(): Promise<Row[]> {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const map = new Map<string, "admin" | "supervisor" | "operador">();
  (roles ?? []).forEach((r: { user_id: string; role: string }) => {
    const cur = map.get(r.user_id);
    // priority admin > supervisor > operador
    const rank = { admin: 3, supervisor: 2, operador: 1 } as const;
    if (!cur || rank[r.role as keyof typeof rank] > rank[cur]) {
      map.set(r.user_id, r.role as "admin" | "supervisor" | "operador");
    }
  });
  return (profiles ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    cpf: p.cpf,
    setor: p.setor,
    funcao: p.funcao,
    role: map.get(p.id) ?? "operador",
  }));
}

function UsuariosPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["usuarios"], queryFn: fetchUsuarios, enabled: isAdmin });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "supervisor" | "operador" }) => {
      // remove existing then insert
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2" />
            Apenas administradores podem acessar esta página.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Usuários & Permissões</h1>
        <p className="text-sm text-muted-foreground">
          Admin e Supervisor podem cadastrar/editar dados. Operador apenas visualiza.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Todos os usuários ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Permissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{u.cpf}</TableCell>
                  <TableCell>{u.setor}</TableCell>
                  <TableCell>{u.funcao}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{u.role}</Badge>
                      <Select
                        value={u.role}
                        onValueChange={(v) => updateRole.mutate({ userId: u.id, role: v as Row["role"] })}
                      >
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="operador">Operador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}