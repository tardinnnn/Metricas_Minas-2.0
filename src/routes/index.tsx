import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { fetchEquipamentos, STATUS_LABEL, type Equipamento } from "@/lib/metrica-api";
import { AlertTriangle, Activity, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxograma de Britagem — MétricaMinas" },
      { name: "description", content: "Fluxograma interativo da planta de britagem: clique nos equipamentos para ver desgaste e histórico de peças." },
    ],
  }),
  component: Fluxograma,
});

// Vida útil de referência (horas) para calcular % de desgaste
const VIDA_UTIL_H = 2000;

type NodeKind = "funil" | "equip" | "pilha";
type Node = {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  w?: number;
  match?: string[]; // substrings para casar com nome do equipamento
  stage?: "primario" | "secundario" | "terciario";
};

// Layout do circuito de britagem (baseado no diagrama Vale Alpino)
const NODES: Node[] = [
  // Primário
  { id: "alim-primario", label: "Alimentador Primário", kind: "equip", x: 380, y: 70, w: 180, stage: "primario", match: ["aliment", "primár"] },
  { id: "funil-1", label: "Alimentação", kind: "funil", x: 460, y: 10 },
  { id: "britador-c110", label: "Britador C110", kind: "equip", x: 380, y: 170, w: 180, stage: "primario", match: ["c110", "mandíbul", "mandibul"] },
  { id: "funil-2", label: "", kind: "funil", x: 460, y: 260 },

  // Secundário
  { id: "peneira-scalper", label: "Peneira Scalper", kind: "equip", x: 340, y: 340, w: 190, stage: "secundario", match: ["scalper", "peneira vibr", "peneira 01"] },
  { id: "correia-1", label: "Correia", kind: "equip", x: 620, y: 340, w: 130, stage: "secundario", match: ["correia", "tc-05"] },
  { id: "alim-pulmao", label: "Alimentador Pulmão", kind: "equip", x: 80, y: 420, w: 200, stage: "secundario", match: ["pulmão", "pulmao"] },
  { id: "alim-hp200", label: "Alimentador HP 200", kind: "equip", x: 620, y: 420, w: 180, stage: "secundario", match: ["hp 200", "hp200 aliment"] },
  { id: "britador-hp300", label: "Britador HP300", kind: "equip", x: 340, y: 500, w: 180, stage: "secundario", match: ["hp300", "cônico 02", "conico 02"] },
  { id: "britador-hp2000", label: "Britador HP 2000", kind: "equip", x: 600, y: 500, w: 180, stage: "secundario", match: ["hp 2000", "hp2000"] },

  // Terciário
  { id: "peneira-sec", label: "Peneira Secundária", kind: "equip", x: 340, y: 620, w: 200, stage: "terciario", match: ["secund", "peneira vibrat"] },
  { id: "peneira-terc", label: "Peneiramento Terciário", kind: "equip", x: 340, y: 730, w: 220, stage: "terciario", match: ["terciár", "terciar"] },

  // Pilhas de produto
  { id: "pilha-1", label: "P1", kind: "pilha", x: 120, y: 830 },
  { id: "pilha-2", label: "P2", kind: "pilha", x: 260, y: 830 },
  { id: "pilha-3", label: "P3", kind: "pilha", x: 420, y: 830 },
  { id: "pilha-4", label: "P4", kind: "pilha", x: 560, y: 830 },
  { id: "pilha-5", label: "P5", kind: "pilha", x: 700, y: 830 },
];

