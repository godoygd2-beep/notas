# Notas de escrita

Bloco de notas para escrever: ideias, reflexões, cenas, personagens, diálogos e frases.

- Instala no celular (Android e iPhone) e no computador, e abre sem internet.
- Salva sozinho, tem desfazer/refazer, negrito e itálico, ditado por voz, modo foco, busca, lixeira de 30 dias.
- Tela inicial com post-its por tema; grupos dentro de cada tema (ex.: um por personagem); cadernos; post-its próprios por caderno.
- Exporta uma nota, várias, um tema, um grupo, um caderno ou tudo, em Word (.docx), Markdown (.md) ou Texto (.txt).
- Login com a conta Google. **Este repositório não tem nenhuma nota**: elas ficam no Firebase, e só a sua conta lê e grava.

## Como funciona

| Parte | O que faz |
|---|---|
| `index.html`, `style.css`, `src/` | o app (arquivos estáticos, sem etapa de build) |
| `src/main.js` | telas e lógica |
| `src/store.js` | login Google e dados no Firestore (`notas/{uid}`), com cópia no aparelho; modo demonstração (`#demo`) |
| `src/text.js` | texto das notas, ditado, exportação (Markdown, Texto, Word) e versões por aparelho |
| `sw.js` | funciona sem internet e avisa quando há versão nova |
| `firestore.rules` | regras do Firestore (projeto compartilhado com a Carteira) |
| `tests/text.test.mjs` | testes (`node tests/text.test.mjs`) |

### Duas versões da mesma nota

Cada aparelho grava a sua própria versão do texto (`v.{aparelho}`), com a hora e o que já tinha visto dos outros aparelhos. A versão mais nova é a que aparece. Se outro aparelho mudou a nota sem ter visto a mudança mais nova, o app mostra "Esta nota foi mudada no celular e no computador" e deixa escolher uma versão ou juntar as duas. Nada se perde.

## Publicar uma versão nova

Mude `VERSION` em `sw.js` e `VERSAO` em `src/main.js` e envie para `main`. O GitHub Actions roda os testes e publica em https://godoygd2-beep.github.io/notas/.

## Firebase

Usa o projeto da Carteira (`minha-carteira-5533e`): login Google já liberado para `godoygd2-beep.github.io`. As regras em `firestore.rules` incluem as da Carteira; publique sempre esse arquivo inteiro (Firestore → Regras).
