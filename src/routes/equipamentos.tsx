import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategorias, fetchEquipamentos, fetchFornecedores, STATUS_LABEL, STATUS_OPTIONS } from "@/lib/metrica-api";

export const Route = createFileRoute("/equipamentos")({
  validateSearch: (s: Record<string, unknown>) => ({
    highlight: typeof s.highlight === "string" ? s.highlight : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Equipamentos — MétricaMinas" },
      { name: "description", content: "Cadastro e consulta de maquinário da pedreira: britadores, peneiras, transportadores e perfuratrizes." },
    ],
  }),
  component: EquipamentosPage,
});

function statusBadge(status: string) {
  const color: Record<string, string> = {
    operacional: "bg-[color:var(--status-operacional)]/20 text-[color:var(--status-operacional)] border-[color:var(--status-operacional)]/40",
    manutencao: "bg-[color:var(--status-manutencao)]/20 text-[color:var(--status-manutencao)] border-[color:var(--status-manutencao)]/40",
    parada: "bg-[color:var(--status-parada)]/20 text-[color:var(--status-parada)] border-[color:var(--status-parada)]/40",
  };
  return <Badge variant="outline" className={color[status] ?? ""}>{STATUS_LABEL[status] ?? status}</Badge>;
}

function EquipamentosPage() {
  const qc = useQueryClient();
  const { highlight } = Route.useSearch();
  const { data: equipamentos = [] } = useQuery({ queryKey: ["equipamentos"], queryFn: fetchEquipamentos });
  const { data: categorias = [] } = useQuery({ queryKey: ["categorias"], queryFn: fetchCategorias });
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: fetchFornecedores });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", modelo: "", categoria_id: "", fornecedor_id: "", status: "operacional", data_aquisicao: "" });
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (highlight && rowRefs.current[highlight]) {
      rowRefs.current[highlight]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight, equipamentos]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipamentos").insert({
        nome: form.nome,
        modelo: form.modelo || null,
        categoria_id: form.categoria_id || null,
        fornecedor_id: form.fornecedor_id || null,
        status: form.status,
        data_aquisicao: form.data_aquisicao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento cadastrado");
      setOpen(false);
      setForm({ nome: "", modelo: "", categoria_id: "", fornecedor_id: "", status: "operacional", data_aquisicao: "" });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipamento removido");
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Frota de maquinário da pedreira.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Equipamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Equipamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data de Aquisição</Label><Input type="date" value={form.data_aquisicao} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!form.nome || create.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Frota ({equipamentos.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipamentos.map((e) => (
                <TableRow
                  key={e.id}
                  ref={(el) => { rowRefs.current[e.id] = el; }}
                  className={highlight === e.id ? "bg-primary/10 outline outline-1 outline-primary/40" : ""}
                >
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{e.modelo ?? "—"}</TableCell>
                  <TableCell>{e.categorias?.nome ?? "—"}</TableCell>
                  <TableCell>{e.fornecedores?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(e.horas_trabalhadas).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}