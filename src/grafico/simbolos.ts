// Símbolos do gráfico.
//
// Cada cor da legenda recebe um símbolo, para o gráfico poder ser lido
// também em preto e branco e por quem não distingue bem as cores.
// Os símbolos são desenhados por nós (não dependem de fonte), então ficam
// idênticos na tela e no PDF. A cor mais usada recebe o símbolo mais claro.

/** "Pincel" simples: a tela (canvas) e o PDF implementam do seu jeito. */
export interface Pincel {
  cor(cor: string): void;
  espessura(px: number): void;
  linha(x1: number, y1: number, x2: number, y2: number): void;
  circulo(cx: number, cy: number, raio: number, cheio: boolean): void;
  poligono(pontos: readonly (readonly [number, number])[], cheio: boolean): void;
  texto(texto: string, cx: number, cy: number, tamanho: number): void;
}

export interface Simbolo {
  /** Nome falado pelo leitor de tela e escrito na legenda. */
  nome: string;
  /** Desenha o símbolo dentro do quadrado (x, y, lado s). */
  desenhar(p: Pincel, x: number, y: number, s: number): void;
}

type Ponto = readonly [number, number];
const em = (x: number, y: number, s: number, pts: readonly Ponto[]) => pts.map(([a, b]) => [x + a * s, y + b * s] as const);

function forma(nome: string, pts: readonly Ponto[], cheio: boolean): Simbolo {
  return {
    nome,
    desenhar: (p, x, y, s) => {
      p.espessura(Math.max(1, s * 0.09));
      p.poligono(em(x, y, s, pts), cheio);
    },
  };
}

function tracos(nome: string, linhas: readonly (readonly [number, number, number, number])[], grossura = 0.12): Simbolo {
  return {
    nome,
    desenhar: (p, x, y, s) => {
      p.espessura(Math.max(1, s * grossura));
      for (const [a, b, c, d] of linhas) p.linha(x + a * s, y + b * s, x + c * s, y + d * s);
    },
  };
}

function letra(caractere: string, nome: string): Simbolo {
  return { nome, desenhar: (p, x, y, s) => p.texto(caractere, x + s / 2, y + s / 2, s * 0.72) };
}

const TRIANGULO: Ponto[] = [[0.5, 0.17], [0.84, 0.8], [0.16, 0.8]];
const TRIANGULO_BAIXO: Ponto[] = [[0.16, 0.2], [0.84, 0.2], [0.5, 0.83]];
const QUADRADO: Ponto[] = [[0.22, 0.22], [0.78, 0.22], [0.78, 0.78], [0.22, 0.78]];
const LOSANGO: Ponto[] = [[0.5, 0.13], [0.87, 0.5], [0.5, 0.87], [0.13, 0.5]];
const ESTRELA: Ponto[] = Array.from({ length: 10 }, (_, i) => {
  const raio = i % 2 === 0 ? 0.4 : 0.17;
  const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
  return [0.5 + raio * Math.cos(angulo), 0.53 + raio * Math.sin(angulo)] as const;
});

export const SIMBOLOS: readonly Simbolo[] = [
  {
    nome: 'círculo cheio',
    desenhar: (p, x, y, s) => p.circulo(x + s / 2, y + s / 2, s * 0.3, true),
  },
  forma('quadrado cheio', QUADRADO, true),
  forma('triângulo cheio', TRIANGULO, true),
  tracos('xis', [[0.24, 0.24, 0.76, 0.76], [0.76, 0.24, 0.24, 0.76]]),
  {
    nome: 'círculo vazio',
    desenhar: (p, x, y, s) => {
      p.espessura(Math.max(1, s * 0.09));
      p.circulo(x + s / 2, y + s / 2, s * 0.28, false);
    },
  },
  forma('quadrado vazio', QUADRADO, false),
  forma('triângulo vazio', TRIANGULO, false),
  tracos('cruz', [[0.5, 0.18, 0.5, 0.82], [0.18, 0.5, 0.82, 0.5]]),
  forma('losango cheio', LOSANGO, true),
  forma('losango vazio', LOSANGO, false),
  forma('triângulo para baixo cheio', TRIANGULO_BAIXO, true),
  forma('triângulo para baixo vazio', TRIANGULO_BAIXO, false),
  forma('estrela', ESTRELA, true),
  tracos('barra', [[0.24, 0.8, 0.76, 0.2]], 0.14),
  tracos('barra invertida', [[0.24, 0.2, 0.76, 0.8]], 0.14),
  tracos('traço deitado', [[0.18, 0.5, 0.82, 0.5]], 0.18),
  tracos('traço em pé', [[0.5, 0.18, 0.5, 0.82]], 0.18),
  {
    nome: 'círculo meio cheio',
    desenhar: (p, x, y, s) => {
      p.espessura(Math.max(1, s * 0.08));
      p.circulo(x + s / 2, y + s / 2, s * 0.29, false);
      const meia = Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI / 2 + (i * Math.PI) / 12;
        return [0.5 + 0.29 * Math.cos(a), 0.5 + 0.29 * Math.sin(a)] as const;
      });
      p.poligono(em(x, y, s, meia), true);
    },
  },
  {
    nome: 'quadrado meio cheio',
    desenhar: (p, x, y, s) => {
      p.espessura(Math.max(1, s * 0.08));
      p.poligono(em(x, y, s, QUADRADO), false);
      p.poligono(em(x, y, s, [[0.22, 0.22], [0.5, 0.22], [0.5, 0.78], [0.22, 0.78]]), true);
    },
  },
  {
    nome: 'círculo com ponto',
    desenhar: (p, x, y, s) => {
      p.espessura(Math.max(1, s * 0.08));
      p.circulo(x + s / 2, y + s / 2, s * 0.3, false);
      p.circulo(x + s / 2, y + s / 2, s * 0.1, true);
    },
  },
  // Letras e números escolhidos para não se confundirem entre si
  // (sem O/0, I/1, B/8, S/5, Z/2, G/6, e sem X, que já é um desenho).
  ...['A', 'C', 'E', 'F', 'H', 'K', 'M', 'N', 'P', 'R', 'T', 'U', 'V', 'Y', 'L', 'J'].map((c) => letra(c, `letra ${c}`)),
  ...['3', '4', '7', '9'].map((c) => letra(c, `número ${c}`)),
];

/** Símbolo da cor que está na posição "indice" da legenda. */
export function simboloDa(indice: number): Simbolo {
  return SIMBOLOS[indice % SIMBOLOS.length];
}

/** Preto ou branco: o que aparece melhor sobre o fundo dessa cor (L* do CIELAB). */
export function corDoSimbolo(luminosidade: number): '#000000' | '#FFFFFF' {
  return luminosidade > 55 ? '#000000' : '#FFFFFF';
}
