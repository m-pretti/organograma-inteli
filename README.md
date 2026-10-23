# organograma-inteli

Organograma interativo da grade curricular dos cursos do Inteli.

- **Início:** um círculo (todos do mesmo tamanho) para cada curso.
- **Curso:** organograma radial. O nível aberto fica num círculo grande no centro e os itens dele em volta,
  ligados por traços; clicar em um item abre ele no centro (o anterior fecha). "Voltar", a trilha no topo ou Esc
  retornam ao nível anterior. "Por projeto" (Ano → Projeto → Disciplina → Assuntos) ou "Por disciplina"
  (Disciplina → Projeto → Assuntos). A busca lista os resultados e leva até eles.
- **Comparar:** dois cursos lado a lado. A *visão geral* separa os assuntos em "só no A", "em comum" e "só no B"
  (os em comum ganham anel, brilho e ✓). A *projeto a projeto* compara dois projetos e mostra um mapa de
  sobreposição entre todos os pares.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/ (estático, funciona em qualquer subcaminho)
```

## Deploy (GitHub Pages)

O workflow `.github/workflows/deploy.yml` builda e publica `dist/` a cada push na `main`.
Na primeira vez, em *Settings → Pages → Build and deployment*, escolha **Source: GitHub Actions**.
Endereço: https://m-pretti.github.io/organograma-inteli/

## Dados

- `src/data/base-comum.json`: Ano 1, currículo comum a todos os cursos.
- `src/data/cursos/<id>.json`: Anos 2 em diante de cada curso. O `<id>` é o de `CURSOS_INFO` em `src/data/index.ts`.
  Para adicionar um curso, inclua-o em `CURSOS_INFO` e crie o arquivo.

Formato de um ano: `{ numero, rotulo, titulo, descricao, projetos: [{ numero, titulo, descricao, areas: [{ nome, assuntos: [] }] }] }`.
O Ano 4 não tem projetos, só `trilhas: [{ nome, itens: [] }]`.

A comparação considera o mesmo assunto quando o texto é igual depois de tirar acentos, pontuação e maiúsculas.
Se dois cursos chamam a mesma coisa por nomes diferentes, padronize o texto nos JSON.

## Estilo

Tokens (cores, tipografia Platypi + Manrope, cantos retos, seções em faixas) vêm do kit do site do Inteli e
ficam em `src/styles/tokens.css`.
