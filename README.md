# Ballon d'Or, um retrato do futebol europeu

Site estático (HTML, CSS e JavaScript puro, sem etapa de build) em português, inglês e espanhol.
Endereço: https://eurofut.mapasolucoesdigitais.com.br

## Estrutura

```
index.html            página única
CNAME                 domínio do GitHub Pages
robots.txt, sitemap.xml
assets/styles.css     visual (camisas anos 90)
assets/fonts.css      fontes hospedadas no próprio site
assets/fonts/         Big Shoulders Display e Archivo (woff2)
assets/i18n.js        todos os textos em PT, EN e ES
assets/app.js         rankings, filtros, gráficos, perfis
assets/vendor/        Chart.js
data/data.js          votações 1956-2025 já padronizadas
data/bios.js          85 perfis pesquisados (PT/EN/ES)
```

## Publicar pelo GitHub (interface web)

1. Crie um repositório novo, por exemplo `eurofut`.
2. Em "Add file" > "Upload files", arraste **o conteúdo** desta pasta (não a pasta em si) e confirme.
3. Em Settings > Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)`.
4. Em Custom domain deve aparecer `eurofut.mapasolucoesdigitais.com.br` (vem do arquivo CNAME). Marque "Enforce HTTPS" quando liberar.

## DNS na Hostinger

Crie um registro **CNAME**:

| Tipo | Nome | Aponta para |
|---|---|---|
| CNAME | eurofut | `SEU-USUARIO.github.io` |

Troque `SEU-USUARIO` pela conta dona do repositório. A propagação costuma levar de minutos a algumas horas.

## Atualizar os dados

Os arquivos em `data/` são gerados a partir da planilha. Para incluir uma nova edição, basta acrescentar as linhas no mesmo formato de `data/data.js` (ano, posição, pontos, jogador, clubes, nacionalidade) ou pedir a regeneração a partir da planilha atualizada.
