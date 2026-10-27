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
| `npm run build` | Gera a versão final do site na pasta `dist/` |

## Organização

```
index.html          estrutura da página
src/main.ts         liga as cinco etapas e o controle de tamanho da letra
src/telas/          conteúdo de cada etapa
src/estilos/        cores, fontes e layout
public/             arquivos copiados sem alteração (ícone)
```

## Situação

- **Fase 1, Etapa 0 (concluída):** casca das 5 etapas, tema acessível, controle de tamanho da letra.
- Próximo: publicar o site e, depois, a Etapa 1 (envio e recorte da imagem).

## Licenças de terceiros

- Fonte Atkinson Hyperlegible: SIL Open Font License 1.1 (Braille Institute).
