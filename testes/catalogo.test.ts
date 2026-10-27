import { describe, expect, it } from 'vitest';
import { buscarLinha, LINHAS_DMC, linhaMaisProxima } from '../src/catalogo/dmc';
import { hexParaRgb } from '../src/cores/cielab';

describe('catálogo DMC — integridade dos dados', () => {
  it('tem as 489 cores sólidas do Mouliné Spécial', () => {
    expect(LINHAS_DMC).toHaveLength(489);
  });

  it('não repete códigos', () => {
    const codigos = LINHAS_DMC.map((l) => l.codigo.toUpperCase());
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('todo código tem formato válido e nenhum nome tem o sufixo "Light Effect"', () => {
    for (const l of LINHAS_DMC) {
      expect(l.codigo).toMatch(/^(\d{1,4}|Blanc|Ecru|B5200)$/);
      expect(l.nome).not.toMatch(/Light Effect/i);
    }
  });

  it('só as 7 cores sem nome oficial ficam sem nome', () => {
    const semNome = LINHAS_DMC.filter((l) => !l.nome).map((l) => l.codigo);
    expect(semNome.sort()).toEqual(['3773', '504', '731', '776', '781', '806', '971']);
  });

  it('hex e RGB de cada cor concordam', () => {
    for (const l of LINHAS_DMC) {
      expect(l.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(hexParaRgb(l.hex)).toEqual([...l.rgb]);
    }
  });

  it('não inclui as linhas mescladas (Ombre)', () => {
    for (const codigo of ['48', '51', '52', '53', '69', '90', '92', '93', '94', '99', '105', '106', '107', '111', '115', '121', '125']) {
      expect(buscarLinha(codigo)).toBeUndefined();
    }
  });

  it('confere algumas cores conhecidas', () => {
    expect(buscarLinha('310')).toMatchObject({ nome: 'Preto', hex: '#000000' });
    expect(buscarLinha('321')).toMatchObject({ nome: 'Vermelho Carmim' });
    expect(buscarLinha('blanc')?.codigo).toBe('Blanc');
    expect(buscarLinha('ecru')?.codigo).toBe('Ecru');
    expect(buscarLinha('B5200')).toBeDefined();
  });

  it('309 usa o valor vermelho confirmado pela foto oficial, não o cinza antigo', () => {
    expect(buscarLinha('309')?.hex).toBe('#C12041');
  });
});

describe('linhaMaisProxima', () => {
  it('preto puro encontra o 310', () => {
    expect(linhaMaisProxima([0, 0, 0]).linha.codigo).toBe('310');
  });

  it('a cor exata de uma linha encontra a própria linha, com diferença zero', () => {
    const l = buscarLinha('798')!;
    const r = linhaMaisProxima(l.rgb);
    expect(r.linha.codigo).toBe('798');
    expect(r.deltaE).toBe(0);
  });

  it('branco puro encontra um dos brancos', () => {
    expect(['B5200', 'Blanc']).toContain(linhaMaisProxima([255, 255, 255]).linha.codigo);
  });

  it('pode procurar só entre as linhas escolhidas', () => {
    const opcoes = [buscarLinha('310')!, buscarLinha('Blanc')!];
    expect(linhaMaisProxima([200, 200, 200], opcoes).linha.codigo).toBe('Blanc');
  });
});
