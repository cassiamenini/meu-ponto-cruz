// Conversão da imagem em gráfico de ponto cruz.
//
// Passo a passo:
//  1. Reduzir: cada ponto do bordado recebe a cor média do pedaço da imagem
//     que ele cobre (média feita em luz linear, como a luz se mistura de verdade).
//  2. Agrupar: o método k-means junta as cores parecidas em, no máximo,
//     "maxCores" grupos, medindo em CIELAB.
//  3. Escolher linhas: cada grupo vira a linha DMC mais parecida (CIEDE2000),
//     e cada ponto recebe a linha da paleta mais parecida com a sua cor.
//  4. Limpar: pontos soltos e cores com pouquíssimos pontos são trocados pela
//     cor vizinha, para o bordado ficar mais fácil de fazer.
//
// Este arquivo não usa nada da tela: roda no navegador, no Worker e nos testes.

import { deltaE2000, linear, linearParaLab, type Lab } from '../cores/cielab';
import { LINHAS_DMC, linhaMaisProxima, type Linha } from '../catalogo/dmc';

export const LIMITES_GRADE = {
  ladoMin: 10,
  /** 250 × 250 = 62.500 pontos: grande o bastante e seguro para celulares. */
  ladoMax: 250,
  coresMin: 2,
  coresMax: 40,
};

export type Limpeza = 'forte' | 'media' | 'nenhuma';

export interface OpcoesConversao {
  largura: number;
  altura: number;
  maxCores: number;
  limpeza: Limpeza;
}

export interface Grafico {
  largura: number;
  altura: number;
  /** Para cada ponto (linha por linha, de cima para baixo), a posição da cor na paleta. */
  celulas: Uint16Array;
  /** Linhas usadas, da mais usada para a menos usada. */
  paleta: Linha[];
  /** Quantos pontos de cada cor da paleta. */
  contagem: number[];
}

const LINEAR = Float32Array.from({ length: 256 }, (_, i) => linear(i));

// ---------- 1. Reduzir para a grade ----------

/**
 * Calcula a cor média (em CIELAB) de cada ponto da grade.
 * Partes transparentes da imagem são tratadas como fundo branco (o tecido).
 */
export function reduzirParaGrade(
  pixels: Uint8ClampedArray,
  larguraImagem: number,
  alturaImagem: number,
  largura: number,
  altura: number,
): Lab[] {
  const resultado: Lab[] = new Array(largura * altura);
  for (let cy = 0; cy < altura; cy++) {
    const y0 = Math.floor((cy * alturaImagem) / altura);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * alturaImagem) / altura));
    for (let cx = 0; cx < largura; cx++) {
      const x0 = Math.floor((cx * larguraImagem) / largura);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * larguraImagem) / largura));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * larguraImagem + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) {
          const a = pixels[i + 3] / 255;
          r += LINEAR[pixels[i]] * a + (1 - a);
          g += LINEAR[pixels[i + 1]] * a + (1 - a);
          b += LINEAR[pixels[i + 2]] * a + (1 - a);
          n++;
        }
      }
      resultado[cy * largura + cx] = linearParaLab(r / n, g / n, b / n);
    }
  }
  return resultado;
}

// ---------- 2. Agrupar cores (k-means) ----------

