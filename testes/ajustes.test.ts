import { describe, expect, it } from 'vitest';
import {
  aplicarBrilhoContraste,
  arrastarRecorte,
  girarRecorte,
  limitarRecorte,
  proximaRotacao,
  type Recorte,
} from '../src/imagem/ajustes';

function perto(r: Recorte, esperado: Recorte): void {
  expect(r.x).toBeCloseTo(esperado.x);
  expect(r.y).toBeCloseTo(esperado.y);
  expect(r.largura).toBeCloseTo(esperado.largura);
  expect(r.altura).toBeCloseTo(esperado.altura);
}

describe('girar', () => {
  it('dá a volta completa', () => {
    expect(proximaRotacao(0, 'direita')).toBe(90);
    expect(proximaRotacao(270, 'direita')).toBe(0);
    expect(proximaRotacao(0, 'esquerda')).toBe(270);
  });

  it('o recorte acompanha o giro para a direita', () => {
    // canto superior esquerdo vai para o canto superior direito
    perto(girarRecorte({ x: 0, y: 0, largura: 0.5, altura: 0.25 }, 'direita'), {
      x: 0.75,
      y: 0,
      largura: 0.25,
      altura: 0.5,
    });
  });

  it('girar para a direita e depois para a esquerda volta ao começo', () => {
    const r = { x: 0.1, y: 0.2, largura: 0.3, altura: 0.4 };
    perto(girarRecorte(girarRecorte(r, 'direita'), 'esquerda'), r);
  });

  it('quatro giros voltam ao começo', () => {
    const r = { x: 0.1, y: 0.2, largura: 0.3, altura: 0.4 };
    let g = r;
    for (let i = 0; i < 4; i++) g = girarRecorte(g, 'direita');
    perto(g, r);
  });
});

describe('recorte', () => {
  it('não deixa o quadro sair da imagem', () => {
    perto(limitarRecorte({ x: 0.8, y: -0.2, largura: 0.5, altura: 0.5 }), { x: 0.5, y: 0, largura: 0.5, altura: 0.5 });
  });

  it('mover arrasta o quadro sem mudar o tamanho', () => {
    perto(arrastarRecorte({ x: 0.2, y: 0.2, largura: 0.5, altura: 0.5 }, 'mover', 0.1, -0.1), {
      x: 0.3,
      y: 0.1,
      largura: 0.5,
      altura: 0.5,
    });
  });

  it('puxar o canto de baixo à direita aumenta o quadro', () => {
    perto(arrastarRecorte({ x: 0.2, y: 0.2, largura: 0.5, altura: 0.5 }, 'se', 0.1, 0.1), {
      x: 0.2,
      y: 0.2,
      largura: 0.6,
      altura: 0.6,
    });
  });

  it('puxar o canto de cima à esquerda não passa do canto oposto', () => {
    const r = arrastarRecorte({ x: 0.2, y: 0.2, largura: 0.5, altura: 0.5 }, 'nw', 0.9, 0.9);
    expect(r.largura).toBeCloseTo(0.05);
    expect(r.altura).toBeCloseTo(0.05);
    expect(r.x + r.largura).toBeCloseTo(0.7);
  });

  it('puxar um canto para fora da imagem para na borda', () => {
    perto(arrastarRecorte({ x: 0.2, y: 0.2, largura: 0.5, altura: 0.5 }, 'nw', -1, -1), {
      x: 0,
      y: 0,
      largura: 0.7,
      altura: 0.7,
    });
  });
});

describe('brilho e contraste', () => {
  const pixel = () => new Uint8ClampedArray([100, 128, 200, 255]);

  it('sem ajuste, nada muda', () => {
    const p = pixel();
    aplicarBrilhoContraste(p, 0, 0);
    expect([...p]).toEqual([100, 128, 200, 255]);
  });

  it('mais brilho clareia e não mexe na transparência', () => {
    const p = pixel();
    aplicarBrilhoContraste(p, 20, 0);
    expect([...p]).toEqual([130, 158, 230, 255]);
  });

  it('mais contraste afasta os tons do meio', () => {
    const p = pixel();
    aplicarBrilhoContraste(p, 0, 50);
    expect(p[0]).toBe(86); // escuro fica mais escuro
    expect(p[1]).toBe(128); // o meio não muda
    expect(p[2]).toBe(236); // claro fica mais claro
  });

  it('os valores nunca passam de 0 a 255', () => {
    const p = new Uint8ClampedArray([0, 255, 10, 255]);
    aplicarBrilhoContraste(p, 50, 50);
    expect(p[1]).toBe(255);
    aplicarBrilhoContraste(p, -50, 50);
    expect(p[0]).toBe(0);
  });
});
