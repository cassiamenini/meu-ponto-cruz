# Como ativar o botão "Salvar no meu Google Drive"

O código já está pronto. Falta só um **ID do cliente do Google**, que diz ao Google
"este pedido de autorização vem do site Meu Ponto Cruz". Ele é criado uma vez, por você,
no Google Cloud Console, com a sua conta Google. É gratuito.

> O ID do cliente **não é uma senha**: ele fica visível no site por natureza.
> Não existe "chave secreta" neste caso, porque o site não tem servidor.
> Nunca envie a ninguém a sua senha do Google.

Os nomes dos menus do Google mudam de vez em quando. Se algo não bater exatamente, procure
pelo nome mais parecido — e me mande uma foto da tela, que eu ajudo.

## 1. Criar o projeto

1. Entre em https://console.cloud.google.com com a sua conta Google.
2. No topo, clique no seletor de projetos → **Novo projeto**.
3. Nome: `Meu Ponto Cruz` → **Criar**. Confira que o projeto novo está selecionado no topo.

## 2. Ligar a API do Google Drive

1. Menu ☰ → **APIs e serviços** → **Biblioteca**.
2. Procure **Google Drive API** → abra → **Ativar**.

## 3. Tela de autorização (o que as pessoas vão ver)

Menu ☰ → **APIs e serviços** → **Tela de consentimento OAuth** (em versões novas:
**Google Auth Platform**). Se pedir para começar, clique em **Começar**.

- **Informações do app / Branding**
  - Nome do app: `Meu Ponto Cruz`
  - E-mail de suporte: o seu e-mail
  - Página inicial: `https://cassiamenini.github.io/meu-ponto-cruz/`
  - Política de privacidade: `https://cassiamenini.github.io/meu-ponto-cruz/privacidade.html`
  - E-mail de contato do desenvolvedor: o seu e-mail
- **Público / Audience**: escolha **Externo** (qualquer pessoa com conta Google).
- **Acesso a dados / Data access** → **Adicionar ou remover escopos**: marque somente
  `.../auth/drive.file` ("ver, editar, criar e excluir apenas os arquivos específicos do
  Google Drive que você usar com este app"). Esse escopo é classificado pelo Google como
  **não sensível**. **Não** marque `.../auth/drive` (acesso ao Drive inteiro).
- **Usuários de teste**: enquanto o app estiver em "Teste", adicione o seu e-mail
  (e o de quem for ajudar nos testes). Só essas pessoas conseguem usar o botão.

## 4. Criar o ID do cliente

1. **APIs e serviços** → **Credenciais** (ou **Google Auth Platform** → **Clientes**) →
   **Criar credenciais** → **ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**. Nome: `Site Meu Ponto Cruz`.
3. **Origens JavaScript autorizadas** — adicione as três:
   - `https://cassiamenini.github.io`
   - `http://localhost`
   - `http://localhost:5173`
4. **URIs de redirecionamento**: deixe vazio (não é preciso).
5. **Criar**. Vai aparecer um código terminado em `.apps.googleusercontent.com`.

## 5. Me mandar o ID

Copie o **ID do cliente** (o código terminado em `.apps.googleusercontent.com`) e me mande
aqui na conversa. Eu coloco no arquivo `src/config.ts`, publico e fazemos o teste:
você entra na sua conta na janela do Google; eu não vejo nem digito a sua senha.

## 6. Depois dos testes: liberar para todo mundo

Quando estiver tudo certo, volte em **Público / Audience** e clique em **Publicar app**
("Em produção"). Como o app usa só um escopo não sensível, o Google pede apenas a
verificação básica. Se o Google pedir para verificar o domínio `cassiamenini.github.io`
e isso não for possível, a saída é usar um domínio próprio (cerca de R$ 40 por ano no
Registro.br) — eu ajudo nessa hora.

## Como cancelar o acesso

Qualquer pessoa (inclusive você) pode cancelar a autorização em
https://myaccount.google.com/permissions, ou pelo botão "Desconectar o Google deste site"
que aparece depois de salvar.
