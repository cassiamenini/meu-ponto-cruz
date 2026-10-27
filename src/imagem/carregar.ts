// Abre a imagem já validada e cria uma cópia de trabalho reduzida.
//
// Por que reduzir? Um gráfico de ponto cruz tem no máximo algumas centenas de
// pontos de largura; trabalhar com 2000 pixels já sobra. Isso economiza
// memória em celulares mais simples. Redesenhar a imagem num "canvas" também
// descarta os dados escondidos da foto (como a localização GPS).

export const LADO_MAX_TRABALHO = 2000;

export class ErroAoAbrir extends Error {}

async function decodificar(arquivo: File): Promise<CanvasImageSource & { width: number; height: number }> {
  // Caminho principal: createImageBitmap já respeita a orientação da foto.
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    } catch {
      // segue para o caminho alternativo
    }
  }

  // Caminho alternativo, para navegadores mais antigos.
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function novoCanvas(largura: number, altura: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = largura;
  c.height = altura;
  return c;
}

/**
 * Abre o arquivo e devolve um canvas com no máximo LADO_MAX_TRABALHO pixels
 * no lado maior. Lança ErroAoAbrir com uma mensagem amigável se não conseguir.
 */
export async function carregarImagem(arquivo: File): Promise<HTMLCanvasElement> {
  let fonte: Awaited<ReturnType<typeof decodificar>>;
  try {
    fonte = await decodificar(arquivo);
  } catch {
    throw new ErroAoAbrir(
      'Não foi possível abrir esta imagem. O arquivo pode estar danificado ou ser grande demais para este aparelho. Tente outra foto.',
    );
  }

  try {
    let largura = fonte.width;
    let altura = fonte.height;
    let atual: CanvasImageSource = fonte;

    // Reduz pela metade várias vezes: fica mais nítido do que reduzir de uma vez.
    while (Math.max(largura, altura) / 2 >= LADO_MAX_TRABALHO) {
      largura = Math.round(largura / 2);
      altura = Math.round(altura / 2);
      const metade = novoCanvas(largura, altura);
      desenhar(metade, atual);
      atual = metade;
    }

    const escala = Math.min(1, LADO_MAX_TRABALHO / Math.max(largura, altura));
    const final = novoCanvas(Math.max(1, Math.round(largura * escala)), Math.max(1, Math.round(altura * escala)));
    desenhar(final, atual);
    return final;
  } catch {
    throw new ErroAoAbrir(
      'Este aparelho não teve memória suficiente para abrir a imagem. Tente uma foto menor.',
    );
  } finally {
    if ('close' in fonte && typeof fonte.close === 'function') fonte.close();
  }
}

function desenhar(destino: HTMLCanvasElement, origem: CanvasImageSource): void {
  const ctx = destino.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(origem, 0, 0, destino.width, destino.height);
}
