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
- Próximo: Etapa 3 (conversão da imagem em pontos).

## Licenças de terceiros

- Fonte Atkinson Hyperlegible: SIL Open Font License 1.1 (Braille Institute).
- Cores digitais das linhas DMC: [makebead/craft-color-codes](https://github.com/makebead/craft-color-codes),
  CC BY 4.0. Tabela de conferência: [sharlagelfand/dmc](https://github.com/sharlagelfand/dmc), MIT.
- DMC é marca registrada da DMC. Este projeto não tem ligação com a empresa.
