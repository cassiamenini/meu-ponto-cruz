// Desenho do gráfico na tela: quadradinhos, símbolos, grade, réguas,
// marcação a cada 10 pontos e indicação do centro.
//
// Só a parte visível é desenhada, então gráficos grandes continuam leves.

import { SEM_PONTO, type Grafico } from '../processamento/converter';
import { hexParaRgb } from '../cores/cielab';
import { corDoSimbolo, simboloDa, type Pincel } from './simbolos';

export type ModoGrafico = 'cores-simbolos' | 'simbolos' | 'previa';

/** Tamanhos possíveis de cada ponto na tela, em pixels. */
export const NIVEIS_ZOOM = [4, 6, 8, 12, 16, 22, 30] as const;
/** A partir deste tamanho os símbolos ficam legíveis. */
export const CELULA_MIN_SIMBOLO = 12;
const CELULA_MIN_GRADE = 6;
/** Largura das réguas com os números (topo e esquerda). */
export const MARGEM_REGUA = 32;

/** Cor usada para mostrar o tecido nos quadradinhos sem bordado (diferente das linhas brancas). */
export const COR_TECIDO = '#ECE3D0';
const COR_CENTRO = '#9B2C3D';
const FUNDO_REGUA = '#FBF6EE';
const TEXTO_REGUA = '#2A211C';

// ---------- Contas (sem desenho; testáveis) ----------

/**
 * Zoom inicial: o maior que ainda mostra a largura toda,
 * mas nunca pequeno demais para ler os símbolos.
 */
export function zoomInicial(largura: number, espacoPx: number): number {
  let escolhido = NIVEIS_ZOOM.indexOf(CELULA_MIN_SIMBOLO);
  for (let i = escolhido; i < NIVEIS_ZOOM.length; i++) {
    if (MARGEM_REGUA + largura * NIVEIS_ZOOM[i] <= espacoPx) escolhido = i;
  }
  return escolhido;
}

/** Quais colunas (ou linhas) aparecem: [primeira, depois da última). */
export function faixaVisivel(rolagem: number, tamanhoTela: number, celula: number, total: number): [number, number] {
  const inicio = Math.max(0, Math.floor(rolagem / celula));
  const fim = Math.min(total, Math.ceil((rolagem + Math.max(0, tamanhoTela - MARGEM_REGUA)) / celula));
  return [inicio, Math.max(inicio, fim)];
}

/** Qual ponto está embaixo do dedo/mouse. Coluna e linha começam em 0. */
export function pontoNaPosicao(
  x: number,
  y: number,
  rolagemX: number,
  rolagemY: number,
  celula: number,
  largura: number,
  altura: number,
): { coluna: number; linha: number } | null {
  if (x < MARGEM_REGUA || y < MARGEM_REGUA) return null;
  const coluna = Math.floor((x - MARGEM_REGUA + rolagemX) / celula);
  const linha = Math.floor((y - MARGEM_REGUA + rolagemY) / celula);
  if (coluna < 0 || linha < 0 || coluna >= largura || linha >= altura) return null;
  return { coluna, linha };
}

/** Um pixel por ponto, na cor da linha (ou do tecido, onde não se borda). */
export function imagemDosPontos(ctx: CanvasRenderingContext2D, g: Grafico): ImageData {
  const tecido = hexParaRgb(COR_TECIDO);
  const dados = ctx.createImageData(g.largura, g.altura);
  for (let i = 0; i < g.celulas.length; i++) {
    const c = g.celulas[i];
    const [r, gr, b] = c === SEM_PONTO ? tecido : g.paleta[c].rgb;
    dados.data.set([r, gr, b, 255], i * 4);
  }
  return dados;
}

