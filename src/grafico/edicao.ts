// Edição manual do gráfico: trocar a linha de uma cor, pintar pontos e desfazer.
// Funções sem tela, para poderem ser testadas.
//
// A ordem da legenda NÃO muda durante a edição: cada cor fica com o mesmo
// símbolo, para a pessoa não se confundir. Cores que ficam sem pontos só saem
// da legenda quando a edição termina (removerCoresSemPontos).

import { deltaE2000 } from '../cores/cielab';
import type { Linha } from '../catalogo/dmc';
import { SEM_PONTO, type Grafico } from '../processamento/converter';

function contar(celulas: Uint16Array, tamanho: number): number[] {
  const contagem = new Array<number>(tamanho).fill(0);
  for (const c of celulas) if (c !== SEM_PONTO) contagem[c]++;
  return contagem;
}

/** Devolve um gráfico novo com a contagem refeita (as outras partes são compartilhadas). */
export function recontar(g: Grafico): Grafico {
  return { ...g, contagem: contar(g.celulas, g.paleta.length) };
}

/**
 * Troca a linha da cor "indice" por "nova".
 * Se a nova linha já está na legenda, as duas cores se juntam numa só.
 */
export function trocarCor(g: Grafico, indice: number, nova: Linha): Grafico {
  const existente = g.paleta.findIndex((l) => l.codigo === nova.codigo);
  if (existente === indice) return g;
  if (existente < 0) {
    const paleta = g.paleta.map((l, i) => (i === indice ? nova : l));
    return { ...g, paleta };
  }
  // juntar: os pontos de "indice" passam para "existente", e "indice" sai da legenda
  const celulas = new Uint16Array(g.celulas.length);
  for (let i = 0; i < celulas.length; i++) {
    const c = g.celulas[i];
    if (c === SEM_PONTO) celulas[i] = SEM_PONTO;
    else {
      const destino = c === indice ? existente : c;
      celulas[i] = destino > indice ? destino - 1 : destino;
    }
  }
  const paleta = g.paleta.filter((_, i) => i !== indice);
  return { ...g, celulas, paleta, contagem: contar(celulas, paleta.length) };
}

/** Pinta um ponto (cor da legenda ou SEM_PONTO). Muda o gráfico no lugar; devolve se mudou. */
export function pintar(g: Grafico, posicao: number, valor: number): boolean {
  if (posicao < 0 || posicao >= g.celulas.length) return false;
  if (valor !== SEM_PONTO && (valor < 0 || valor >= g.paleta.length)) return false;
  if (g.celulas[posicao] === valor) return false;
  g.celulas[posicao] = valor;
  return true;
}

/**
 * Todos os pontos no caminho reto entre dois pontos (incluindo os dois).
 * Usado para o traço não "pular" quadradinhos quando o dedo se move rápido.
 */
export function pontosNoCaminho(c0: number, l0: number, c1: number, l1: number): { coluna: number; linha: number }[] {
  const pontos: { coluna: number; linha: number }[] = [];
  const dc = Math.abs(c1 - c0);
  const dl = -Math.abs(l1 - l0);
  const sc = c0 < c1 ? 1 : -1;
  const sl = l0 < l1 ? 1 : -1;
  let erro = dc + dl;
  let c = c0;
  let l = l0;
  for (;;) {
    pontos.push({ coluna: c, linha: l });
    if (c === c1 && l === l1) return pontos;
    const e2 = 2 * erro;
    if (e2 >= dl) {
      erro += dl;
      c += sc;
    }
    if (e2 <= dc) {
      erro += dc;
      l += sl;
    }
  }
}

/** Tira da legenda as cores que ficaram sem nenhum ponto (mantendo a ordem das outras). */
export function removerCoresSemPontos(g: Grafico): Grafico {
  const contagem = contar(g.celulas, g.paleta.length);
  if (contagem.every((n) => n > 0)) return { ...g, contagem };
  const novoIndice = new Int32Array(g.paleta.length).fill(-1);
  let n = 0;
  contagem.forEach((qtd, i) => {
    if (qtd > 0) novoIndice[i] = n++;
  });
  const celulas = g.celulas.map((c) => (c === SEM_PONTO ? SEM_PONTO : novoIndice[c]));
  const paleta = g.paleta.filter((_, i) => contagem[i] > 0);
  return { ...g, celulas, paleta, contagem: contagem.filter((q) => q > 0) };
}

// ---------- Sugestões de linhas ----------

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** As linhas de cor mais parecida (sem incluir a própria). */
export function linhasParecidas(linha: Linha, todas: readonly Linha[], quantas = 12): Linha[] {
  return todas
    .filter((l) => l.codigo !== linha.codigo)
    .map((l) => ({ l, d: deltaE2000(linha.lab, l.lab) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, quantas)
    .map((x) => x.l);
}

/** Procura por código ("310", "b52") ou por nome ("vermelho"). Códigos exatos vêm primeiro. */
export function procurarLinhas(texto: string, todas: readonly Linha[], quantas = 20): Linha[] {
  const busca = semAcento(texto.trim());
  if (!busca) return [];
  const pontuar = (l: Linha) => {
    const codigo = l.codigo.toLowerCase();
    if (codigo === busca) return 0;
    if (codigo.startsWith(busca)) return 1;
    if (semAcento(l.nome).includes(busca)) return 2;
    return 99;
  };
  return todas
    .map((l) => ({ l, p: pontuar(l) }))
    .filter((x) => x.p < 99)
    .sort((a, b) => a.p - b.p || a.l.codigo.length - b.l.codigo.length || a.l.codigo.localeCompare(b.l.codigo))
    .slice(0, quantas)
    .map((x) => x.l);
}

// ---------- Desfazer ----------

interface Retrato {
  celulas: Uint16Array;
  paleta: Linha[];
}

/** Guarda os estados anteriores do gráfico para poder desfazer. */
export class Historico {
  private pilha: Retrato[] = [];
  constructor(private readonly limite = 30) {}

  get vazio(): boolean {
    return this.pilha.length === 0;
  }

  guardar(g: Grafico): void {
    this.pilha.push({ celulas: g.celulas.slice(), paleta: [...g.paleta] });
    if (this.pilha.length > this.limite) this.pilha.shift();
  }

  desfazer(g: Grafico): Grafico | null {
    const r = this.pilha.pop();
    if (!r) return null;
    return { ...g, celulas: r.celulas, paleta: r.paleta, contagem: contar(r.celulas, r.paleta.length) };
  }

  limpar(): void {
    this.pilha = [];
  }
}
