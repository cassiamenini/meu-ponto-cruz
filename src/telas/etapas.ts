// As cinco etapas do aplicativo.
// Nesta fase (Etapa 0) cada tela só mostra o que vai acontecer nela;
// as funções de verdade entram nas próximas etapas do plano.

export interface Etapa {
  titulo: string;
  /** Nome curto, usado no indicador de etapas no topo. */
  curto: string;
  /** Frase de orientação logo abaixo do título. */
  orientacao: string;
  /** O que esta tela vai permitir fazer (aparece como lista). */
  emBreve: string[];
}

export const ETAPAS: Etapa[] = [
  {
    titulo: 'Escolha sua imagem',
    curto: 'Imagem',
    orientacao: 'Comece escolhendo uma foto ou desenho que você gostaria de bordar.',
    emBreve: [
      'Escolher uma foto do celular ou do computador (JPG, PNG ou WebP).',
      'Recortar só a parte que interessa.',
      'Girar a imagem e ajustar o brilho.',
    ],
  },
  {
    titulo: 'Personalize seu bordado',
    curto: 'Bordado',
    orientacao: 'Escolha o tamanho do bordado e quantas cores de linha quer usar.',
    emBreve: [
      'Escolher o nível: iniciante, intermediário ou detalhado.',
      'Definir a largura em pontos.',
      'Escolher o tecido (Etamine 11, 14, 16 ou 18).',
      'Ver o tamanho final em centímetros.',
    ],
  },
  {
    titulo: 'Confira seu gráfico',
    curto: 'Gráfico',
    orientacao: 'Veja como o bordado vai ficar, com as cores e os símbolos.',
    emBreve: [
      'Ver o gráfico com cores e símbolos.',
      'Ampliar para enxergar os detalhes.',
      'Trocar uma cor de linha por outra.',
      'Ver a lista de cores DMC usadas.',
    ],
  },
  {
    titulo: 'Prepare sua apostila',
    curto: 'Apostila',
    orientacao: 'Dê um nome ao seu projeto e escolha como quer imprimir.',
    emBreve: [
      'Dar um nome ao projeto.',
      'Escolher gráfico colorido, em preto e branco ou os dois.',
      'Escolher quadradinhos normais ou ampliados.',
      'Saber quantas páginas o PDF vai ter.',
    ],
  },
  {
    titulo: 'Baixe seu PDF',
    curto: 'PDF',
    orientacao: 'Pronto! Agora é só baixar a apostila e começar a bordar.',
    emBreve: [
      'Baixar o PDF no celular ou no computador.',
      'Compartilhar o PDF, quando o aparelho permitir.',
      'Ver dicas para imprimir.',
    ],
  },
];
