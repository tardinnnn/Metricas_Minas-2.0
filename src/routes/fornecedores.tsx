import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchFornecedores } from "@/lib/metrica-api";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — MétricaMinas" },
      { name: "description", content: "Fornecedores homologados de equipamentos e peças de reposição." },
    ],
  }),
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const qc = useQueryClient();
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: fetchFornecedores });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", cnpj: "", contato: "", telefone: "", email: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fornecedores").insert({
        nome: form.nome,
        cnpj: form.cnpj || null,
        contato: form.contato || null,
        telefone: form.telefone || null,
        email: form.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fornecedor cadastrado"); setOpen(false); setForm({ nome: "", cnpj: "", contato: "", telefone: "", email: "" }); qc.invalidateQueries({ queryKey: ["fornecedores"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("fornecedores").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["fornecedores"] }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Rastreabilidade para garantia e reposição de peças.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.nome || create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Fornecedores ({fornecedores.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Contato</TableHead><TableHead>Telefone</TableHead><TableHead>E-mail</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {fornecedores.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{f.cnpj ?? "—"}</TableCell>
                  <TableCell>{f.contato ?? "—"}</TableCell>
                  <TableCell>{f.telefone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{f.email ?? "—"}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}