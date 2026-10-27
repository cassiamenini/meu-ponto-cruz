// Tudo o que a pessoa escolheu até agora. Fica só na memória do navegador:
// nada é enviado para fora do aparelho.

import { ajustesIniciais, type Ajustes } from './imagem/ajustes';

export interface Estado {
  /** Imagem de trabalho (já reduzida, sem giro nem ajustes). */
  imagem: HTMLCanvasElement | null;
  nomeArquivo: string;
  ajustes: Ajustes;
  /** Resultado da etapa 1, usado pelas próximas etapas. */
  imagemFinal: HTMLCanvasElement | null;
}

export const estado: Estado = {
  imagem: null,
  nomeArquivo: '',
  ajustes: ajustesIniciais(),
  imagemFinal: null,
};
