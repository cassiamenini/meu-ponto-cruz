// Ajustes da imagem: girar, recortar, brilho e contraste.
// As funções de cálculo não dependem da tela, para poderem ser testadas.

export type Rotacao = 0 | 90 | 180 | 270;

/**
 * Área recortada, em frações da imagem já girada (0 = início, 1 = fim).
 * Ex.: { x: 0.25, y: 0, largura: 0.5, altura: 1 } é a faixa central.
 */
export interface Recorte {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Ajustes {
  rotacao: Rotacao;
  recorte: Recorte;
  /** De -50 (mais escuro) a +50 (mais claro). */
  brilho: number;
  /** De -50 (menos contraste) a +50 (mais contraste). */
  contraste: number;
}

export const RECORTE_INTEIRO: Recorte = { x: 0, y: 0, largura: 1, altura: 1 };

export function ajustesIniciais(): Ajustes {
  return { rotacao: 0, recorte: { ...RECORTE_INTEIRO }, brilho: 0, contraste: 0 };
}

/** Gira o recorte junto com a imagem, para a pessoa não perder o que escolheu. */
export function girarRecorte(r: Recorte, sentido: 'direita' | 'esquerda'): Recorte {
  if (sentido === 'direita') {
    return { x: 1 - (r.y + r.altura), y: r.x, largura: r.altura, altura: r.largura };
  }
  return { x: r.y, y: 1 - (r.x + r.largura), largura: r.altura, altura: r.largura };
}

export function proximaRotacao(atual: Rotacao, sentido: 'direita' | 'esquerda'): Rotacao {
  return (((atual + (sentido === 'direita' ? 90 : 270)) % 360) as Rotacao);
}

/** Mantém o recorte dentro da imagem e com um tamanho mínimo. */
export function limitarRecorte(r: Recorte, minimo = 0.05): Recorte {
  const largura = Math.min(1, Math.max(minimo, r.largura));
  const altura = Math.min(1, Math.max(minimo, r.altura));
  return {
    largura,
    altura,
    x: Math.min(1 - largura, Math.max(0, r.x)),
    y: Math.min(1 - altura, Math.max(0, r.y)),
  };
}

export type ModoArraste = 'mover' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Calcula o novo recorte quando a pessoa arrasta o quadro (modo "mover")
 * ou um dos cantos (nw = cima/esquerda, ne = cima/direita,
 * sw = baixo/esquerda, se = baixo/direita). dx e dy são frações da imagem.
 */
export function arrastarRecorte(r: Recorte, modo: ModoArraste, dx: number, dy: number, minimo = 0.05): Recorte {
  if (modo === 'mover') return limitarRecorte({ ...r, x: r.x + dx, y: r.y + dy }, minimo);

  let esquerda = r.x;
  let topo = r.y;
  let direita = r.x + r.largura;
  let base = r.y + r.altura;

  if (modo === 'nw' || modo === 'sw') esquerda = Math.min(direita - minimo, Math.max(0, esquerda + dx));
  if (modo === 'ne' || modo === 'se') direita = Math.max(esquerda + minimo, Math.min(1, direita + dx));
  if (modo === 'nw' || modo === 'ne') topo = Math.min(base - minimo, Math.max(0, topo + dy));
  if (modo === 'sw' || modo === 'se') base = Math.max(topo + minimo, Math.min(1, base + dy));

  return { x: esquerda, y: topo, largura: direita - esquerda, altura: base - topo };
}

/** Tabela de 256 valores: para cada tom original, o tom ajustado. */
export function tabelaBrilhoContraste(brilho: number, contraste: number): Uint8ClampedArray {
  const fator = (100 + contraste) / 100; // 0,5 a 1,5
  const deslocamento = brilho * 1.5; // até ±75 tons
  const tabela = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    tabela[v] = (v - 128) * fator + 128 + deslocamento;
  }
  return tabela;
}

/** Aplica brilho e contraste nos pixels (RGBA), sem mexer na transparência. */
export function aplicarBrilhoContraste(pixels: Uint8ClampedArray, brilho: number, contraste: number): void {
  if (brilho === 0 && contraste === 0) return;
  const t = tabelaBrilhoContraste(brilho, contraste);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = t[pixels[i]];
    pixels[i + 1] = t[pixels[i + 1]];
    pixels[i + 2] = t[pixels[i + 2]];
  }
}

/** Devolve uma cópia girada da imagem. */
export function girarImagem(origem: HTMLCanvasElement, rotacao: Rotacao): HTMLCanvasElement {
  const deitada = rotacao === 90 || rotacao === 270;
  const destino = document.createElement('canvas');
  destino.width = deitada ? origem.height : origem.width;
  destino.height = deitada ? origem.width : origem.height;
  const ctx = destino.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.translate(destino.width / 2, destino.height / 2);
  ctx.rotate((rotacao * Math.PI) / 180);
  ctx.drawImage(origem, -origem.width / 2, -origem.height / 2);
  return destino;
}

/**
 * Junta todos os ajustes e devolve a imagem que vai virar bordado.
 * Recebe a imagem de trabalho (sem giro).
 */
export function gerarImagemFinal(origem: HTMLCanvasElement, ajustes: Ajustes): HTMLCanvasElement {
  const girada = girarImagem(origem, ajustes.rotacao);
  const r = ajustes.recorte;
  const x = Math.round(r.x * girada.width);
  const y = Math.round(r.y * girada.height);
  const largura = Math.max(1, Math.round(r.largura * girada.width));
  const altura = Math.max(1, Math.round(r.altura * girada.height));

  const final = document.createElement('canvas');
  final.width = largura;
  final.height = altura;
  const ctx = final.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(girada, x, y, largura, altura, 0, 0, largura, altura);

  if (ajustes.brilho !== 0 || ajustes.contraste !== 0) {
    const dados = ctx.getImageData(0, 0, largura, altura);
    aplicarBrilhoContraste(dados.data, ajustes.brilho, ajustes.contraste);
    ctx.putImageData(dados, 0, 0);
  }
  return final;
}
