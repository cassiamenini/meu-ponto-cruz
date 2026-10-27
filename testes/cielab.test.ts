import { describe, expect, it } from 'vitest';
import { deltaE2000, hexParaRgb, rgbParaHex, rgbParaLab, type Lab } from '../src/cores/cielab';

const lab = (L: number, a: number, b: number): Lab => ({ L, a, b });

describe('rgbParaLab', () => {
  it('branco puro é L = 100, sem cor', () => {
    const c = rgbParaLab([255, 255, 255]);
    expect(c.L).toBeCloseTo(100, 2);
    expect(c.a).toBeCloseTo(0, 2);
    expect(c.b).toBeCloseTo(0, 2);
  });

  it('preto é L = 0', () => {
    expect(rgbParaLab([0, 0, 0]).L).toBeCloseTo(0, 5);
  });

  it('vermelho puro bate com o valor de referência (D65)', () => {
    const c = rgbParaLab([255, 0, 0]);
    expect(c.L).toBeCloseTo(53.24, 1);
    expect(c.a).toBeCloseTo(80.09, 1);
    expect(c.b).toBeCloseTo(67.2, 1);
  });
});

describe('deltaE2000 — dados de teste publicados por Sharma, Wu e Dalal (2005)', () => {
  const casos: [Lab, Lab, number][] = [
    [lab(50, 2.6772, -79.7751), lab(50, 0, -82.7485), 2.0425],
    [lab(50, 3.1571, -77.2803), lab(50, 0, -82.7485), 2.8615],
    [lab(50, 2.8361, -74.02), lab(50, 0, -82.7485), 3.4412],
    [lab(50, -1.3802, -84.2814), lab(50, 0, -82.7485), 1.0],
    [lab(50, 0, 0), lab(50, -1, 2), 2.3669],
    [lab(50, -1, 2), lab(50, 0, 0), 2.3669],
    [lab(50, 2.49, -0.001), lab(50, -2.49, 0.0009), 7.1792],
    [lab(50, 2.5, 0), lab(73, 25, -18), 27.1492],
    [lab(50, 2.5, 0), lab(61, -5, 29), 22.8977],
    [lab(50, 2.5, 0), lab(56, -27, -3), 31.903],
    [lab(50, 2.5, 0), lab(58, 24, 15), 19.4535],
    [lab(50, 2.5, 0), lab(50, 3.1736, 0.5854), 1.0],
    [lab(60.2574, -34.0099, 36.2677), lab(60.4626, -34.1751, 39.4387), 1.2644],
    [lab(63.0109, -31.0961, -5.8663), lab(62.8187, -29.7946, -4.0864), 1.263],
    [lab(2.0776, 0.0795, -1.135), lab(0.9033, -0.0636, -0.5514), 0.9082],
  ];

  it.each(casos)('par %#', (c1, c2, esperado) => {
    expect(deltaE2000(c1, c2)).toBeCloseTo(esperado, 4);
  });

  it('cor igual tem diferença zero', () => {
    expect(deltaE2000(lab(40, 10, -20), lab(40, 10, -20))).toBe(0);
  });
});

describe('hex', () => {
  it('ida e volta', () => {
    expect(rgbParaHex(hexParaRgb('#C72B3B'))).toBe('#C72B3B');
    expect(hexParaRgb('#000000')).toEqual([0, 0, 0]);
  });
});
