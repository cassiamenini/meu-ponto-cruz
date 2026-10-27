import { describe, expect, it } from 'vitest';
import { corDoSimbolo, SIMBOLOS, simboloDa, type Pincel } from '../src/grafico/simbolos';
import { clarear, faixaVisivel, MARGEM_REGUA, NIVEIS_ZOOM, pontoNaPosicao, zoomInicial, CELULA_MIN_SIMBOLO } from '../src/grafico/desenhar';
import { LIMITES_GRADE } from '../src/processamento/converter';

/** Pincel que só anota o que foi pedido, para conferir os desenhos. */
function pincelDeTeste() {
  const chamadas: string[] = [];
  const p: Pincel = {
    cor: () => {},
    espessura: () => {},
    linha: (...a) => chamadas.push(`linha ${a.map((n) => n.toFixed(2)).join(',')}`),
    circulo: (cx, cy, r, cheio) => chamadas.push(`circulo ${cx.toFixed(2)},${cy.toFixed(2)},${r.toFixed(2)},${cheio}`),
    poligono: (pts, cheio) => chamadas.push(`poligono ${pts.map(([x, y]) => `${x.toFixed(2)}:${y.toFixed(2)}`).join(' ')} ${cheio}`),
    texto: (t, cx, cy, tam) => chamadas.push(`texto ${t} ${cx.toFixed(2)},${cy.toFixed(2)},${tam.toFixed(2)}`),
  };
  return { p, chamadas };
}

describe('símbolos', () => {
  it('há um símbolo para cada cor possível', () => {
    expect(SIMBOLOS.length).toBeGreaterThanOrEqual(LIMITES_GRADE.coresMax);
  });

  it('todos têm nomes diferentes', () => {
    const nomes = SIMBOLOS.map((s) => s.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('todos têm desenhos diferentes', () => {
    const desenhos = SIMBOLOS.map((s) => {
      const { p, chamadas } = pincelDeTeste();
      s.desenhar(p, 0, 0, 100);
      return chamadas.join('|');
    });
    expect(new Set(desenhos).size).toBe(desenhos.length);
  });

  it('todo desenho fica dentro do quadradinho', () => {
    for (const s of SIMBOLOS) {
      const { p, chamadas } = pincelDeTeste();
      s.desenhar(p, 0, 0, 100);
      const numeros = chamadas.join(' ').match(/-?\d+\.\d+/g)!.map(Number);
      for (const n of numeros) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });

  it('a mesma posição da legenda dá sempre o mesmo símbolo', () => {
    expect(simboloDa(0).nome).toBe('círculo cheio');
    expect(simboloDa(3)).toBe(SIMBOLOS[3]);
  });

  it('símbolo preto em cor clara e branco em cor escura', () => {
    expect(corDoSimbolo(90)).toBe('#000000');
    expect(corDoSimbolo(20)).toBe('#FFFFFF');
  });

  it('não usa letras e números que se confundem', () => {
    const textos = SIMBOLOS.map((s) => {
      const { p, chamadas } = pincelDeTeste();
      s.desenhar(p, 0, 0, 10);
      return chamadas.find((c) => c.startsWith('texto'))?.split(' ')[1];
    }).filter(Boolean);
    for (const proibido of ['O', '0', 'I', '1', 'l', 'B', '8', 'S', '5', 'Z', '2', 'G', '6', 'X']) {
      expect(textos).not.toContain(proibido);
    }
  });
});

describe('contas do desenho', () => {
  it('zoom inicial nunca esconde os símbolos', () => {
    expect(NIVEIS_ZOOM[zoomInicial(250, 600)]).toBe(CELULA_MIN_SIMBOLO);
  });

  it('zoom inicial aumenta quando o gráfico é pequeno', () => {
    expect(NIVEIS_ZOOM[zoomInicial(20, 800)]).toBe(30);
  });

  it('faixa visível não passa das bordas', () => {
    expect(faixaVisivel(0, 300, 10, 100)).toEqual([0, 27]);
    expect(faixaVisivel(950, 300, 10, 100)).toEqual([95, 100]);
  });

  it('acha o ponto embaixo do dedo, levando a rolagem em conta', () => {
    expect(pontoNaPosicao(MARGEM_REGUA + 5, MARGEM_REGUA + 25, 0, 0, 10, 50, 50)).toEqual({ coluna: 0, linha: 2 });
    expect(pontoNaPosicao(MARGEM_REGUA + 5, MARGEM_REGUA + 5, 100, 200, 10, 50, 50)).toEqual({ coluna: 10, linha: 20 });
  });

  it('tocar na régua ou fora do gráfico não escolhe ponto', () => {
    expect(pontoNaPosicao(5, 100, 0, 0, 10, 50, 50)).toBeNull();
    expect(pontoNaPosicao(MARGEM_REGUA + 600, MARGEM_REGUA, 0, 0, 10, 50, 50)).toBeNull();
  });

  it('clarear mistura com branco', () => {
    expect(clarear([0, 0, 0], 0.5)).toBe('rgb(128, 128, 128)');
    expect(clarear([255, 0, 0], 1)).toBe('rgb(255, 255, 255)');
  });
});
