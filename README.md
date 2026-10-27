# Meu Ponto Cruz

Aplicativo web gratuito, sem cadastro, que transforma uma imagem em gráfico de
ponto cruz com apostila em PDF. Todo o processamento acontece no navegador:
a imagem nunca sai do aparelho de quem usa.

## Como rodar no computador

Precisa do [Node.js](https://nodejs.org) (versão LTS) instalado.

```bash
npm install
```

```bash
npm run dev
```

Depois, abra http://localhost:5173 no navegador.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o site no computador, atualizando a cada alteração |
| `npm run verificar` | Procura erros no código |
| `npm run testar` | Roda os testes automáticos |
| `npm run catalogo` | Remonta o catálogo DMC a partir de `dados/fontes/` |
| `npm run build` | Gera a versão final do site na pasta `dist/` |

## Organização

```
index.html          estrutura da página
src/main.ts         liga as cinco etapas e o controle de tamanho da letra
src/estado.ts       o que a pessoa escolheu até agora (só na memória do navegador)
src/telas/          conteúdo de cada etapa
src/seguranca/      verificação dos arquivos enviados (tipo real, tamanho, limites)
src/imagem/         abrir, reduzir, girar, recortar e ajustar a luz da imagem
src/cores/          CIELAB e diferença de cor CIEDE2000
src/processamento/  conversão da imagem em gráfico (e o trabalhador em segundo plano)
src/grafico/        símbolos e desenho do gráfico (grade, réguas, centro)
src/pdf/            o PDF: apostila, gráfico paginado, legenda e estimativa de meadas
public/fonts/       fonte Atkinson Hyperlegible (TTF) usada dentro do PDF
src/catalogo/       catálogo DMC (dmc.json) e de onde veio cada dado (FONTES.md)
dados/fontes/       cópias das fontes originais usadas no catálogo
scripts/            montagem e conferência do catálogo
src/estilos/        cores, fontes e layout
public/             arquivos copiados sem alteração (ícone)
testes/             testes automáticos
```

## Limites de segurança das imagens

- Formatos: JPG, PNG e WebP, conferidos pelos primeiros bytes do arquivo (não pelo nome).
- Até 15 MB, até 12.000 pixels de lado e até 50 megapixels.
- A imagem é reduzida para no máximo 2.000 pixels e redesenhada, o que descarta dados
  escondidos da foto (como a localização GPS).
- Regras de proteção (Content-Security-Policy): o site só carrega arquivos dele mesmo
  e não se comunica com nenhum outro endereço.

## Situação

- **Fase 1, Etapa 0 (concluída):** casca das 5 etapas, tema acessível, controle de tamanho da letra.
- **Fase 1, Etapa 1 (concluída):** escolher ou arrastar a foto, verificação de segurança,
  recorte, giro, brilho e contraste.
- **Fase 1, Etapa 2 (concluída):** catálogo de 489 cores DMC com códigos e nomes conferidos
  no site oficial, cores aproximadas conferidas com outra tabela e com as fotos oficiais,
  e cálculo de diferença de cor CIEDE2000. Detalhes em [src/catalogo/FONTES.md](src/catalogo/FONTES.md).
- **Fase 1, Etapa 3 (concluída):** conversão da imagem em pontos (média em luz linear,
  k-means em CIELAB, linha DMC mais próxima por CIEDE2000, limpeza de pontos soltos e
  cores raras), em segundo plano (Web Worker), e tela 2 com nível, tamanho, tecido,
  número de cores, limpeza e prévia.
- **Fase 1, Etapa 4 (concluída):** tela 3 com o gráfico (40 símbolos de desenho próprio,
  réguas, linhas a cada 10 pontos, centro marcado), três modos (cores e símbolos, só
  símbolos, como vai ficar), ampliação, toque para identificar o ponto e legenda com
  destaque de cor.
- **Fase 1, Etapa 5 (concluída):** telas 4 e 5 e o PDF gerado no navegador (jsPDF), com
  Parte 1 (capa + guia para iniciantes com textos e desenhos próprios, sempre presente) e
  Parte 2 (resumo com imagens e medidas, legenda com estimativa de meadas e materiais,
  gráfico colorido e/ou preto e branco dividido em folhas A4 com réguas, marcação de 10 em 10,
  centro e mapa das folhas, instruções de impressão com régua de 10 cm).
- **Validação da Fase 1:** ver [docs/validacao-fase-1.md](docs/validacao-fase-1.md).
- **Fase 2 — fundo sem bordar (concluído):** opção "Fundo da imagem" (automático, não bordar
  o fundo, bordar tudo). O fundo é a cor que domina as bordas, ligada a elas; a mesma cor dentro
  do desenho continua bordada. No modo automático só sai fundo claro e liso.

## Ferramenta de desenvolvimento

`npm run testar` grava PDFs de exemplo em `dados/testes/`. Com `npm run dev` rodando, abra
`http://localhost:5173/ferramentas/ver-pdf.html?arquivo=exemplo-pequeno.pdf&paginas=1-3`
para ver as páginas (não faz parte do site publicado).

## Licenças de terceiros

- Fonte Atkinson Hyperlegible: SIL Open Font License 1.1 (Braille Institute); cópia da licença em `public/fonts/OFL.txt`.
- jsPDF: licença MIT.
- Cores digitais das linhas DMC: [makebead/craft-color-codes](https://github.com/makebead/craft-color-codes),
  CC BY 4.0. Tabela de conferência: [sharlagelfand/dmc](https://github.com/sharlagelfand/dmc), MIT.
- DMC é marca registrada da DMC. Este projeto não tem ligação com a empresa.
