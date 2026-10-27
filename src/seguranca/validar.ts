// Verificação de segurança dos arquivos enviados.
//
// Não confiamos no nome nem na extensão do arquivo: lemos os primeiros bytes
// para descobrir o tipo real e as dimensões da imagem ANTES de abri-la.
// Assim, recusamos arquivos falsos e "imagens-bomba" (arquivos pequenos que,
// ao serem abertos, ocupariam uma quantidade enorme de memória).

export const LIMITES = {
  /** Tamanho máximo do arquivo: 15 MB. */
  bytesMax: 15 * 1024 * 1024,
  /** Maior largura ou altura aceita, em pixels. */
  ladoMax: 12000,
  /** Total máximo de pixels (50 megapixels). */
  pixelsMax: 50_000_000,
  /** Menor largura ou altura aceita, em pixels. */
  ladoMin: 8,
};

export type TipoImagem = 'jpeg' | 'png' | 'webp';

export interface InfoImagem {
  tipo: TipoImagem;
  largura: number;
  altura: number;
}

export type ResultadoValidacao = { ok: true; info: InfoImagem } | { ok: false; mensagem: string };

const MENSAGEM_NAO_IMAGEM =
  'Este arquivo não é uma imagem que o aplicativo consegue abrir. Escolha uma foto JPG, PNG ou WebP.';

function texto(b: Uint8Array, inicio: number, tamanho: number): string {
  return String.fromCharCode(...b.subarray(inicio, inicio + tamanho));
}

/** Descobre o tipo real da imagem pelos primeiros bytes ("assinatura"). */
export function detectarTipo(b: Uint8Array): TipoImagem | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((v, i) => b[i] === v)) return 'png';
  if (b.length >= 12 && texto(b, 0, 4) === 'RIFF' && texto(b, 8, 4) === 'WEBP') return 'webp';
  return null;
}

/** Reconhece formatos comuns que não aceitamos, para dar uma mensagem mais útil. */
function mensagemFormatoRecusado(b: Uint8Array): string {
  if (b.length >= 12 && texto(b, 4, 4) === 'ftyp') {
    const marca = texto(b, 8, 4);
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1', 'avif'].includes(marca)) {
      return (
        'Esta foto está no formato HEIC ou AVIF, usado por alguns celulares, que o aplicativo ainda não abre. ' +
        'Dica: escolha a foto direto pela galeria do celular, que ele costuma converter sozinho, ' +
        'ou salve uma cópia em JPG.'
      );
    }
  }
  if (b.length >= 4 && texto(b, 0, 4) === 'GIF8') {
    return 'Imagens GIF não são aceitas. Escolha uma foto JPG, PNG ou WebP.';
  }
  return MENSAGEM_NAO_IMAGEM;
}

function lerDimensoesPng(b: Uint8Array): { largura: number; altura: number } | null {
  if (b.length < 24 || texto(b, 12, 4) !== 'IHDR') return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { largura: v.getUint32(16), altura: v.getUint32(20) };
}

function lerDimensoesJpeg(b: Uint8Array): { largura: number; altura: number } | null {
  // Percorre os "segmentos" do JPEG até encontrar o que guarda o tamanho (SOF).
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return null; // estrutura inválida
    const marcador = b[i + 1];
    if (marcador === 0xff) {
      i += 1; // byte de preenchimento
      continue;
    }
    if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i += 2; // marcadores sem conteúdo
      continue;
    }
    if (marcador === 0xd9 || marcador === 0xda) return null; // chegou aos dados sem achar o tamanho
    const comprimento = (b[i + 2] << 8) | b[i + 3];
    if (comprimento < 2) return null;
    const ehSof = marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);
    if (ehSof) {
      if (i + 8 >= b.length) return null;
      return {
        altura: (b[i + 5] << 8) | b[i + 6],
        largura: (b[i + 7] << 8) | b[i + 8],
      };
    }
    i += 2 + comprimento;
  }
  return null;
}

function lerDimensoesWebp(b: Uint8Array): { largura: number; altura: number } | null {
  if (b.length < 30) return null;
  const bloco = texto(b, 12, 4);
  if (bloco === 'VP8 ') {
    return {
      largura: (b[26] | (b[27] << 8)) & 0x3fff,
      altura: (b[28] | (b[29] << 8)) & 0x3fff,
    };
  }
  if (bloco === 'VP8L') {
    if (b[20] !== 0x2f) return null;
    return {
      largura: 1 + (b[21] | ((b[22] & 0x3f) << 8)),
      altura: 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10)),
    };
  }
  if (bloco === 'VP8X') {
    return {
      largura: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      altura: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  return null;
}

/** Lê largura e altura direto do cabeçalho, sem abrir a imagem. */
export function lerDimensoes(b: Uint8Array, tipo: TipoImagem): { largura: number; altura: number } | null {
  if (tipo === 'png') return lerDimensoesPng(b);
  if (tipo === 'jpeg') return lerDimensoesJpeg(b);
  return lerDimensoesWebp(b);
}

/** Valida o conteúdo de um arquivo já lido. */
export function validarBytes(b: Uint8Array): ResultadoValidacao {
  const tipo = detectarTipo(b);
  if (!tipo) return { ok: false, mensagem: mensagemFormatoRecusado(b) };

  const dim = lerDimensoes(b, tipo);
  if (!dim || dim.largura === 0 || dim.altura === 0) {
    return {
      ok: false,
      mensagem: 'Não foi possível ler esta imagem. O arquivo pode estar danificado. Tente outra foto.',
    };
  }

  const { largura, altura } = dim;
  if (largura < LIMITES.ladoMin || altura < LIMITES.ladoMin) {
    return {
      ok: false,
      mensagem: `Esta imagem é pequena demais (${largura} × ${altura} pixels). Escolha uma imagem com pelo menos ${LIMITES.ladoMin} pixels de cada lado.`,
    };
  }
  if (largura > LIMITES.ladoMax || altura > LIMITES.ladoMax || largura * altura > LIMITES.pixelsMax) {
    return {
      ok: false,
      mensagem:
        `Esta imagem é grande demais (${largura} × ${altura} pixels) e poderia travar o aparelho. ` +
        'Escolha uma foto menor ou reduza esta num editor de imagens.',
    };
  }

  return { ok: true, info: { tipo, largura, altura } };
}

/** Faz todas as verificações num arquivo escolhido pela pessoa. */
export async function validarArquivo(arquivo: File): Promise<ResultadoValidacao> {
  if (arquivo.size === 0) {
    return { ok: false, mensagem: 'Este arquivo está vazio. Escolha outra foto.' };
  }
  if (arquivo.size > LIMITES.bytesMax) {
    const mb = (arquivo.size / 1024 / 1024).toFixed(1).replace('.', ',');
    return {
      ok: false,
      mensagem: `Este arquivo tem ${mb} MB e o limite é 15 MB. Escolha uma foto menor.`,
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await arquivo.arrayBuffer());
  } catch {
    return { ok: false, mensagem: 'Não foi possível ler o arquivo. Tente escolher a foto de novo.' };
  }
  return validarBytes(bytes);
}
