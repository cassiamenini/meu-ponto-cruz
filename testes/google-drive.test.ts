import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O módulo lê o ID do Google ao ser carregado; por isso cada teste o importa de novo.
async function carregar(id = 'teste.apps.googleusercontent.com') {
  vi.resetModules();
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', id);
  return import('../src/nuvem/google-drive');
}

/** Google de mentira: devolve um token (ou um erro) quando a "janela" é aberta. */
function googleFalso(resposta: { access_token?: string; error?: string } | { tipoErro: string }) {
  const pedidos: { client_id: string; scope: string }[] = [];
  const oauth2 = {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (r: object) => void;
      error_callback?: (e: { type: string }) => void;
    }) => ({
      requestAccessToken: () => {
        pedidos.push({ client_id: config.client_id, scope: config.scope });
        if ('tipoErro' in resposta) config.error_callback?.({ type: resposta.tipoErro });
        else config.callback({ ...resposta, expires_in: 3600 });
      },
    }),
    revoke: vi.fn(),
  };
  vi.stubGlobal('window', { google: { accounts: { oauth2 } } });
  return { pedidos, oauth2 };
}

/** Drive de mentira: responde à busca da pasta, à criação da pasta e ao envio. */
function driveFalso(pastaExiste: boolean) {
  const chamadas: { url: string; metodo: string; cabecalhos: Record<string, string>; corpo?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      chamadas.push({ url, metodo: init.method ?? 'GET', cabecalhos: (init.headers ?? {}) as Record<string, string>, corpo: init.body });
      const json = (dados: object) => new Response(JSON.stringify(dados), { status: 200 });
      if (url.includes('/upload/')) return json({ id: 'arq1', webViewLink: 'https://drive.google.com/file/d/arq1/view' });
      if ((init.method ?? 'GET') === 'GET') return json({ files: pastaExiste ? [{ id: 'pasta-velha' }] : [] });
      return json({ id: 'pasta-nova' });
    }),
  );
  return chamadas;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('partes sem rede', () => {
  it('sem ID do Google, o recurso fica desligado', async () => {
    const m = await carregar('');
    expect(m.driveDisponivel()).toBe(false);
  });

  it('a busca da pasta protege aspas no nome', async () => {
    const m = await carregar();
    expect(m.consultaDaPasta("Ponto d'Ana")).toBe(
      "name = 'Ponto d\\'Ana' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    );
  });

  it('o envio leva os dados do arquivo e depois o PDF, separados pela fronteira', async () => {
    const m = await carregar();
    const pdf = new Blob(['%PDF-1.7 conteúdo'], { type: 'application/pdf' });
    const corpo = m.corpoMultipart({ name: 'a.pdf', parents: ['p'] }, pdf, 'XYZ');
    const texto = await corpo.text();
    // o padrão dos navegadores guarda o tipo do Blob em minúsculas
    expect(corpo.type).toBe('multipart/related; boundary=xyz');
    expect(texto).toBe(
      '--XYZ\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"a.pdf","parents":["p"]}\r\n' +
        '--XYZ\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7 conteúdo\r\n--XYZ--',
    );
  });

  it('mensagens de erro em português claro', async () => {
    const m = await carregar();
    expect(m.mensagemDeErro('popup_failed_to_open')).toMatch(/bloqueou a janela/);
    expect(m.mensagemDeErro('access_denied')).toMatch(/não autorizou/);
    expect(m.mensagemDeErro('http', 403)).toMatch(/espaço/);
  });
});

describe('salvar no Drive (com Google e Drive de mentira)', () => {
  it('pede só o acesso drive.file, cria a pasta e envia o PDF para dentro dela', async () => {
    const m = await carregar();
    const { pedidos } = googleFalso({ access_token: 'tok123' });
    const chamadas = driveFalso(false);
    const etapas: string[] = [];
    const r = await m.salvarNoDrive(new Blob(['%PDF'], { type: 'application/pdf' }), 'flor.pdf', (e) => etapas.push(e));

    expect(pedidos).toEqual([{ client_id: 'teste.apps.googleusercontent.com', scope: 'https://www.googleapis.com/auth/drive.file' }]);
    expect(etapas).toEqual(['conectando', 'enviando']);
    expect(r.link).toBe('https://drive.google.com/file/d/arq1/view');

    expect(chamadas.map((c) => c.metodo)).toEqual(['GET', 'POST', 'POST']);
    for (const c of chamadas) expect(c.cabecalhos.Authorization).toBe('Bearer tok123');
    expect(JSON.parse(chamadas[1].corpo as string)).toEqual({ name: 'Meu Ponto Cruz', mimeType: 'application/vnd.google-apps.folder' });
    const envio = await (chamadas[2].corpo as Blob).text();
    expect(envio).toContain('"name":"flor.pdf"');
    expect(envio).toContain('"parents":["pasta-nova"]');
    expect(chamadas[2].url).toContain('uploadType=multipart');
    // nenhuma chamada sai para fora do Google
    for (const c of chamadas) expect(new URL(c.url).origin).toBe('https://www.googleapis.com');
  });

  it('se a pasta já existe, usa a mesma e não cria outra', async () => {
    const m = await carregar();
    googleFalso({ access_token: 'tok' });
    const chamadas = driveFalso(true);
    await m.salvarNoDrive(new Blob(['%PDF']), 'a.pdf');
    expect(chamadas).toHaveLength(2);
    expect(await (chamadas[1].corpo as Blob).text()).toContain('"parents":["pasta-velha"]');
  });

  it('a segunda vez não abre a janela do Google de novo (usa a autorização da memória)', async () => {
    const m = await carregar();
    const { pedidos } = googleFalso({ access_token: 'tok' });
    driveFalso(true);
    await m.salvarNoDrive(new Blob(['%PDF']), 'a.pdf');
    await m.salvarNoDrive(new Blob(['%PDF']), 'b.pdf');
    expect(pedidos).toHaveLength(1);
    expect(m.conectadoAoDrive()).toBe(true);
  });

  it('"Desconectar" esquece a autorização e avisa o Google', async () => {
    const m = await carregar();
    const { oauth2 } = googleFalso({ access_token: 'tok' });
    driveFalso(true);
    await m.salvarNoDrive(new Blob(['%PDF']), 'a.pdf');
    m.desconectarDrive();
    expect(oauth2.revoke).toHaveBeenCalledWith('tok');
    expect(m.conectadoAoDrive()).toBe(false);
  });

  it('se a pessoa não autoriza, nada é enviado', async () => {
    const m = await carregar();
    googleFalso({ error: 'access_denied' });
    const chamadas = driveFalso(false);
    await expect(m.salvarNoDrive(new Blob(['%PDF']), 'a.pdf')).rejects.toThrow(/não autorizou/);
    expect(chamadas).toHaveLength(0);
  });

  it('janela bloqueada pelo navegador vira uma mensagem clara', async () => {
    const m = await carregar();
    googleFalso({ tipoErro: 'popup_failed_to_open' });
    driveFalso(false);
    await expect(m.salvarNoDrive(new Blob(['%PDF']), 'a.pdf')).rejects.toThrow(/bloqueou a janela/);
  });

  it('autorização vencida (401): esquece o token para pedir de novo na próxima vez', async () => {
    const m = await carregar();
    googleFalso({ access_token: 'tok' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(m.salvarNoDrive(new Blob(['%PDF']), 'a.pdf')).rejects.toThrow();
    expect(m.conectadoAoDrive()).toBe(false);
  });
});
