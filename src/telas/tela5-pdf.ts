// Tela 5 — Baixe seu PDF.
// Gera o PDF assim que a pessoa chega aqui e oferece baixar ou compartilhar.

import { estado, reiniciarEstado } from '../estado';
import type { Grafico } from '../processamento/converter';
import type { ImagemPdf, ImagensPdf } from '../pdf/grafico-pdf';
import { contarPaginas } from '../pdf/paginacao';
import { imagemDosPontos } from '../grafico/desenhar';
import { PASTA_NO_DRIVE } from '../config';
import { conectadoAoDrive, desconectarDrive, driveDisponivel, ErroDrive, prepararGoogle, salvarNoDrive } from '../nuvem/google-drive';
import { caixaDeErro, el } from './dom';
import type { ContextoTela } from './etapas';

// O último PDF gerado: se nada mudou, não é preciso gerar de novo.
let ultimo: { chave: string; grafico: Grafico; blob: Blob; url: string; nome: string } | null = null;

function chaveAtual(): string {
  return JSON.stringify({ ...estado.apostila, tecido: estado.config.tecido });
}

function esquecerPdf(): void {
  if (ultimo) URL.revokeObjectURL(ultimo.url);
  ultimo = null;
}

export function aoContinuarTela5(): string | null | false {
  if (!window.confirm('Começar um bordado novo? A imagem e o gráfico atuais serão descartados (o PDF que você baixou continua guardado).')) {
    return false;
  }
  esquecerPdf();
  reiniciarEstado();
  return null;
}

// ---------- Imagens para o PDF ----------

function imagemReferencia(origem: HTMLCanvasElement): ImagemPdf {
  const escala = Math.min(1, 1000 / Math.max(origem.width, origem.height));
  const c = el('canvas', { width: Math.max(1, Math.round(origem.width * escala)), height: Math.max(1, Math.round(origem.height * escala)) });
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF'; // JPEG não tem transparência
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(origem, 0, 0, c.width, c.height);
  return { dados: c.toDataURL('image/jpeg', 0.85), largura: c.width, altura: c.height };
}

/** Prévia do bordado com cada ponto ampliado por igual, para sair nítida no PDF. */
function imagemPrevia(g: Grafico): ImagemPdf {
  const pequeno = el('canvas', { width: g.largura, height: g.altura });
  const ctx = pequeno.getContext('2d')!;
  ctx.putImageData(imagemDosPontos(ctx, g), 0, 0);
  const k = Math.max(1, Math.floor(700 / Math.max(g.largura, g.altura)));
  const grande = el('canvas', { width: g.largura * k, height: g.altura * k });
  const ctxGrande = grande.getContext('2d')!;
  ctxGrande.imageSmoothingEnabled = false;
  ctxGrande.drawImage(pequeno, 0, 0, grande.width, grande.height);
  return { dados: grande.toDataURL('image/png'), largura: grande.width, altura: grande.height };
}

async function carregarFonte(arquivo: string): Promise<ArrayBuffer> {
  const resposta = await fetch(new URL(`fonts/${arquivo}`, document.baseURI));
  if (!resposta.ok) throw new Error(`Fonte ${arquivo} indisponível`);
  return resposta.arrayBuffer();
}

// ---------- Tela ----------

export function montarTela5(container: HTMLElement, ctx: ContextoTela): void {
  ctx.atualizarNavegacao();
  const g = estado.grafico;
  if (!g || !estado.imagemFinal) {
    container.replaceChildren(caixaDeErro('Volte às etapas anteriores para preparar o gráfico.'));
    return;
  }

  if (ultimo && ultimo.grafico === g && ultimo.chave === chaveAtual()) {
    mostrarPronto(container, ctx, false);
    return;
  }
  void gerar(container, ctx, g, estado.imagemFinal);
}

async function gerar(container: HTMLElement, ctx: ContextoTela, g: Grafico, imagemFinal: HTMLCanvasElement): Promise<void> {
  const barra = el('progress', { max: 100, value: 0, id: 'progresso-pdf' });
  const texto = el('p', { className: 'status-previa' }, 'Preparando sua apostila… isso pode levar alguns segundos.');
  texto.setAttribute('role', 'status');
  container.replaceChildren(
    el('div', { className: 'gerando-pdf' }, el('label', { htmlFor: 'progresso-pdf', className: 'so-leitor' }, 'Andamento do PDF'), barra, texto),
  );

  try {
    const [{ gerarPdf, nomeDoArquivo }, regular, negrito] = await Promise.all([
      import('../pdf/gerar'),
      carregarFonte('AtkinsonHyperlegible-Regular.ttf'),
      carregarFonte('AtkinsonHyperlegible-Bold.ttf'),
    ]);
    const imagens: ImagensPdf = { referencia: imagemReferencia(imagemFinal), previa: imagemPrevia(g) };
    const opcoes = {
      nomeProjeto: estado.apostila.nome.trim() || 'Meu bordado',
      versoes: estado.apostila.versoes,
      tamanho: estado.apostila.tamanho,
      tecido: estado.config.tecido,
    };
    const blob = await gerarPdf(g, opcoes, imagens, { regular, negrito }, (f) => {
      barra.value = Math.round(f * 100);
    });
    esquecerPdf();
    ultimo = { chave: chaveAtual(), grafico: g, blob, url: URL.createObjectURL(blob), nome: nomeDoArquivo(opcoes.nomeProjeto) };
    mostrarPronto(container, ctx, true);
  } catch {
    const tentar = el('button', { type: 'button', className: 'botao botao-principal' }, 'Tentar de novo');
    tentar.addEventListener('click', () => void gerar(container, ctx, g, imagemFinal));
    container.replaceChildren(
      caixaDeErro(
        'Não foi possível preparar o PDF neste aparelho. Verifique a internet (para carregar a fonte) e tente de novo. ' +
          'Se continuar, volte e escolha um bordado menor ou quadradinhos de tamanho normal.',
      ),
      el('div', { className: 'grupo-botoes' }, tentar),
    );
  }
}