type Edge = { from: string; to: string; kind?: "flow" | "return" };
const EDGES: Edge[] = [
  { from: "funil-1", to: "alim-primario" },
  { from: "alim-primario", to: "britador-c110" },
  { from: "britador-c110", to: "funil-2" },
  { from: "funil-2", to: "peneira-scalper" },
  { from: "peneira-scalper", to: "correia-1" },
  { from: "correia-1", to: "alim-hp200" },
  { from: "alim-pulmao", to: "britador-hp300" },
  { from: "peneira-scalper", to: "alim-pulmao", kind: "return" },
  { from: "alim-hp200", to: "britador-hp2000" },
  { from: "britador-hp300", to: "peneira-sec" },
  { from: "britador-hp2000", to: "peneira-sec" },
  { from: "peneira-sec", to: "peneira-terc" },
  { from: "peneira-terc", to: "pilha-1" },
  { from: "peneira-terc", to: "pilha-2" },
  { from: "peneira-terc", to: "pilha-3" },
  { from: "peneira-terc", to: "pilha-4" },
  { from: "peneira-terc", to: "pilha-5" },
];

function wearFor(eq?: Equipamento) {
  if (!eq) return 0;
  return Math.min(100, Math.round((Number(eq.horas_trabalhadas) / VIDA_UTIL_H) * 100));
}

function wearColor(pct: number) {
  if (pct >= 85) return "var(--status-parada)";
  if (pct >= 70) return "var(--status-manutencao)";
  if (pct >= 50) return "oklch(0.78 0.16 85)";
  return "var(--status-operacional)";
}

function wearLabel(pct: number) {
  if (pct >= 85) return "Crítico";
  if (pct >= 70) return "Alerta";
  if (pct >= 50) return "Atenção";
  return "Normal";
}

function matchEquip(node: Node, list: Equipamento[]): Equipamento | undefined {
  if (!node.match) return undefined;
  const lower = list.map((e) => ({ eq: e, n: e.nome.toLowerCase() }));
  for (const term of node.match) {
    const hit = lower.find((r) => r.n.includes(term));
    if (hit) return hit.eq;
  }
  return undefined;
}

