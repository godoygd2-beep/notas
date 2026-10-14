// node tests/text.test.mjs
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { paras, pText, toText, titleOf, wordsOf, speechToText, buildBlocks, toMd, toTxt, toDocx, parasToHtml, conflictOf, newest, maxOtherAt, decode, mergeSpeech } from '../src/text.js';

let n = 0; const t = (name, fn) => { fn(); n++; };

t('parágrafos com div e linha vazia', () => {
  const ps = paras('<div>A</div><div><br></div><div>B <b>forte</b> e <i>leve</i></div>');
  assert.equal(ps.length, 3);
  assert.equal(pText(ps[0]), 'A'); assert.equal(ps[1].length, 0);
  assert.deepEqual(ps[2].map(r => [r.t, r.b, r.i]), [['B ', false, false], ['forte', true, false], [' e ', false, false], ['leve', false, true]]);
});
t('texto antes do primeiro div (Chrome)', () => {
  assert.equal(toText('Olá<div>mundo</div>'), 'Olá\nmundo');
});
t('br no meio da linha quebra', () => {
  assert.equal(toText('<div>um<br>dois</div>'), 'um\ndois');
});
t('entidades', () => {
  assert.equal(toText('<div>a &amp; b &lt;c&gt; &nbsp;d&#39;e</div>'), "a & b <c>  d'e");
  assert.equal(decode('&#x2014;'), '—');
});
t('linhas vazias repetidas viram uma', () => {
  assert.equal(toText('<div>A</div><div><br></div><div><br></div><div><br></div><div>B</div>'), 'A\n\nB');
});
t('título e resto', () => {
  const x = titleOf('<div><br></div><div>Título</div><div>linha 2</div><div>linha 3</div>');
  assert.equal(x.title, 'Título'); assert.equal(x.rest, 'linha 2 linha 3');
  assert.equal(titleOf('').title, 'Nota vazia');
});
t('palavras', () => { assert.equal(wordsOf('Ela abriu a porta — devagar, d’água.'), 6); });
t('ida e volta parágrafos → html', () => {
  const h = '<div>A <b>b</b></div><div><br></div><div><i>c</i></div>';
  assert.equal(parasToHtml(paras(h)), h);
});
t('ditado', () => {
  assert.equal(speechToText('ela abriu a porta devagar vírgula como quem pede licença ponto nova linha travessão quem está aí interrogação', ''), 'Ela abriu a porta devagar, como quem pede licença.\n— Quem está aí?');
  assert.equal(speechToText('e depois ponto final', 'texto anterior.'), ' E depois.');
  assert.equal(speechToText('mais um pouco', 'meio da frase'), ' mais um pouco');
  assert.equal(speechToText('vírgula e então', 'frase'), ', e então');
});
t('ditado do Android: pedaços repetidos e crescendo viram uma frase só', () => {
  const partes = ['Oi', 'oi bom', 'oi bom dia', 'isso', 'isso é um teste', 'vamos', 'vamos', 'vamos ver o', 'vamos ver o que', 'vamos ver o que você', 'vamos ver o que você sabe', 'vamos ver o que você sabe fazer'];
  assert.equal(mergeSpeech(partes), 'oi bom dia isso é um teste vamos ver o que você sabe fazer');
});
t('ditado: pedaço que repete tudo o que já veio', () => {
  assert.equal(mergeSpeech(['oi bom dia', 'oi bom dia isso é um teste']), 'oi bom dia isso é um teste');
});
t('ditado: pedaços normais (computador) só se juntam', () => {
  assert.equal(mergeSpeech(['ela abriu a porta', 'devagar vírgula como quem pede licença']), 'ela abriu a porta devagar vírgula como quem pede licença');
  assert.equal(mergeSpeech(['', ' oi ', null]), 'oi');
});
t('versões: sem conflito quando a mais nova viu a outra', () => {
  const v = { A: { html: 'x', at: 100, seen: 0 }, B: { html: 'y', at: 200, seen: 100 } };
  assert.equal(conflictOf(v), null); assert.equal(newest(v).dev, 'B');
});
t('versões: conflito quando editaram sem ver', () => {
  const v = { A: { html: 'x2', at: 300, seen: 50 }, B: { html: 'y', at: 200, seen: 100 } };
  const c = conflictOf(v); assert.ok(c); assert.equal(c.newest.dev, 'A'); assert.equal(c.other.dev, 'B');
});
t('versões: textos iguais não são conflito', () => {
  assert.equal(conflictOf({ A: { html: 'x', at: 300, seen: 0 }, B: { html: 'x', at: 200 } }), null);
});
t('versões: resolver (vê tudo) tira o conflito', () => {
  const v = { A: { html: 'x2', at: 300, seen: 50 }, B: { html: 'y', at: 200, seen: 100 } };
  v.A = { html: 'junto', at: 400, seen: maxOtherAt(v, 'A') };
  assert.equal(conflictOf(v), null);
});

const notes = [
  { html: '<div>Jeito de falar</div><div>Fala <b>baixo</b>.</div>', type: 'Personagem', gid: 'g1', nb: 'Meu livro', created: 2 },
  { html: '<div>Abertura</div><div>A chuva <i>parou</i>.</div>', type: 'Cena', gid: null, nb: 'Meu livro', created: 1 },
  { html: '<div>Lugar</div>', type: 'c_1', gid: null, nb: 'Meu livro', created: 3 },
  { html: '<div>Frase solta</div>', type: 'Frase', gid: null, nb: 'Geral', created: 4 }
];
const ctx = {
  cadernos: ['Geral', 'Meu livro'], today: '13 de outubro de 2026', fullDate: ts => 'dia ' + ts,
  typesFor: nb => [{ id: 'Ideia', name: 'Ideia' }, { id: 'Cena', name: 'Cena' }, { id: 'Personagem', name: 'Personagem' }, { id: 'Frase', name: 'Frase' }].concat(nb === 'Meu livro' ? [{ id: 'c_1', name: 'Lugares' }] : []),
  groupName: id => id === 'g1' ? 'O velho livreiro' : null
};
const B = buildBlocks(notes, 'Tudo', ctx);
t('exportação em Markdown', () => {
  const md = toMd(B);
  assert.match(md, /^# Notas de escrita — Tudo/);
  assert.ok(md.indexOf('## Geral') < md.indexOf('## Meu livro'));
  assert.match(md, /### Personagem › O velho livreiro\n\n#### Jeito de falar\n\n\*dia 2\*\n\nFala \*\*baixo\*\*\./);
  assert.match(md, /A chuva \*parou\*\./);
  assert.match(md, /### Lugares/);
});
t('exportação em texto', () => {
  const tx = toTxt(B);
  assert.match(tx, /MEU LIVRO\n-+/); assert.match(tx, /\[ Cena \]\n\nAbertura\n\(dia 1\)\nA chuva parou\./);
});
t('exportação em Word gera zip válido', () => {
  const bytes = toDocx(B);
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b);
  writeFileSync(new URL('./saida.docx', import.meta.url), bytes);
});
console.log(n + ' testes ok');
