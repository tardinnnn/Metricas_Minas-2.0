import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchEquipamentos, fetchRegistros } from "@/lib/metrica-api";

export const Route = createFileRoute("/registros")({
  head: () => ({
    meta: [
      { title: "Registros de Horas — MétricaMinas" },
      { name: "description", content: "Histórico de horas trabalhadas por equipamento para cálculo de vida útil." },
    ],
  }),
  component: RegistrosPage,
});

function RegistrosPage() {
  const qc = useQueryClient();
  const { data: registros = [] } = useQuery({ queryKey: ["registros"], queryFn: fetchRegistros });
  const { data: equipamentos = [] } = useQuery({ queryKey: ["equipamentos"], queryFn: fetchEquipamentos });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ equipamento_id: "", horas: "", data_registro: new Date().toISOString().slice(0, 10), observacoes: "" });

  const create = useMutation({
    mutationFn: async () => {
      const horas = Number(form.horas);
      if (!form.equipamento_id || !horas) throw new Error("Selecione equipamento e informe horas");
      const { error } = await supabase.from("registros_horas").insert({
        equipamento_id: form.equipamento_id,
        horas,
        data_registro: form.data_registro,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro adicionado");
      setOpen(false);
      setForm({ equipamento_id: "", horas: "", data_registro: new Date().toISOString().slice(0, 10), observacoes: "" });
      qc.invalidateQueries({ queryKey: ["registros"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registros de Horas</h1>
          <p className="text-sm text-muted-foreground">Histórico operacional — atualiza automaticamente as horas do equipamento.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Registro</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Registro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Equipamento *</Label>
                <Select value={form.equipamento_id} onValueChange={(v) => setForm({ ...form, equipamento_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Horas *</Label><Input type="number" step="0.1" value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} /></div>
              <div><Label>Data</Label><Input type="date" value={form.data_registro} onChange={(e) => setForm({ ...form, data_registro: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico ({registros.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Equipamento</TableHead><TableHead className="text-right">Horas</TableHead><TableHead>Observações</TableHead></TableRow></TableHeader>
            <TableBody>
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{new Date(r.data_registro).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{r.equipamentos?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.horas)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.observacoes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}