/** "Salvar no meu Google Drive": só aparece quando o aplicativo tem um ID do Google configurado. */
function blocoDoDrive(pdf: Blob, nome: string): HTMLElement {
  const botao = el('button', { type: 'button', className: 'botao botao-secundario botao-drive' }, 'Salvar no meu Google Drive');
  const situacao = el('div', { className: 'situacao-drive' });
  situacao.setAttribute('role', 'status');
  const erro = caixaDeErro();

  // carrega a biblioteca do Google só quando a pessoa mostra interesse no botão
  botao.addEventListener('pointerenter', prepararGoogle, { once: true });
  botao.addEventListener('focus', prepararGoogle, { once: true });

  function mostrarSalvo(link: string): void {
    const abrir = el('a', { href: link, target: '_blank', rel: 'noopener noreferrer', className: 'link-drive' }, 'Abrir no Google Drive');
    const sair = el('button', { type: 'button', className: 'botao-destacar' }, 'Desconectar o Google deste site');
    sair.addEventListener('click', () => {
      desconectarDrive();
      sair.remove();
      situacao.append(el('p', { className: 'dica' }, 'Pronto: este site não tem mais acesso ao seu Google Drive. O PDF salvo continua lá.'));
    });
    situacao.replaceChildren(
      el('p', { className: 'drive-salvo' }, `✓ Salvo na pasta "${PASTA_NO_DRIVE}" do seu Google Drive.`),
      el('p', {}, abrir, el('span', { className: 'so-leitor' }, ' (abre em outra aba)')),
      ...(conectadoAoDrive() ? [sair] : []),
    );
  }

  botao.addEventListener('click', async () => {
    botao.disabled = true;
    erro.hidden = true;
    try {
      const { link } = await salvarNoDrive(pdf, nome, (etapa) => {
        situacao.replaceChildren(
          el('p', {}, etapa === 'conectando' ? 'Abrindo a janela do Google… autorize por lá.' : 'Salvando o PDF no seu Google Drive…'),
        );
      });
      mostrarSalvo(link);
    } catch (e) {
      situacao.replaceChildren();
      erro.textContent = e instanceof ErroDrive ? e.message : 'Não foi possível salvar no Google Drive. Tente de novo ou use "Baixar PDF".';
      erro.hidden = false;
    } finally {
      botao.disabled = false;
    }
  });

  return el(
    'section',
    { className: 'bloco-drive' },
    el('h2', { className: 'subtitulo' }, 'Guardar na nuvem (opcional)'),
    el(
      'p',
      { className: 'dica' },
      'Abre uma janela do Google para você autorizar. O PDF vai direto para o seu Google Drive, na pasta "' +
        PASTA_NO_DRIVE +
        '". Este site só consegue ver os arquivos que ele mesmo salvar lá, nunca o resto do seu Drive.',
    ),
    botao,
    situacao,
    erro,
  );
}

function mostrarPronto(container: HTMLElement, ctx: ContextoTela, anunciar: boolean): void {
  if (!ultimo || !estado.grafico) return;
  const pdf = ultimo;
  const paginas = contarPaginas(estado.grafico, estado.apostila).total;
  const tamanho = pdf.blob.size / 1024 / 1024;
  const tamanhoTexto = tamanho < 1 ? `${Math.max(1, Math.round(tamanho * 1024))} KB` : `${tamanho.toFixed(1).replace('.', ',')} MB`;

  const baixar = el('a', { className: 'botao botao-principal botao-baixar', href: pdf.url, download: pdf.nome }, 'Baixar PDF');
  const acoes = el('div', { className: 'acoes-pdf' }, baixar);

  const arquivo = new File([pdf.blob], pdf.nome, { type: 'application/pdf' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })) {
    const compartilhar = el('button', { type: 'button', className: 'botao botao-secundario' }, 'Compartilhar');
    compartilhar.addEventListener('click', () => {
      navigator.share({ files: [arquivo], title: estado.apostila.nome }).catch(() => {
        // a pessoa fechou a janela de compartilhar: nada a fazer
      });
    });
    acoes.append(compartilhar);
  }

  container.replaceChildren(
    el('p', { className: 'pdf-pronto' }, '✓ Sua apostila está pronta!'),
    el('p', { className: 'dica' }, `${pdf.nome} · ${paginas} páginas · ${tamanhoTexto}`),
    acoes,
    ...(driveDisponivel() ? [blocoDoDrive(pdf.blob, pdf.nome)] : []),
    el('h2', { className: 'subtitulo' }, 'Antes de imprimir'),
    el(
      'ul',
      { className: 'lista-dicas' },
      el('li', {}, 'Na janela de impressão, escolha "Tamanho real" ou "100%" (não use "Ajustar à página").'),
      el('li', {}, 'Confira a régua de 10 cm na última página do PDF.'),
      el('li', {}, 'Sem impressora colorida? Imprima só as páginas em preto e branco.'),
      el('li', {}, 'Guarde o arquivo: você pode imprimir de novo quando quiser.'),
    ),
    el(
      'p',
      { className: 'dica' },
      estado.graficoEditado
        ? 'Este PDF já inclui as correções que você fez no gráfico. Quer mudar alguma coisa? Use "Voltar": o PDF é refeito.'
        : 'Quer mudar alguma coisa? Use o botão "Voltar": o PDF é refeito com as novas escolhas.',
    ),
  );
  if (anunciar) {
    ctx.anunciar('Sua apostila está pronta. Use o botão Baixar PDF.');
    baixar.focus();
  }
}
