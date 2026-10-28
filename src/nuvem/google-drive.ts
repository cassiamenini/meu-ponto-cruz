// Salvar o PDF no Google Drive da PRÓPRIA pessoa.
//
// Como funciona:
//  1. A biblioteca do Google só é carregada quando a pessoa toca em "Salvar no meu
//     Google Drive" (quem não usa o recurso não se comunica com o Google).
//  2. Uma janela do Google pede autorização. Pedimos só o acesso "drive.file":
//     o aplicativo enxerga apenas os arquivos que ele mesmo criou, nunca o resto do Drive.
//  3. O PDF vai direto do navegador para o Drive da pessoa. Não passa por nenhum
//     servidor nosso, e nada fica guardado com a gente.
//  4. A autorização (o "token") fica só na memória desta aba e vence em cerca de 1 hora.

import { GOOGLE_CLIENT_ID, PASTA_NO_DRIVE } from '../config';

export const ESCOPO_DRIVE = 'https://www.googleapis.com/auth/drive.file';
const SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';
const API = 'https://www.googleapis.com/drive/v3/files';
const API_ENVIO = 'https://www.googleapis.com/upload/drive/v3/files';
const TIPO_PASTA = 'application/vnd.google-apps.folder';

export class ErroDrive extends Error {}

export function driveDisponivel(): boolean {
  return GOOGLE_CLIENT_ID.trim() !== '';
}

// ---------- Partes sem rede (testáveis) ----------

/** Busca da pasta do aplicativo, com aspas e barras protegidas. */
export function consultaDaPasta(nome: string): string {
  const seguro = nome.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `name = '${seguro}' and mimeType = '${TIPO_PASTA}' and trashed = false`;
}

/** Corpo do envio "multipart": primeiro os dados do arquivo (JSON), depois o PDF. */
export function corpoMultipart(metadados: object, arquivo: Blob, fronteira: string): Blob {
  const inicio =
    `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadados)}\r\n` +
    `--${fronteira}\r\nContent-Type: ${arquivo.type || 'application/octet-stream'}\r\n\r\n`;
  return new Blob([inicio, arquivo, `\r\n--${fronteira}--`], { type: `multipart/related; boundary=${fronteira}` });
}

/** Traduz os erros do Google para mensagens claras. */
export function mensagemDeErro(tipo: string, status?: number): string {
  switch (tipo) {
    case 'popup_failed_to_open':
      return 'O navegador bloqueou a janela do Google. Toque de novo em "Salvar no meu Google Drive".';
    case 'popup_closed':
      return 'A janela do Google foi fechada antes de terminar. Se quiser, tente de novo.';
    case 'access_denied':
      return 'Você não autorizou o acesso ao Google Drive. O PDF não foi salvo lá, mas você pode baixá-lo normalmente.';
    case 'script':
      return 'Não foi possível falar com o Google agora. Verifique a internet e tente de novo.';
    case 'http':
      if (status === 403) return 'O Google recusou o envio. Pode ser falta de espaço no seu Google Drive.';
      return 'Não foi possível salvar no Google Drive agora. Verifique a internet e tente de novo.';
    default:
      return 'Não foi possível salvar no Google Drive. Tente de novo ou baixe o PDF pelo botão "Baixar PDF".';
  }
}

// ---------- Biblioteca do Google ----------

interface ClienteDeToken {
  requestAccessToken(opcoes?: { prompt?: string }): void;
}
interface RespostaToken {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface GoogleOAuth {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (r: RespostaToken) => void;
    error_callback?: (e: { type: string }) => void;
  }): ClienteDeToken;
  revoke(token: string, feito?: () => void): void;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth } };
  }
}

let carregando: Promise<GoogleOAuth> | null = null;

