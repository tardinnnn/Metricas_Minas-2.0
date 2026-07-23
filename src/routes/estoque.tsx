import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, ArrowDown, ArrowUp, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchEquipamentos, fetchFornecedores, fetchMovimentacoes, fetchNotasFiscais, fetchPecas } from "@/lib/metrica-api";
import { parseNFeXml } from "@/lib/nfe-parser";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — MétricaMinas" },
      { name: "description", content: "Controle de peças de desgaste, entradas via NFe (XML) e saídas por instalação em equipamentos." },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const { data: pecas = [] } = useQuery({ queryKey: ["pecas"], queryFn: fetchPecas });
  const { data: movs = [] } = useQuery({ queryKey: ["movimentacoes"], queryFn: fetchMovimentacoes });
  const { data: notas = [] } = useQuery({ queryKey: ["notas-fiscais"], queryFn: fetchNotasFiscais });
  const { data: fornecedores = [] } = useQuery({ queryKey: ["fornecedores"], queryFn: fetchFornecedores });
  const { data: equipamentos = [] } = useQuery({ queryKey: ["equipamentos"], queryFn: fetchEquipamentos });

  const [openPeca, setOpenPeca] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [openNfe, setOpenNfe] = useState(false);

  const [pecaForm, setPecaForm] = useState({ nome: "", codigo: "", fornecedor_id: "", estoque_minimo: 0, vida_util_horas: 0 });
  const [movForm, setMovForm] = useState({ peca_id: "", tipo: "saida" as "entrada" | "saida", quantidade: 1, equipamento_id: "", observacoes: "" });

  const criarPeca = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pecas").insert({
        nome: pecaForm.nome,
        codigo: pecaForm.codigo || null,
        fornecedor_id: pecaForm.fornecedor_id || null,
        estoque_minimo: pecaForm.estoque_minimo || 0,
        vida_util_horas: pecaForm.vida_util_horas || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Peça cadastrada");
      setOpenPeca(false);
      setPecaForm({ nome: "", codigo: "", fornecedor_id: "", estoque_minimo: 0, vida_util_horas: 0 });
      qc.invalidateQueries({ queryKey: ["pecas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarMov = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("movimentacoes_estoque").insert({
        peca_id: movForm.peca_id,
        tipo: movForm.tipo,
        quantidade: movForm.quantidade,
        equipamento_id: movForm.equipamento_id || null,
        observacoes: movForm.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada");
      setOpenMov(false);
      setMovForm({ peca_id: "", tipo: "saida", quantidade: 1, equipamento_id: "", observacoes: "" });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["pecas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUploadNfe(file: File) {
    try {
      const text = await file.text();
      const parsed = parseNFeXml(text);
      if (!parsed) {
        toast.error("XML não reconhecido como NFe válida.");
        return;
      }
      // upload XML to storage
      const path = `xml/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("notas-fiscais").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("notas-fiscais").createSignedUrl
        ? await supabase.storage.from("notas-fiscais").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: null };

      const { data: nfeRow, error: nfeErr } = await supabase.from("notas_fiscais").insert({
        numero: parsed.numero,
        serie: parsed.serie,
        chave: parsed.chave,
        fornecedor_nome: parsed.fornecedor_nome,
        fornecedor_cnpj: parsed.fornecedor_cnpj,
        data_emissao: parsed.data_emissao,
        valor_total: parsed.valor_total,
        xml_url: pub?.signedUrl ?? null,
        raw_xml: text,
      }).select().single();
      if (nfeErr) throw nfeErr;

      // For each item, upsert peça (by nome+codigo) and register entrada
      for (const item of parsed.itens) {
        let pecaId: string | null = null;
        if (item.codigo) {
          const { data: existing } = await supabase.from("pecas").select("id").eq("codigo", item.codigo).maybeSingle();
          if (existing) pecaId = existing.id;
        }
        if (!pecaId) {
          const { data: novo, error: eIns } = await supabase.from("pecas").insert({
            nome: item.descricao,
            codigo: item.codigo,
          }).select().single();
          if (eIns) throw eIns;
          pecaId = novo.id;
        }
        await supabase.from("movimentacoes_estoque").insert({
          peca_id: pecaId,
          tipo: "entrada",
          quantidade: item.quantidade,
          nota_fiscal_id: nfeRow.id,
          observacoes: `NF ${parsed.numero ?? "-"} · ${parsed.fornecedor_nome ?? ""}`,
        });
      }
      toast.success(`NFe importada: ${parsed.itens.length} item(ns), R$ ${parsed.valor_total.toFixed(2)}`);
      setOpenNfe(false);
      qc.invalidateQueries({ queryKey: ["pecas"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["notas-fiscais"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const abaixoMinimo = pecas.filter((p) => Number(p.saldo) <= Number(p.estoque_minimo) && Number(p.estoque_minimo) > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">Peças de desgaste, entradas via NFe e saídas por instalação.</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={openNfe} onOpenChange={setOpenNfe}>
              <DialogTrigger asChild>
                <Button variant="secondary"><Upload className="h-4 w-4 mr-2" />Importar NFe (XML)</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Importar Nota Fiscal Eletrônica</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Envie o arquivo XML da NFe. O sistema extrai fornecedor, itens, quantidades e valores automaticamente e lança as entradas em estoque.
                  </p>
                  <Input type="file" accept=".xml,application/xml,text/xml" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadNfe(f);
                  }} />
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openPeca} onOpenChange={setOpenPeca}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Peça</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar Peça</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome *</Label><Input value={pecaForm.nome} onChange={(e) => setPecaForm({ ...pecaForm, nome: e.target.value })} /></div>
                  <div><Label>Código</Label><Input value={pecaForm.codigo} onChange={(e) => setPecaForm({ ...pecaForm, codigo: e.target.value })} /></div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Select value={pecaForm.fornecedor_id} onValueChange={(v) => setPecaForm({ ...pecaForm, fornecedor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Estoque mínimo</Label><Input type="number" value={pecaForm.estoque_minimo} onChange={(e) => setPecaForm({ ...pecaForm, estoque_minimo: Number(e.target.value) })} /></div>
                    <div><Label>Vida útil (h)</Label><Input type="number" value={pecaForm.vida_util_horas} onChange={(e) => setPecaForm({ ...pecaForm, vida_util_horas: Number(e.target.value) })} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => criarPeca.mutate()} disabled={!pecaForm.nome}>Salvar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openMov} onOpenChange={setOpenMov}>
              <DialogTrigger asChild><Button variant="outline"><ArrowDown className="h-4 w-4 mr-2" />Movimentar</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Movimentação de Estoque</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Peça *</Label>
                    <Select value={movForm.peca_id} onValueChange={(v) => setMovForm({ ...movForm, peca_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{pecas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} (saldo: {p.saldo})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={movForm.tipo} onValueChange={(v) => setMovForm({ ...movForm, tipo: v as "entrada" | "saida" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída (instalação)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantidade *</Label><Input type="number" value={movForm.quantidade} onChange={(e) => setMovForm({ ...movForm, quantidade: Number(e.target.value) })} /></div>
                  {movForm.tipo === "saida" && (
                    <div>
                      <Label>Instalada em (equipamento)</Label>
                      <Select value={movForm.equipamento_id} onValueChange={(v) => setMovForm({ ...movForm, equipamento_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><Label>Observações</Label><Input value={movForm.observacoes} onChange={(e) => setMovForm({ ...movForm, observacoes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={() => criarMov.mutate()} disabled={!movForm.peca_id || !movForm.quantidade}>Registrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {abaixoMinimo.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="text-sm">
              <span className="font-semibold text-destructive">{abaixoMinimo.length}</span> peça(s) abaixo do estoque mínimo:{" "}
              <span className="text-muted-foreground">{abaixoMinimo.map((p) => p.nome).join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pecas">
        <TabsList>
          <TabsTrigger value="pecas">Peças ({pecas.length})</TabsTrigger>
          <TabsTrigger value="mov">Movimentações ({movs.length})</TabsTrigger>
          <TabsTrigger value="nfe">Notas Fiscais ({notas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pecas">
          <Card>
            <CardHeader><CardTitle className="text-base">Peças cadastradas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pecas.map((p) => {
                    const baixo = Number(p.saldo) <= Number(p.estoque_minimo) && Number(p.estoque_minimo) > 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.codigo ?? "—"}</TableCell>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>{p.fornecedores?.nome ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono">{Number(p.saldo).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{Number(p.estoque_minimo).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          {baixo
                            ? <Badge variant="destructive">Repor</Badge>
                            : <Badge variant="outline" className="border-[color:var(--status-operacional)]/40 text-[color:var(--status-operacional)]">OK</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mov">
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico de movimentações</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Peça</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.data_movimentacao).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        {m.tipo === "entrada"
                          ? <Badge className="bg-[color:var(--status-operacional)]/20 text-[color:var(--status-operacional)] border-[color:var(--status-operacional)]/40 gap-1"><ArrowDown className="h-3 w-3" />Entrada</Badge>
                          : <Badge className="bg-primary/20 text-primary border-primary/40 gap-1"><ArrowUp className="h-3 w-3" />Saída</Badge>}
                      </TableCell>
                      <TableCell>{m.pecas?.nome ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{Number(m.quantidade).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{m.equipamentos?.nome ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.notas_fiscais?.numero ? `NF ${m.notas_fiscais.numero}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.observacoes ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfe">
          <Card>
            <CardHeader><CardTitle className="text-base">Notas fiscais importadas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número/Série</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>XML</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono text-xs">{n.numero ?? "—"} / {n.serie ?? "—"}</TableCell>
                      <TableCell>{n.fornecedor_nome ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{n.fornecedor_cnpj ?? "—"}</TableCell>
                      <TableCell className="text-xs">{n.data_emissao ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">R$ {Number(n.valor_total).toFixed(2)}</TableCell>
                      <TableCell>
                        {n.xml_url ? (
                          <a href={n.xml_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" />XML
                          </a>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}