/** Mistura a cor com branco (para apagar as cores que não estão em destaque). */
export function clarear(rgb: readonly [number, number, number], quanto: number): string {
  const c = rgb.map((v) => Math.round(v + (255 - v) * quanto));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// ---------- Pincel da tela ----------

export class PincelCanvas implements Pincel {
  constructor(private readonly ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  cor(cor: string): void {
    this.ctx.fillStyle = cor;
    this.ctx.strokeStyle = cor;
  }
  espessura(px: number): void {
    this.ctx.lineWidth = px;
  }
  linha(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }
  circulo(cx: number, cy: number, raio: number, cheio: boolean): void {
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    if (cheio) this.ctx.fill();
    else this.ctx.stroke();
  }
  poligono(pontos: readonly (readonly [number, number])[], cheio: boolean): void {
    this.ctx.beginPath();
    pontos.forEach(([x, y], i) => (i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y)));
    this.ctx.closePath();
    if (cheio) this.ctx.fill();
    else this.ctx.stroke();
  }
  texto(texto: string, cx: number, cy: number, tamanho: number): void {
    this.ctx.font = `700 ${tamanho}px "Atkinson Hyperlegible", "Segoe UI", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(texto, cx, cy + tamanho * 0.04);
  }
}

// ---------- Desenho ----------

export interface Vista {
  /** Tamanho de cada ponto, em pixels. */
  celula: number;
  rolagemX: number;
  rolagemY: number;
  /** Tamanho da área desenhada, em pixels de tela. */
  larguraTela: number;
  alturaTela: number;
  modo: ModoGrafico;
  /** Posição na legenda da cor em destaque (as outras ficam apagadas). */
  destaque: number | null;
  /** Ponto marcado pelo cursor do teclado, no modo de correção. */
  cursor?: { coluna: number; linha: number } | null;
}

const COR_CURSOR = '#0B4FA3';

export function desenharGrafico(ctx: CanvasRenderingContext2D, g: Grafico, v: Vista): void {
  const { celula, rolagemX, rolagemY, larguraTela, alturaTela, modo, destaque } = v;
  const [c0, c1] = faixaVisivel(rolagemX, larguraTela, celula, g.largura);
  const [l0, l1] = faixaVisivel(rolagemY, alturaTela, celula, g.altura);
  const comSimbolos = modo !== 'previa' && celula >= CELULA_MIN_SIMBOLO;
  const comGrade = modo !== 'previa' && celula >= CELULA_MIN_GRADE;

  const corCheia = g.paleta.map((l) => (modo === 'simbolos' ? '#FFFFFF' : l.hex));
  const corApagada = g.paleta.map((l) => (modo === 'simbolos' ? '#FFFFFF' : clarear(l.rgb, 0.82)));
  const corSimbolo = g.paleta.map((l) => (modo === 'simbolos' ? '#000000' : corDoSimbolo(l.lab.L)));
  const pincel = new PincelCanvas(ctx);

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, larguraTela, alturaTela);

  // Área dos pontos (sem as réguas).
  ctx.beginPath();
  ctx.rect(MARGEM_REGUA, MARGEM_REGUA, larguraTela - MARGEM_REGUA, alturaTela - MARGEM_REGUA);
  ctx.clip();
  ctx.translate(MARGEM_REGUA - rolagemX, MARGEM_REGUA - rolagemY);

  for (let l = l0; l < l1; l++) {
    for (let c = c0; c < c1; c++) {
      const i = g.celulas[l * g.largura + c];
      if (i === SEM_PONTO) {
        // sem bordado: em branco no gráfico, cor de tecido em "como vai ficar"
        ctx.fillStyle = modo === 'previa' ? COR_TECIDO : '#FFFFFF';
        ctx.fillRect(c * celula, l * celula, celula, celula);
        continue;
      }
      const apagado = destaque !== null && i !== destaque;
      ctx.fillStyle = apagado ? corApagada[i] : corCheia[i];
      ctx.fillRect(c * celula, l * celula, celula, celula);
      if (comSimbolos && !apagado) {
        pincel.cor(corSimbolo[i]);
        simboloDa(i).desenhar(pincel, c * celula, l * celula, celula);
      }
    }
  }

  if (comGrade) {
    const x0 = c0 * celula;
    const x1 = c1 * celula;
    const y0 = l0 * celula;
    const y1 = l1 * celula;
    // linhas finas: uma por ponto
    ctx.strokeStyle = modo === 'simbolos' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) if (c % 10 !== 0) ctx.moveTo(c * celula + 0.5, y0), ctx.lineTo(c * celula + 0.5, y1);
    for (let l = l0; l <= l1; l++) if (l % 10 !== 0) ctx.moveTo(x0, l * celula + 0.5), ctx.lineTo(x1, l * celula + 0.5);
    ctx.stroke();
    // linhas grossas: a cada 10 pontos, e a borda
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) if (c % 10 === 0 || c === g.largura) ctx.moveTo(c * celula, y0), ctx.lineTo(c * celula, y1);
    for (let l = l0; l <= l1; l++) if (l % 10 === 0 || l === g.altura) ctx.moveTo(x0, l * celula), ctx.lineTo(x1, l * celula);
    ctx.stroke();
    // centro
    ctx.strokeStyle = COR_CENTRO;
    ctx.lineWidth = 3;
    ctx.setLineDash([celula, celula / 2]);
    ctx.beginPath();
    const cx = (g.largura / 2) * celula;
    const cy = (g.altura / 2) * celula;
    ctx.moveTo(cx, 0), ctx.lineTo(cx, g.altura * celula);
    ctx.moveTo(0, cy), ctx.lineTo(g.largura * celula, cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (v.cursor) {
    // contorno duplo (branco + azul) para aparecer sobre qualquer cor
    const x = v.cursor.coluna * celula;
    const y = v.cursor.linha * celula;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(x - 1, y - 1, celula + 2, celula + 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = COR_CURSOR;
    ctx.strokeRect(x - 1, y - 1, celula + 2, celula + 2);
  }
  ctx.restore();

  desenharReguas(ctx, g, v, c0, c1, l0, l1);
}

function desenharReguas(ctx: CanvasRenderingContext2D, g: Grafico, v: Vista, c0: number, c1: number, l0: number, l1: number): void {
  const { celula, rolagemX, rolagemY, larguraTela, alturaTela } = v;
  ctx.save();
  ctx.fillStyle = FUNDO_REGUA;
  ctx.fillRect(0, 0, larguraTela, MARGEM_REGUA);
  ctx.fillRect(0, 0, MARGEM_REGUA, alturaTela);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGEM_REGUA - 0.5, 0), ctx.lineTo(MARGEM_REGUA - 0.5, alturaTela);
  ctx.moveTo(0, MARGEM_REGUA - 0.5), ctx.lineTo(larguraTela, MARGEM_REGUA - 0.5);
  ctx.stroke();

  ctx.fillStyle = TEXTO_REGUA;
  ctx.font = '700 13px "Atkinson Hyperlegible", "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';

  // números a cada 10 pontos, alinhados com as linhas grossas
  ctx.textAlign = 'center';
  for (let c = Math.ceil(c0 / 10) * 10; c <= c1; c += 10) {
    if (c === 0) continue;
    const x = MARGEM_REGUA + c * celula - rolagemX;
    if (x > MARGEM_REGUA + 8 && x < larguraTela - 8) ctx.fillText(String(c), x, MARGEM_REGUA / 2);
  }
  ctx.textAlign = 'right';
  for (let l = Math.ceil(l0 / 10) * 10; l <= l1; l += 10) {
    if (l === 0) continue;
    // se o centro cai bem nesta linha, o número sobe um pouco para não ficar embaixo da seta
    const y = MARGEM_REGUA + l * celula - rolagemY - (l === g.altura / 2 ? 10 : 0);
    if (y > MARGEM_REGUA + 8 && y < alturaTela - 8) ctx.fillText(String(l), MARGEM_REGUA - 4, y);
  }

  // setas do centro nas réguas
  ctx.fillStyle = COR_CENTRO;
  const cx = MARGEM_REGUA + (g.largura / 2) * celula - rolagemX;
  const cy = MARGEM_REGUA + (g.altura / 2) * celula - rolagemY;
  if (cx >= MARGEM_REGUA && cx <= larguraTela) {
    ctx.beginPath();
    ctx.moveTo(cx - 7, MARGEM_REGUA - 12), ctx.lineTo(cx + 7, MARGEM_REGUA - 12), ctx.lineTo(cx, MARGEM_REGUA - 1);
    ctx.fill();
  }
  if (cy >= MARGEM_REGUA && cy <= alturaTela) {
    ctx.beginPath();
    ctx.moveTo(MARGEM_REGUA - 12, cy - 7), ctx.lineTo(MARGEM_REGUA - 12, cy + 7), ctx.lineTo(MARGEM_REGUA - 1, cy);
    ctx.fill();
  }

  ctx.fillStyle = FUNDO_REGUA;
  ctx.fillRect(0, 0, MARGEM_REGUA - 1, MARGEM_REGUA - 1);
  ctx.restore();
}
