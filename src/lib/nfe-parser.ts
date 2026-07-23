// Parse Brazilian NFe (Nota Fiscal Eletrônica) XML on the client.
// Handles the common namespaced NFe schema; returns null on unrecognised XML.

export type NFeItem = {
  codigo: string | null;
  descricao: string;
  quantidade: number;
  valor_unit: number;
  valor_total: number;
};

export type ParsedNFe = {
  numero: string | null;
  serie: string | null;
  chave: string | null;
  data_emissao: string | null; // YYYY-MM-DD
  fornecedor_nome: string | null;
  fornecedor_cnpj: string | null;
  valor_total: number;
  itens: NFeItem[];
};

function textOf(el: Element | null | undefined, tag: string): string | null {
  if (!el) return null;
  const node = el.getElementsByTagName(tag)[0];
  return node?.textContent?.trim() ?? null;
}

export function parseNFeXml(xml: string): ParsedNFe | null {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return null;

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  const ide = doc.getElementsByTagName("ide")[0];
  const emit = doc.getElementsByTagName("emit")[0];
  const total = doc.getElementsByTagName("ICMSTot")[0];

  const chave = infNFe?.getAttribute("Id")?.replace(/^NFe/, "") ?? null;

  const dEmi = textOf(ide, "dhEmi") ?? textOf(ide, "dEmi");
  const data_emissao = dEmi ? dEmi.slice(0, 10) : null;

  const itens: NFeItem[] = [];
  const detNodes = doc.getElementsByTagName("det");
  for (let i = 0; i < detNodes.length; i++) {
    const det = detNodes[i];
    const prod = det.getElementsByTagName("prod")[0];
    if (!prod) continue;
    itens.push({
      codigo: textOf(prod, "cProd"),
      descricao: textOf(prod, "xProd") ?? "",
      quantidade: Number(textOf(prod, "qCom") ?? textOf(prod, "qTrib") ?? 0),
      valor_unit: Number(textOf(prod, "vUnCom") ?? textOf(prod, "vUnTrib") ?? 0),
      valor_total: Number(textOf(prod, "vProd") ?? 0),
    });
  }

  return {
    numero: textOf(ide, "nNF"),
    serie: textOf(ide, "serie"),
    chave,
    data_emissao,
    fornecedor_nome: textOf(emit, "xNome"),
    fornecedor_cnpj: textOf(emit, "CNPJ") ?? textOf(emit, "CPF"),
    valor_total: Number(textOf(total, "vNF") ?? 0),
    itens,
  };
}