/** Gerador de números "aleatórios" previsível: a mesma imagem dá sempre o mesmo gráfico. */
function geradorAleatorio(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const distancia2 = (p: Lab, q: Lab) => (p.L - q.L) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2;

/** Agrupa as cores em até k grupos e devolve a cor central de cada grupo. */
export function agruparCores(cores: Lab[], k: number, iteracoes = 12, semente = 1): Lab[] {
  // Para imagens grandes, uma amostra regular já representa bem as cores.
  const passo = Math.max(1, Math.floor(cores.length / 20000));
  const pontos = cores.filter((_, i) => i % passo === 0);
  if (pontos.length === 0) return [];
  const aleatorio = geradorAleatorio(semente);

  // Início "k-means++": centros espalhados, para não juntar cores muito diferentes.
  const centros: Lab[] = [pontos[Math.floor(aleatorio() * pontos.length)]];
  const menorDist = pontos.map((p) => distancia2(p, centros[0]));
  while (centros.length < k) {
    const total = menorDist.reduce((s, d) => s + d, 0);
    if (total === 0) break; // não há mais cores diferentes
    let alvo = aleatorio() * total;
    let escolhido = 0;
    for (; escolhido < pontos.length - 1; escolhido++) {
      alvo -= menorDist[escolhido];
      if (alvo <= 0) break;
    }
    const novo = pontos[escolhido];
    centros.push(novo);
    for (let i = 0; i < pontos.length; i++) menorDist[i] = Math.min(menorDist[i], distancia2(pontos[i], novo));
  }

  const grupo = new Int32Array(pontos.length).fill(-1);
  for (let volta = 0; volta < iteracoes; volta++) {
    let mudou = false;
    for (let i = 0; i < pontos.length; i++) {
      let melhor = 0;
      let menor = Infinity;
      for (let c = 0; c < centros.length; c++) {
        const d = distancia2(pontos[i], centros[c]);
        if (d < menor) {
          menor = d;
          melhor = c;
        }
      }
      if (grupo[i] !== melhor) {
        grupo[i] = melhor;
        mudou = true;
      }
    }
    if (!mudou) break;

    const soma = centros.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < pontos.length; i++) {
      const s = soma[grupo[i]];
      s.L += pontos[i].L;
      s.a += pontos[i].a;
      s.b += pontos[i].b;
      s.n++;
    }
    for (let c = 0; c < centros.length; c++) {
      const s = soma[c];
      if (s.n > 0) centros[c] = { L: s.L / s.n, a: s.a / s.n, b: s.b / s.n };
    }
  }
  return centros;
}

// ---------- 3. Escolher as linhas ----------

function atribuirLinhas(cores: Lab[], paleta: Linha[]): Uint16Array {
  const celulas = new Uint16Array(cores.length);
  // Cores quase iguais dão o mesmo resultado: guardamos para não recalcular.
  const memoria = new Map<number, number>();
  for (let i = 0; i < cores.length; i++) {
    const c = cores[i];
    const chave = (Math.round(c.L * 2) * 1024 + Math.round(c.a * 2) + 512) * 1024 + Math.round(c.b * 2) + 512;
    let indice = memoria.get(chave);
    if (indice === undefined) {
      indice = 0;
      let menor = Infinity;
      for (let p = 0; p < paleta.length; p++) {
        const d = deltaE2000(c, paleta[p].lab);
        if (d < menor) {
          menor = d;
          indice = p;
        }
      }
      memoria.set(chave, indice);
    }
    celulas[i] = indice;
  }
  return celulas;
}

// ---------- 4. Limpeza ----------

const VIZINHOS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

/**
 * Troca pontos que têm poucos vizinhos da mesma cor pela cor mais comum
 * ao redor (em empate, a mais parecida).
 */
export function limparPontosSoltos(
  celulas: Uint16Array,
  largura: number,
  altura: number,
  paleta: readonly { lab: Lab }[],
  minimoIguais: number,
  passes: number,
): Uint16Array {
  let atual = celulas;
  const votos = new Int32Array(paleta.length);
  for (let p = 0; p < passes; p++) {
    const nova = atual.slice();
    let trocas = 0;
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const i = y * largura + x;
        const cor = atual[i];
        let iguais = 0;
        const vistos: number[] = [];
        for (const [dx, dy] of VIZINHOS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= largura || ny >= altura) continue;
          const v = atual[ny * largura + nx];
          if (v === cor) iguais++;
          else {
            if (votos[v] === 0) vistos.push(v);
            votos[v]++;
          }
        }
        if (iguais < minimoIguais && vistos.length > 0) {
          let melhor = vistos[0];
          for (const v of vistos) {
            if (
              votos[v] > votos[melhor] ||
              (votos[v] === votos[melhor] && deltaE2000(paleta[cor].lab, paleta[v].lab) < deltaE2000(paleta[cor].lab, paleta[melhor].lab))
            ) {
              melhor = v;
            }
          }
          nova[i] = melhor;
          trocas++;
        }
        for (const v of vistos) votos[v] = 0;
      }
    }
    atual = nova;
    if (trocas === 0) break;
  }
  return atual;
}

function contar(celulas: Uint16Array, tamanhoPaleta: number): number[] {
  const contagem = new Array<number>(tamanhoPaleta).fill(0);
  for (const c of celulas) contagem[c]++;
  return contagem;
}

