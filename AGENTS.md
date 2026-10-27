# AGENTS.md — Regras do Projeto

## LÍNGUA
- Todo o site tem de estar em português de Portugal (pt-PT), sem nenhum texto em inglês visível.
- Inclui `<title>`, meta description, textos alt e aria-labels em português.
- Usa vocabulário de Portugal (telemóvel, ecrã, utilizador) e trata o utilizador por "tu".
- Nomes de países, estações do ano e formatos de números e moeda em português (ex.: "90 €", "25 °C").
- O código, os comentários e os nomes dos ficheiros ficam em inglês.

## STACK (obrigatório)
- Apenas HTML + CSS + JavaScript puro (ES modules). Sem frameworks, sem bibliotecas, sem npm, sem build.
- Sem backend, sem base de dados, sem APIs externas e sem IA. Tudo corre no navegador.
- Só o Google Fonts é permitido como recurso externo.
- Sem localStorage nem sessionStorage: o estado fica em memória.
- Mobile-first, com boa experiência em telemóvel e computador.

## ESTRUTURA DE FICHEIROS
index.html
css/styles.css
js/app.js         — fluxo dos ecrãs e eventos
js/questions.js   — perguntas e opções (só dados)
js/countries.js   — países e dados (só dados)
js/scoring.js     — algoritmo, funções puras sem acesso ao DOM

## COMO CORRER LOCALMENTE
Como o projeto usa ES modules, não funciona com file://. Usa um servidor local:

  Opção 1 — Python (instalado por defeito no macOS/Linux)
    python3 -m http.server 8000
    Depois abre http://localhost:8000

  Opção 2 — Node.js (se tiveres instalado)
    npx serve .

  Opção 3 — VS Code Live Server extension

## CONVENÇÕES DE CÓDIGO
- Todos os nomes de variáveis, funções, ficheiros e comentários em inglês.
- Texto visível ao utilizador sempre em pt-PT.
- Funções em scoring.js são puras (sem acesso ao DOM nem efeitos secundários).
- Dados em questions.js e countries.js são const exportadas, sem lógica.