function carregarGoogle(): Promise<GoogleOAuth> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  carregando ??= new Promise<GoogleOAuth>((ok, erro) => {
    const s = document.createElement('script');
    s.src = SCRIPT_GOOGLE;
    s.async = true;
    s.onload = () => (window.google?.accounts?.oauth2 ? ok(window.google.accounts.oauth2) : erro(new ErroDrive(mensagemDeErro('script'))));
    s.onerror = () => {
      carregando = null;
      s.remove();
      erro(new ErroDrive(mensagemDeErro('script')));
    };
    document.head.append(s);
  });
  return carregando;
}

/**
 * Carrega a biblioteca antes, sem pedir nada. Chamada quando a pessoa aponta ou foca
 * o botão do Drive: assim a janela do Google abre no toque sem ser bloqueada.
 */
export function prepararGoogle(): void {
  if (driveDisponivel()) void carregarGoogle().catch(() => {});
}

// ---------- Autorização ----------

let token: { valor: string; vence: number } | null = null;

function pedirToken(oauth: GoogleOAuth): Promise<string> {
  if (token && Date.now() < token.vence) return Promise.resolve(token.valor);
  return new Promise((ok, erro) => {
    const cliente = oauth.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: ESCOPO_DRIVE,
      callback: (r) => {
        if (r.error || !r.access_token) return erro(new ErroDrive(mensagemDeErro(r.error === 'access_denied' ? 'access_denied' : 'outro')));
        // vence um pouco antes do prazo do Google, por segurança
        token = { valor: r.access_token, vence: Date.now() + Math.max(0, (r.expires_in ?? 3600) - 60) * 1000 };
        ok(r.access_token);
      },
      error_callback: (e) => erro(new ErroDrive(mensagemDeErro(e.type))),
    });
    cliente.requestAccessToken();
  });
}

/** Esquece a autorização e avisa o Google para cancelá-la. */
export function desconectarDrive(): void {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.valor);
  token = null;
}

export function conectadoAoDrive(): boolean {
  return token !== null && Date.now() < token.vence;
}

// ---------- Drive ----------

async function chamar(url: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` } });
  if (r.status === 401) token = null; // autorização vencida: a próxima tentativa pede de novo
  if (!r.ok) throw new ErroDrive(mensagemDeErro('http', r.status));
  return r;
}

async function pastaDoAplicativo(accessToken: string): Promise<string> {
  const busca = new URLSearchParams({ q: consultaDaPasta(PASTA_NO_DRIVE), fields: 'files(id)', spaces: 'drive', pageSize: '1' });
  const achadas = (await (await chamar(`${API}?${busca}`, accessToken)).json()) as { files?: { id: string }[] };
  if (achadas.files?.[0]) return achadas.files[0].id;
  const criada = await chamar(`${API}?fields=id`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name: PASTA_NO_DRIVE, mimeType: TIPO_PASTA }),
  });
  return ((await criada.json()) as { id: string }).id;
}

export type EtapaDrive = 'conectando' | 'enviando';

/**
 * Salva o PDF na pasta "Meu Ponto Cruz" do Google Drive da pessoa.
 * Precisa ser chamada logo depois de um toque/clique (por causa da janela do Google).
 */
export async function salvarNoDrive(
  pdf: Blob,
  nomeArquivo: string,
  aoMudar?: (etapa: EtapaDrive) => void,
): Promise<{ link: string }> {
  if (!driveDisponivel()) throw new ErroDrive(mensagemDeErro('outro'));
  aoMudar?.('conectando');
  const oauth = await carregarGoogle();
  const accessToken = await pedirToken(oauth);
  aoMudar?.('enviando');
  const pasta = await pastaDoAplicativo(accessToken);
  const fronteira = `meu-ponto-cruz-${crypto.randomUUID()}`;
  const corpo = corpoMultipart({ name: nomeArquivo, mimeType: 'application/pdf', parents: [pasta] }, pdf, fronteira);
  const r = await chamar(`${API_ENVIO}?uploadType=multipart&fields=id,webViewLink`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${fronteira}` },
    body: corpo,
  });
  const arquivo = (await r.json()) as { id: string; webViewLink?: string };
  return { link: arquivo.webViewLink ?? `https://drive.google.com/file/d/${arquivo.id}/view` };
}