/** Junta as cores com pouquíssimos pontos à cor mais parecida da paleta. */
export function juntarCoresRaras(celulas: Uint16Array, paleta: readonly { lab: Lab }[], minimoPontos: number): Uint16Array {
  const resultado = celulas.slice();
  const ativa = paleta.map(() => true);
  for (;;) {
    const contagem = contar(resultado, paleta.length);
    let rara = -1;
    for (let p = 0; p < paleta.length; p++) {
      if (!ativa[p] || contagem[p] === 0) continue;
      if (contagem[p] < minimoPontos && (rara === -1 || contagem[p] < contagem[rara])) rara = p;
    }
    const ativas = contagem.filter((n, p) => ativa[p] && n > 0).length;
    if (rara === -1 || ativas <= 1) return resultado;

    let destino = -1;
    let menor = Infinity;
    for (let p = 0; p < paleta.length; p++) {
      if (p === rara || !ativa[p] || contagem[p] === 0) continue;
      const d = deltaE2000(paleta[rara].lab, paleta[p].lab);
      if (d < menor) {
        menor = d;
        destino = p;
      }
    }
    for (let i = 0; i < resultado.length; i++) if (resultado[i] === rara) resultado[i] = destino;
    ativa[rara] = false;
  }
}

const REGRAS_LIMPEZA: Record<Limpeza, { minimoIguais: number; passes: number; fracaoRara: number; minimoRara: number }> = {
  forte: { minimoIguais: 2, passes: 2, fracaoRara: 0.005, minimoRara: 4 },
  media: { minimoIguais: 1, passes: 1, fracaoRara: 0.001, minimoRara: 3 },
  nenhuma: { minimoIguais: 0, passes: 0, fracaoRara: 0, minimoRara: 0 },
};

// ---------- Tudo junto ----------

export function validarOpcoes(o: OpcoesConversao): void {
  const inteiro = (n: number) => Number.isInteger(n);
  if (![o.largura, o.altura, o.maxCores].every(inteiro)) throw new RangeError('Os valores precisam ser números inteiros.');
  if (o.largura < 1 || o.altura < 1 || o.largura > LIMITES_GRADE.ladoMax || o.altura > LIMITES_GRADE.ladoMax) {
    throw new RangeError(`O bordado pode ter no máximo ${LIMITES_GRADE.ladoMax} pontos de cada lado.`);
  }
  if (o.maxCores < 1 || o.maxCores > LIMITES_GRADE.coresMax) {
    throw new RangeError(`O número de cores vai de 1 a ${LIMITES_GRADE.coresMax}.`);
  }
}

export function converter(
  pixels: Uint8ClampedArray,
  larguraImagem: number,
  alturaImagem: number,
  opcoes: OpcoesConversao,
  linhas: readonly Linha[] = LINHAS_DMC,
): Grafico {
  validarOpcoes(opcoes);
  const { largura, altura, maxCores, limpeza } = opcoes;

  const cores = reduzirParaGrade(pixels, larguraImagem, alturaImagem, largura, altura);
  const centros = agruparCores(cores, maxCores);

  // Cada grupo vira uma linha; grupos que caem na mesma linha se juntam.
  const escolhidas = new Map<string, Linha>();
  for (const c of centros) {
    const { linha } = linhaMaisProxima(c, linhas);
    escolhidas.set(linha.codigo, linha);
  }
  let paleta = [...escolhidas.values()];
  let celulas = atribuirLinhas(cores, paleta);

  const regra = REGRAS_LIMPEZA[limpeza];
  if (regra.passes > 0) celulas = limparPontosSoltos(celulas, largura, altura, paleta, regra.minimoIguais, regra.passes);
  const minimoRara = Math.max(regra.minimoRara, Math.round(regra.fracaoRara * celulas.length));
  if (minimoRara > 0) celulas = juntarCoresRaras(celulas, paleta, minimoRara);

  // Arruma a paleta: só as cores usadas, da mais usada para a menos usada.
  const contagem = contar(celulas, paleta.length);
  const ordem = paleta.map((_, i) => i).filter((i) => contagem[i] > 0).sort((a, b) => contagem[b] - contagem[a]);
  const novoIndice = new Uint16Array(paleta.length);
  ordem.forEach((antigo, novo) => (novoIndice[antigo] = novo));
  for (let i = 0; i < celulas.length; i++) celulas[i] = novoIndice[celulas[i]];
  paleta = ordem.map((i) => paleta[i]);

  return { largura, altura, celulas, paleta, contagem: ordem.map((i) => contagem[i]) };
}
