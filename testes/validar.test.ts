import { describe, expect, it } from 'vitest';
import { detectarTipo, lerDimensoes, validarBytes } from '../src/seguranca/validar';

// Monta cabeçalhos mínimos de cada formato, só com o necessário para o teste.

function png(largura: number, altura: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  b.set([0, 0, 0, 13], 8);
  b.set([...'IHDR'].map((c) => c.charCodeAt(0)), 12);
  const v = new DataView(b.buffer);
  v.setUint32(16, largura);
  v.setUint32(20, altura);
  return b;
}

function jpeg(largura: number, altura: number, comExif = true): Uint8Array {
  const partes: number[] = [0xff, 0xd8];
  if (comExif) {
    // segmento APP1 (onde ficam os dados da câmera) antes do tamanho
    partes.push(0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00);
  }
  partes.push(0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 0xff, largura >> 8, largura & 0xff, 0x03);
  partes.push(...new Array(9).fill(0));
  return new Uint8Array(partes);
}

function riff(bloco: string, dados: number[]): Uint8Array {
  const b = new Uint8Array(30 + 4);
  b.set([...'RIFF'].map((c) => c.charCodeAt(0)));
  b.set([...'WEBP'].map((c) => c.charCodeAt(0)), 8);
  b.set([...bloco].map((c) => c.charCodeAt(0)), 12);
  b.set(dados, 20);
  return b;
}

function webpVp8x(largura: number, altura: number): Uint8Array {
  const l = largura - 1;
  const a = altura - 1;
  return riff('VP8X', [0, 0, 0, 0, l & 0xff, (l >> 8) & 0xff, (l >> 16) & 0xff, a & 0xff, (a >> 8) & 0xff, (a >> 16) & 0xff]);
}

function webpVp8(largura: number, altura: number): Uint8Array {
  return riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, largura & 0xff, largura >> 8, altura & 0xff, altura >> 8]);
}

function webpVp8l(largura: number, altura: number): Uint8Array {
  const l = largura - 1;
  const a = altura - 1;
  return riff('VP8L', [
    0x2f,
    l & 0xff,
    ((l >> 8) & 0x3f) | ((a & 0x03) << 6),
    (a >> 2) & 0xff,
    (a >> 10) & 0x0f,
  ]);
}

const texto = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe('detectarTipo', () => {
  it('reconhece JPG, PNG e WebP pelos primeiros bytes', () => {
    expect(detectarTipo(jpeg(10, 10))).toBe('jpeg');
    expect(detectarTipo(png(10, 10))).toBe('png');
    expect(detectarTipo(webpVp8x(10, 10))).toBe('webp');
  });

  it('não se deixa enganar por um arquivo de texto', () => {
    expect(detectarTipo(texto('<html><script>alert(1)</script>'))).toBeNull();
  });
});

describe('lerDimensoes', () => {
  it('lê o tamanho de um PNG', () => {
    expect(lerDimensoes(png(640, 480), 'png')).toEqual({ largura: 640, altura: 480 });
  });

  it('lê o tamanho de um JPG, mesmo com dados da câmera antes', () => {
    expect(lerDimensoes(jpeg(4032, 3024), 'jpeg')).toEqual({ largura: 4032, altura: 3024 });
    expect(lerDimensoes(jpeg(300, 200, false), 'jpeg')).toEqual({ largura: 300, altura: 200 });
  });

  it('lê o tamanho dos três tipos de WebP', () => {
    expect(lerDimensoes(webpVp8x(1920, 1080), 'webp')).toEqual({ largura: 1920, altura: 1080 });
    expect(lerDimensoes(webpVp8(800, 600), 'webp')).toEqual({ largura: 800, altura: 600 });
    expect(lerDimensoes(webpVp8l(1000, 750), 'webp')).toEqual({ largura: 1000, altura: 750 });
  });

  it('desiste de um JPG sem a informação de tamanho', () => {
    expect(lerDimensoes(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]), 'jpeg')).toBeNull();
  });
});

describe('validarBytes', () => {
  it('aceita uma foto comum de celular', () => {
    const r = validarBytes(jpeg(4032, 3024));
    expect(r).toEqual({ ok: true, info: { tipo: 'jpeg', largura: 4032, altura: 3024 } });
  });

  it('recusa "imagem-bomba" (pixels demais)', () => {
    const r = validarBytes(png(10000, 10000));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toMatch(/grande demais/);
  });

  it('recusa lado maior que o limite', () => {
    expect(validarBytes(png(20000, 100)).ok).toBe(false);
  });

  it('recusa imagem pequena demais', () => {
    const r = validarBytes(png(4, 4));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toMatch(/pequena demais/);
  });

  it('explica quando a foto é HEIC de celular', () => {
    const heic = new Uint8Array([0, 0, 0, 24, ...texto('ftypheic'), 0, 0, 0, 0]);
    const r = validarBytes(heic);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toMatch(/HEIC/);
  });

  it('recusa arquivo que não é imagem', () => {
    const r = validarBytes(texto('%PDF-1.7 qualquer coisa'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toMatch(/JPG, PNG ou WebP/);
  });

  it('recusa imagem com tamanho zero no cabeçalho', () => {
    expect(validarBytes(png(0, 100)).ok).toBe(false);
  });
});
