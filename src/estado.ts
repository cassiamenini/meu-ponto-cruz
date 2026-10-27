// Tudo o que a pessoa escolheu até agora. Fica só na memória do navegador:
// nada é enviado para fora do aparelho.

import { ajustesIniciais, type Ajustes } from './imagem/ajustes';
import type { Grafico, Limpeza } from './processamento/converter';

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
}

export const estado: Estado = {
  imagem: null,
  nomeArquivo: '',
  ajustes: ajustesIniciais(),
  imagemFinal: null,
  config: { nivel: 'iniciante', largura: 60, tecido: 14, maxCores: 10, limpeza: 'forte' },
  grafico: null,
};
