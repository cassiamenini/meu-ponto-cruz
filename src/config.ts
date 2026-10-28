// Configurações do aplicativo.

/**
 * ID do cliente OAuth do Google, criado no Google Cloud Console (veja docs/google-drive.md).
 * Não é uma senha: ele é público por natureza e aparece no navegador de quem usa o site.
 * Enquanto estiver vazio, o botão "Salvar no meu Google Drive" não aparece.
 * (Para testes, pode vir da variável de ambiente VITE_GOOGLE_CLIENT_ID.)
 */
export const GOOGLE_CLIENT_ID: string =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || '1000730464104-ru3sqlqmhs1c5o3eps2mnbpsri511ala.apps.googleusercontent.com';

/** Nome da pasta criada no Google Drive de cada pessoa para guardar as apostilas. */
export const PASTA_NO_DRIVE = 'Meu Ponto Cruz';
