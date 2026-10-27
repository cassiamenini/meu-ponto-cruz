import { describe, expect, it } from 'vitest';
import {
  Historico,
  linhasParecidas,
  pintar,
  pontosNoCaminho,
  procurarLinhas,
  recontar,
  removerCoresSemPontos,
  trocarCor,
} from '../src/grafico/edicao';
import { buscarLinha, LINHAS_DMC } from '../src/catalogo/dmc';
import { SEM_PONTO, type Grafico } from '../src/processamento/converter';

const L = (c: string) => buscarLinha(c)!;

/** 3 × 2: preto, vermelho, azul / vermelho, sem ponto, preto */
function grafico(): Grafico {
  const celulas = new Uint16Array([0, 1, 2, 1, SEM_PONTO, 0]);
  return {
    largura: 3,
    altura: 2,
    celulas,
    paleta: [L('310'), L('321'), L('798')],
    contagem: [2, 2, 1],
    fundo: { encontrado: false, removido: false, pontos: 0, codigo: null },
  };
}

describe('trocar cor', () => {
  it('troca a linha sem mexer nos pontos nem nos símbolos', () => {
    const g = grafico();
    const novo = trocarCor(g, 1, L('666'));
    expect(novo.paleta.map((l) => l.codigo)).toEqual(['310', '666', '798']);
    expect([...novo.celulas]).toEqual([...g.celulas]);
    expect(novo.contagem).toEqual([2, 2, 1]);
  });

  it('escolher uma linha que já está na legenda junta as duas cores', () => {
    const novo = trocarCor(grafico(), 2, L('310')); // azul vira preto
    expect(novo.paleta.map((l) => l.codigo)).toEqual(['310', '321']);
    expect([...novo.celulas]).toEqual([0, 1, 0, 1, SEM_PONTO, 0]);
    expect(novo.contagem).toEqual([3, 2]);
  });

  it('juntar com uma cor que vem depois renumera certo', () => {
    const novo = trocarCor(grafico(), 0, L('798')); // preto vira azul
    expect(novo.paleta.map((l) => l.codigo)).toEqual(['321', '798']);
    expect([...novo.celulas]).toEqual([1, 0, 1, 0, SEM_PONTO, 1]);
    expect(novo.contagem).toEqual([2, 3]);
  });

  it('não altera o gráfico original (o anterior continua disponível)', () => {
    const g = grafico();
    trocarCor(g, 2, L('310'));
    expect([...g.celulas]).toEqual([0, 1, 2, 1, SEM_PONTO, 0]);
  });
});

describe('pintar pontos', () => {
  it('pinta com uma cor da legenda ou deixa sem bordado', () => {
    const g = grafico();
    expect(pintar(g, 0, 2)).toBe(true);
    expect(pintar(g, 5, SEM_PONTO)).toBe(true);
    expect(recontar(g).contagem).toEqual([0, 2, 2]);
  });

  it('não aceita cor inexistente nem posição fora do gráfico', () => {
    const g = grafico();
    expect(pintar(g, 0, 7)).toBe(false);
    expect(pintar(g, 99, 0)).toBe(false);
    expect(pintar(g, 0, 0)).toBe(false); // já era dessa cor
  });

  it('ao terminar, cores sem pontos saem da legenda e a ordem das outras se mantém', () => {
    const g = grafico();
    pintar(g, 0, 1);
    pintar(g, 5, 1); // o preto (310) ficou sem pontos
    const final = removerCoresSemPontos(g);
    expect(final.paleta.map((l) => l.codigo)).toEqual(['321', '798']);
    expect([...final.celulas]).toEqual([0, 0, 1, 0, SEM_PONTO, 0]);
    expect(final.contagem).toEqual([4, 1]);
  });
});

describe('caminho do traço', () => {
  it('liga dois pontos sem pular quadradinhos', () => {
    const p = pontosNoCaminho(0, 0, 5, 0);
    expect(p.map((x) => x.coluna)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('em diagonal e para trás também', () => {
    const p = pontosNoCaminho(3, 3, 0, 0);
    expect(p).toEqual([3, 2, 1, 0].map((n) => ({ coluna: n, linha: n })));
  });

  it('cada passo anda no máximo um quadradinho', () => {
    const p = pontosNoCaminho(2, 1, 9, 4);
    expect(p[0]).toEqual({ coluna: 2, linha: 1 });
    expect(p[p.length - 1]).toEqual({ coluna: 9, linha: 4 });
    for (let i = 1; i < p.length; i++) {
      expect(Math.abs(p[i].coluna - p[i - 1].coluna)).toBeLessThanOrEqual(1);
      expect(Math.abs(p[i].linha - p[i - 1].linha)).toBeLessThanOrEqual(1);
    }
  });

  it('um ponto só', () => {
    expect(pontosNoCaminho(4, 4, 4, 4)).toEqual([{ coluna: 4, linha: 4 }]);
  });
});

describe('desfazer', () => {
  it('volta ao estado anterior, várias vezes', () => {
    const h = new Historico();
    let g = grafico();
    h.guardar(g);
    pintar(g, 0, 2);
    h.guardar(g);
    g = trocarCor(g, 2, L('310'));
    g = h.desfazer(g)!;
    expect(g.paleta).toHaveLength(3);
    expect(g.celulas[0]).toBe(2);
    g = h.desfazer(g)!;
    expect([...g.celulas]).toEqual([0, 1, 2, 1, SEM_PONTO, 0]);
    expect(h.desfazer(g)).toBeNull();
  });

  it('guarda no máximo o limite de passos', () => {
    const h = new Historico(2);
    const g = grafico();
    h.guardar(g);
    h.guardar(g);
    h.guardar(g);
    let passos = 0;
    while (h.desfazer(g)) passos++;
    expect(passos).toBe(2);
  });
});

describe('sugestões de linhas', () => {
  it('as parecidas com o vermelho 321 são vermelhas', () => {
    const parecidas = linhasParecidas(L('321'), LINHAS_DMC, 5);
    expect(parecidas).toHaveLength(5);
    expect(parecidas.map((l) => l.codigo)).not.toContain('321');
    for (const l of parecidas) expect(l.lab.a).toBeGreaterThan(30); // avermelhadas
  });

  it('procura pelo código: exato primeiro', () => {
    const r = procurarLinhas('31', LINHAS_DMC);
    expect(r[0].codigo).toBe('31');
    for (const l of r) expect(l.codigo.startsWith('31')).toBe(true);
    expect(procurarLinhas('310', LINHAS_DMC)[0].codigo).toBe('310');
  });

  it('procura pelo nome, sem ligar para acentos', () => {
    const r = procurarLinhas('cafe', LINHAS_DMC);
    expect(r.length).toBeGreaterThan(0);
    for (const l of r) expect(l.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()).toContain('cafe');
  });

  it('busca vazia não devolve nada', () => {
    expect(procurarLinhas('  ', LINHAS_DMC)).toEqual([]);
  });
});
