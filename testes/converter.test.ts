import { describe, expect, it } from 'vitest';
import {
  agruparCores,
  converter,
  juntarCoresRaras,
  limparPontosSoltos,
  reduzirParaGrade,
  type OpcoesConversao,
} from '../src/processamento/converter';
import { buscarLinha } from '../src/catalogo/dmc';
import { rgbParaLab, type Rgb } from '../src/cores/cielab';

/** Cria os pixels de uma imagem pintando cada pixel com a função dada. */
function imagem(largura: number, altura: number, cor: (x: number, y: number) => Rgb | [number, number, number, number]) {
  const p = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const c = cor(x, y);
      p.set([c[0], c[1], c[2], c.length === 4 ? c[3] : 255], (y * largura + x) * 4);
    }
  }
  return p;
}

const opcoes = (o: Partial<OpcoesConversao> = {}): OpcoesConversao => ({
  largura: 20,
  altura: 20,
  maxCores: 10,
  limpeza: 'media',
  ...o,
});

const PRETO = buscarLinha('310')!.rgb;
const VERMELHO = buscarLinha('321')!.rgb;
const AZUL = buscarLinha('798')!.rgb;

describe('reduzirParaGrade', () => {
  it('faz a média de cada pedaço da imagem', () => {
    // 4 × 2 pixels: metade esquerda preta, direita branca → 2 × 1 pontos
    const p = imagem(4, 2, (x) => (x < 2 ? [0, 0, 0] : [255, 255, 255]));
    const [esq, dir] = reduzirParaGrade(p, 4, 2, 2, 1);
    expect(esq.L).toBeCloseTo(0, 3);
    expect(dir.L).toBeCloseTo(100, 3);
  });

  it('mistura preto e branco como a luz real (cinza médio, não escuro)', () => {
    const p = imagem(2, 1, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
    const [meio] = reduzirParaGrade(p, 2, 1, 1, 1);
    // 50% de luz = L* ≈ 76 (a média "ingênua" de RGB daria L* ≈ 54)
    expect(meio.L).toBeCloseTo(76.07, 1);
  });

  it('trata partes transparentes como o tecido branco', () => {
    const p = imagem(1, 1, () => [0, 0, 0, 0]);
    expect(reduzirParaGrade(p, 1, 1, 1, 1)[0].L).toBeCloseTo(100, 3);
  });
});

describe('agruparCores', () => {
  it('não inventa grupos quando há poucas cores diferentes', () => {
    const cores = [...Array(50)].map((_, i) => rgbParaLab(i % 2 ? [255, 0, 0] : [0, 0, 255]));
    expect(agruparCores(cores, 10)).toHaveLength(2);
  });

  it('dá sempre o mesmo resultado para a mesma imagem', () => {
    const cores = [...Array(500)].map((_, i) => rgbParaLab([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256]));
    expect(agruparCores(cores, 8)).toEqual(agruparCores(cores, 8));
  });
});

describe('limpeza', () => {
  const paleta = [{ lab: rgbParaLab([0, 0, 0]) }, { lab: rgbParaLab([255, 0, 0]) }];

  it('ponto solto no meio de outra cor é trocado', () => {
    const c = new Uint16Array(25); // 5 × 5 tudo cor 0
    c[12] = 1; // um ponto vermelho no centro
    expect([...limparPontosSoltos(c, 5, 5, paleta, 1, 1)].every((v) => v === 0)).toBe(true);
  });

  it('uma linha fina continua de pé com limpeza média', () => {
    const c = new Uint16Array(25);
    for (let x = 0; x < 5; x++) c[10 + x] = 1; // linha horizontal no meio
    const r = limparPontosSoltos(c, 5, 5, paleta, 1, 1);
    expect([...r.slice(10, 15)]).toEqual([1, 1, 1, 1, 1]);
  });

  it('cor com pouquíssimos pontos se junta à mais parecida', () => {
    const tres = [{ lab: rgbParaLab([0, 0, 0]) }, { lab: rgbParaLab([255, 255, 255]) }, { lab: rgbParaLab([30, 30, 30]) }];
    const c = new Uint16Array(100);
    for (let i = 50; i < 100; i++) c[i] = 1;
    c[0] = 2; // um único ponto quase preto
    const r = juntarCoresRaras(c, tres, 3);
    expect(r[0]).toBe(0);
    expect(r.filter((v) => v === 1)).toHaveLength(50);
  });
});

describe('converter', () => {
  it('gera exatamente a largura e a altura pedidas', () => {
    const p = imagem(300, 200, (x, y) => [x % 256, y % 256, 128]);
    const g = converter(p, 300, 200, opcoes({ largura: 45, altura: 30 }));
    expect(g.largura).toBe(45);
    expect(g.altura).toBe(30);
    expect(g.celulas).toHaveLength(45 * 30);
  });

  it('nunca usa mais cores do que o pedido', () => {
    const p = imagem(120, 120, (x, y) => [(x * 2) % 256, (y * 2) % 256, ((x + y) * 3) % 256]);
    for (const maxCores of [2, 5, 10, 25]) {
      const g = converter(p, 120, 120, opcoes({ largura: 60, altura: 60, maxCores, limpeza: 'nenhuma' }));
      expect(g.paleta.length).toBeLessThanOrEqual(maxCores);
      expect(g.paleta.length).toBeGreaterThan(0);
    }
  });

  it('cores iguais às de linhas DMC viram exatamente essas linhas', () => {
    // três faixas verticais: preto, vermelho e azul
    const p = imagem(90, 30, (x) => (x < 30 ? PRETO : x < 60 ? VERMELHO : AZUL));
    const g = converter(p, 90, 30, opcoes({ largura: 30, altura: 10, maxCores: 5 }));
    expect(g.paleta.map((l) => l.codigo).sort()).toEqual(['310', '321', '798']);
    expect(g.contagem).toEqual([100, 100, 100]);
    // o ponto do canto esquerdo é preto; o do canto direito é azul
    expect(g.paleta[g.celulas[0]].codigo).toBe('310');
    expect(g.paleta[g.celulas[29]].codigo).toBe('798');
  });

  it('a legenda bate com o gráfico: contagem e índices coerentes', () => {
    const p = imagem(100, 80, (x, y) => [(x * 5) % 256, (y * 3) % 256, 90]);
    const g = converter(p, 100, 80, opcoes({ largura: 50, altura: 40, maxCores: 12 }));
    const contagem = new Array(g.paleta.length).fill(0);
    for (const c of g.celulas) contagem[c]++;
    expect(contagem).toEqual(g.contagem);
    expect(g.contagem.reduce((s, n) => s + n, 0)).toBe(50 * 40);
    // em ordem da mais usada para a menos usada, sem repetir linha
    expect([...g.contagem].sort((a, b) => b - a)).toEqual(g.contagem);
    expect(new Set(g.paleta.map((l) => l.codigo)).size).toBe(g.paleta.length);
  });

  it('limpeza forte remove o ruído de uma imagem lisa', () => {
    // fundo azul com "sujeira" vermelha espalhada em pontos isolados
    const p = imagem(40, 40, (x, y) => ((x * 7 + y * 13) % 29 === 0 ? VERMELHO : AZUL));
    const forte = converter(p, 40, 40, opcoes({ largura: 40, altura: 40, maxCores: 5, limpeza: 'forte' }));
    const nenhuma = converter(p, 40, 40, opcoes({ largura: 40, altura: 40, maxCores: 5, limpeza: 'nenhuma' }));
    expect(nenhuma.paleta.length).toBe(2);
    expect(forte.paleta.map((l) => l.codigo)).toEqual(['798']);
  });

  it('recusa tamanhos fora dos limites', () => {
    const p = imagem(10, 10, () => [0, 0, 0]);
    expect(() => converter(p, 10, 10, opcoes({ largura: 251 }))).toThrow(RangeError);
    expect(() => converter(p, 10, 10, opcoes({ maxCores: 41 }))).toThrow(RangeError);
    expect(() => converter(p, 10, 10, opcoes({ largura: 10.5 }))).toThrow(RangeError);
  });

  it('o maior gráfico (250 × 250, 40 cores) termina em tempo razoável', () => {
    const p = imagem(2000, 1500, (x, y) => [
      (x * 0.12 + Math.sin(y / 40) * 60 + 60) % 256,
      (y * 0.17 + Math.cos(x / 55) * 50 + 40) % 256,
      ((x + y) * 0.07) % 256,
    ]);
    const inicio = performance.now();
    const g = converter(p, 2000, 1500, opcoes({ largura: 250, altura: 188, maxCores: 40 }));
    const ms = performance.now() - inicio;
    expect(g.celulas).toHaveLength(250 * 188);
    console.log(`250 × 188 pontos, ${g.paleta.length} cores: ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(8000);
  }, 20000);
});