function Fluxograma() {
  const navigate = useNavigate();
  const { data: equipamentos = [] } = useQuery({ queryKey: ["equipamentos"], queryFn: fetchEquipamentos });

  const stats = useMemo(() => {
    const nodesWithEq = NODES.filter((n) => n.kind === "equip").map((n) => ({
      n,
      eq: matchEquip(n, equipamentos),
    }));
    const withData = nodesWithEq.filter((x) => x.eq);
    const criticos = withData.filter((x) => wearFor(x.eq) >= 85).length;
    const alertas = withData.filter((x) => {
      const p = wearFor(x.eq);
      return p >= 70 && p < 85;
    }).length;
    return { criticos, alertas, total: withData.length };
  }, [equipamentos]);

  const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

  return (
    <div className="min-h-full bg-background">
      {/* Barra superior "Vale Alpino" */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-primary text-lg font-black tracking-[0.2em]">VALE ALPINO</div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Gestão de Desgaste</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-destructive/20 border-destructive/40 text-destructive gap-1">
            <AlertTriangle className="h-3 w-3" />
            {stats.criticos} Crítico{stats.criticos === 1 ? "" : "s"}
          </Badge>
          <Badge className="bg-[color:var(--status-manutencao)]/20 border-[color:var(--status-manutencao)]/40 text-[color:var(--status-manutencao)] gap-1">
            <Wrench className="h-3 w-3" />
            {stats.alertas} Alerta{stats.alertas === 1 ? "" : "s"}
          </Badge>
          <Badge className="bg-[color:var(--status-operacional)]/20 border-[color:var(--status-operacional)]/40 text-[color:var(--status-operacional)] gap-1">
            <Activity className="h-3 w-3" />
            {stats.total} Ativos
          </Badge>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold">Fluxograma de Britagem — Planta Vale Alpino</h1>
          <p className="text-xs text-muted-foreground">Clique em um equipamento para o resumo · Duplo clique abre a ficha completa</p>
        </div>

        <div className="relative rounded-lg border border-border bg-[oklch(0.16_0.012_60)] overflow-hidden">
          {/* Legenda */}
          <div className="absolute top-4 right-4 z-10 bg-card/90 border border-border rounded-md p-3 text-[10px] uppercase tracking-wider space-y-1 hidden md:block">
            <div className="text-primary font-bold mb-1">Desgaste</div>
            <LegendRow color="var(--status-operacional)" label="Normal < 50%" />
            <LegendRow color="oklch(0.78 0.16 85)" label="Atenção 50–70%" />
            <LegendRow color="var(--status-manutencao)" label="Alerta 70–85%" />
            <LegendRow color="var(--status-parada)" label="Crítico > 85%" />
          </div>

          {/* Labels de estágio */}
          <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Primário</div>
          <div className="absolute left-4 top-[380px] text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Secundário</div>
          <div className="absolute left-4 top-[600px] text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Terciário</div>

          <svg
            viewBox="0 0 860 900"
            className="w-full h-auto block"
            style={{ maxHeight: "80vh" }}
          >
            {/* Grid sutil */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.22 0.014 60)" strokeWidth="0.5" />
              </pattern>
              <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="oklch(0.62 0.22 27)" />
              </marker>
              <marker id="arrow-gray" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="oklch(0.5 0.02 60)" />
              </marker>
            </defs>
            <rect width="860" height="900" fill="url(#grid)" />

            {/* Arestas */}
            {EDGES.map((edge, i) => {
              const a = nodeById(edge.from);
              const b = nodeById(edge.to);
              const ax = a.x + (a.w ?? 60) / 2;
              const ay = a.y + (a.kind === "funil" ? 50 : a.kind === "pilha" ? 30 : 70);
              const bx = b.x + (b.w ?? 60) / 2;
              const by = b.y;
              const stroke = edge.kind === "return" ? "oklch(0.5 0.02 60)" : "oklch(0.62 0.22 27)";
              const marker = edge.kind === "return" ? "url(#arrow-gray)" : "url(#arrow-red)";
              // caminho L-shape
              const midY = ay + (by - ay) / 2;
              const d = `M ${ax} ${ay} L ${ax} ${midY} L ${bx} ${midY} L ${bx} ${by}`;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.6}
                  strokeDasharray={edge.kind === "return" ? "4 3" : undefined}
                  markerEnd={marker}
                  opacity={0.85}
                />
              );
            })}

            {/* Nós */}
            {NODES.map((n) => {
              if (n.kind === "funil") return <Funil key={n.id} node={n} />;
              if (n.kind === "pilha") return <Pilha key={n.id} node={n} />;
              const eq = matchEquip(n, equipamentos);
              return (
                <EquipNode
                  key={n.id}
                  node={n}
                  eq={eq}
                  onOpen={() => {
                    if (eq) navigate({ to: "/equipamentos", search: { highlight: eq.id } as never });
                    else navigate({ to: "/equipamentos" });
                  }}
                />
              );
            })}
          </svg>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Dica: os equipamentos são associados por nome (ex.: "Britador HP300" reconhece "hp300", "cônico 02"). Cadastre equipamentos com nomes correspondentes em <span className="text-primary">/equipamentos</span> para popular o fluxograma.
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2 w-3" style={{ background: color }} />
      <span className="text-foreground/80 normal-case tracking-normal">{label}</span>
    </div>
  );
}

function Funil({ node }: { node: Node }) {
  return (
    <g transform={`translate(${node.x},${node.y})`}>
      <polygon
        points="0,0 60,0 30,50"
        fill="oklch(0.22 0.014 60)"
        stroke="oklch(0.4 0.03 70)"
        strokeWidth={1.2}
      />
      {node.label && (
        <text x={30} y={-6} textAnchor="middle" fill="oklch(0.68 0.02 70)" fontSize={10}>
          {node.label}
        </text>
      )}
    </g>
  );
}

