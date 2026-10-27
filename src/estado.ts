// Tudo o que a pessoa escolheu até agora. Fica só na memória do navegador:
// nada é enviado para fora do aparelho.

import { ajustesIniciais, type Ajustes } from './imagem/ajustes';
import type { Grafico, Limpeza } from './processamento/converter';
import type { TamanhoQuadradinho, Versoes } from './pdf/paginacao';

export type Nivel = 'iniciante' | 'intermediario' | 'detalhado';
/** Contagem do tecido Etamine (Aida): pontos por polegada. */
export type Tecido = 11 | 14 | 16 | 18;

export interface Configuracao {
  nivel: Nivel;
  /** Largura do bordado, em pontos. A altura acompanha a proporção da imagem. */
  largura: number;
  tecido: Tecido;
  maxCores: number;
  limpeza: Limpeza;
}

export interface Estado {
  /** Imagem de trabalho (já reduzida, sem giro nem ajustes). */
  imagem: HTMLCanvasElement | null;
  nomeArquivo: string;
  ajustes: Ajustes;
  /** Resultado da etapa 1, usado pelas próximas etapas. */
  imagemFinal: HTMLCanvasElement | null;
  config: Configuracao;
  /** Resultado da etapa 2: o gráfico de pontos. */
  grafico: Grafico | null;
  /** Escolhas da etapa 4, para o PDF. */
  apostila: { nome: string; versoes: Versoes; tamanho: TamanhoQuadradinho };
}

function estadoInicial(): Estado {
  return {
    imagem: null,
    nomeArquivo: '',
    ajustes: ajustesIniciais(),
    imagemFinal: null,
    config: { nivel: 'iniciante', largura: 60, tecido: 14, maxCores: 10, limpeza: 'forte' },
    grafico: null,
    apostila: { nome: '', versoes: 'ambos', tamanho: 'normal' },
  };
}

export const estado: Estado = estadoInicial();

/** Começa tudo de novo ("Fazer outro bordado"). */
export function reiniciarEstado(): void {
  Object.assign(estado, estadoInicial());
}

/** Nome sugerido a partir do nome do arquivo: "casinha_de-campo.jpg" → "Casinha de campo". */
export function nomeSugerido(nomeArquivo: string): string {
  const base = nomeArquivo
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base || /^(img|dsc|image|imagem|foto|photo|screenshot|whatsapp)\b/i.test(base) || /^\d/.test(base)) return 'Meu bordado';
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 60);
}