function Pilha({ node }: { node: Node }) {
  return (
    <g transform={`translate(${node.x},${node.y})`}>
      <polygon
        points="0,30 30,0 60,30"
        fill="oklch(0.24 0.02 60)"
        stroke="oklch(0.42 0.03 70)"
        strokeWidth={1}
      />
      <text x={30} y={48} textAnchor="middle" fill="oklch(0.68 0.02 70)" fontSize={9}>
        {node.label}
      </text>
    </g>
  );
}

function EquipNode({
  node,
  eq,
  onOpen,
}: {
  node: Node;
  eq?: Equipamento;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pct = wearFor(eq);
  const color = eq ? wearColor(pct) : "oklch(0.4 0.02 60)";
  const w = node.w ?? 160;
  const h = 68;
  const critical = pct >= 85;

  return (
    <g transform={`translate(${node.x},${node.y})`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <g
            className="cursor-pointer"
            onDoubleClick={onOpen}
            style={{ transition: "opacity 0.15s" }}
          >
            {critical && (
              <rect
                x={-4}
                y={-4}
                width={w + 8}
                height={h + 8}
                rx={10}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={0.35}
              >
                <animate attributeName="opacity" values="0.15;0.55;0.15" dur="1.8s" repeatCount="indefinite" />
              </rect>
            )}
            <rect
              x={0}
              y={0}
              width={w}
              height={h}
              rx={8}
              fill="oklch(0.19 0.012 60)"
              stroke={color}
              strokeWidth={eq ? 1.5 : 1}
              opacity={eq ? 1 : 0.55}
            />
            <text
              x={w / 2}
              y={30}
              textAnchor="middle"
              fill="oklch(0.96 0.008 80)"
              fontSize={12}
              fontWeight={600}
              fontFamily="ui-monospace, monospace"
            >
              {node.label}
            </text>
            {eq ? (
              <>
                <text
                  x={w - 8}
                  y={16}
                  textAnchor="end"
                  fill={color}
                  fontSize={11}
                  fontWeight={700}
                >
                  {pct}%
                </text>
                {/* barra de desgaste */}
                <rect x={10} y={h - 14} width={w - 20} height={5} rx={2} fill="oklch(0.28 0.012 60)" />
                <rect x={10} y={h - 14} width={(w - 20) * (pct / 100)} height={5} rx={2} fill={color} />
              </>
            ) : (
              <text x={w - 8} y={16} textAnchor="end" fill="oklch(0.5 0.02 60)" fontSize={9}>
                sem dados
              </text>
            )}
          </g>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-72 p-0 border-primary/30" onDoubleClick={onOpen}>
          <div className="p-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Equipamento</div>
            <div className="font-bold text-primary">{node.label}</div>
            {eq?.modelo && <div className="text-xs text-muted-foreground">{eq.modelo}</div>}
          </div>
          {eq ? (
            <div className="p-3 space-y-2 text-xs">
              <Row label="Status" value={STATUS_LABEL[eq.status] ?? eq.status} />
              <Row label="Horas trabalhadas" value={`${Number(eq.horas_trabalhadas).toLocaleString("pt-BR")} h`} />
              <Row label="Vida útil ref." value={`${VIDA_UTIL_H} h`} />
              <div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  <span>Desgaste</span>
                  <span style={{ color }}>{wearLabel(pct)} · {pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
              {pct >= 70 && (
                <div className="text-[11px] rounded border border-primary/30 bg-primary/5 text-primary p-2">
                  ⚠ Alerta de manutenção — programar troca de peças de desgaste.
                </div>
              )}
              <button
                onClick={onOpen}
                className="w-full mt-2 text-xs rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 font-medium tracking-wide"
              >
                Abrir ficha completa →
              </button>
            </div>
          ) : (
            <div className="p-3 text-xs text-muted-foreground">
              Nenhum equipamento cadastrado corresponde a este nó.
              <button
                onClick={onOpen}
                className="w-full mt-3 text-xs rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 font-medium"
              >
                Cadastrar em /equipamentos →
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </g>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}