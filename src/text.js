/* Texto das notas: parágrafos com negrito/itálico, títulos, contagem de palavras,
   ditado (comandos de pontuação) e exportação (Markdown, Texto, Word).
   Sem DOM: funciona no app e nos testes (node). */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
export function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* HTML do editor (só div, p, br, b, strong, i, em) → lista de parágrafos; cada um é uma lista de trechos {t, b, i}. */
export function paras(html) {
  const toks = (html || '').match(/<[^>]*>|[^<]+/g) || [];
  const out = [[]]; const cur = () => out[out.length - 1];
  let b = 0, i = 0, depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk[0] !== '<') { const t = decode(tk); if (t) cur().push({ t, b: b > 0, i: i > 0 }); continue; }
    const m = tk.match(/^<\s*(\/)?\s*([a-z0-9]+)/i); if (!m) continue;
    const close = !!m[1], tag = m[2].toLowerCase();
    if (tag === 'br') {
      const next = toks[k + 1] || '';
      const endsBlock = depth > 0 && /^<\s*\/\s*(div|p)\b/i.test(next);
      if (!endsBlock) out.push([]);
      continue;
    }
    if (tag === 'div' || tag === 'p') {
      if (!close) { if (cur().length) out.push([]); depth++; }
      else { out.push([]); depth = Math.max(0, depth - 1); }
      continue;
    }
    if (tag === 'b' || tag === 'strong') b += close ? -1 : 1;
    else if (tag === 'i' || tag === 'em') i += close ? -1 : 1;
    if (b < 0) b = 0; if (i < 0) i = 0;
  }
  const txt = p => p.map(r => r.t).join('');
  while (out.length && !txt(out[0]).trim()) out.shift();
  while (out.length && !txt(out[out.length - 1]).trim()) out.pop();
  const res = [];
  out.forEach(p => { const empty = !txt(p).trim(); if (empty && res.length && !txt(res[res.length - 1]).trim()) return; res.push(empty ? [] : p); });
  return res;
}
export const pText = p => p.map(r => r.t).join('');
export const toText = html => paras(html).map(pText).join('\n');
export const wordsOf = t => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
export function titleOf(html) {
  const t = toText(html).split('\n').map(s => s.trim()).filter(Boolean);
  return { title: t[0] || 'Nota vazia', rest: t.slice(1).join(' ') };
}
export function mergeRuns(runs) {
  const out = [];
  runs.forEach(r => { const l = out[out.length - 1]; if (l && l.b === !!r.b && l.i === !!r.i) l.t += r.t; else out.push({ t: r.t, b: !!r.b, i: !!r.i }); });
  return out;
}
/* parágrafos → HTML limpo do editor */
export function parasToHtml(ps) {
  return ps.map(p => '<div>' + (p.length ? mergeRuns(p).map(r => { let s = esc(r.t); if (r.i) s = '<i>' + s + '</i>'; if (r.b) s = '<b>' + s + '</b>'; return s; }).join('') : '<br>') + '</div>').join('');
}
export const textToHtml = t => t.split('\n').map(l => '<div>' + (l ? esc(l) : '<br>') + '</div>').join('');

/* ---------- ditado ---------- */
const CMDS = [
  [/ponto de interroga[cç][aã]o|interroga[cç][aã]o/, '?'],
  [/ponto de exclama[cç][aã]o|exclama[cç][aã]o/, '!'],
  [/ponto e v[ií]rgula/, ';'],
  [/dois pontos/, ':'],
  [/retic[eê]ncias/, '…'],
  [/v[ií]rgula/, ','],
  [/ponto final|ponto/, '.'],
  [/nova linha|novo par[aá]grafo|pr[oó]xima linha/, '\n'],
  [/abre aspas/, '“'], [/fecha aspas/, '”'],
  [/travess[aã]o/, '\n— ']
];
export function speechToText(raw, prev) {
  let s = ' ' + raw.toLowerCase() + ' ';
  CMDS.forEach(([re, rep]) => { s = s.replace(new RegExp('(^|\\s)(' + re.source + ')(?=\\s|$)', 'g'), (m, a) => a + '\u0000' + rep + '\u0000'); });
  s = s.replace(/\u0000/g, '');
  s = s.replace(/\s+([,.;:!?…”])/g, '$1').replace(/“\s+/g, '“').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{2,}—/g, '\n—').trim();
  s = s.replace(/([,.;:!?…])(?=[^\s\n,.;:!?…”])/g, '$1 ');
  const startCap = !prev || /[.!?…\n]\s*$/.test(prev);
  s = s.replace(/(^|[.!?…]\s+|\n(?:—\s)?)(\p{L})/gu, (m, a, ch, off) => (off === 0 && !startCap) ? m : a + ch.toUpperCase());
  if (prev && !/[\s\n]$/.test(prev) && !/^[,.;:!?…\n]/.test(s)) s = ' ' + s;
  return s;
}

/* ---------- exportação ---------- */
/* notes: [{html, type, gid, nb, created}]; ctx: {cadernos, typesFor(nb) → [{id,name}], groupName(gid) → nome|null, fullDate(ts), today} */
export function buildBlocks(notes, label, ctx) {
  const B = [];
  B.push({ k: 'h1', t: 'Notas de escrita — ' + label });
  B.push({ k: 'meta', t: 'Exportado em ' + ctx.today + ' · ' + notes.length + (notes.length === 1 ? ' nota' : ' notas') });
  const nbs = ctx.cadernos.filter(c => notes.some(n => n.nb === c));
  notes.forEach(n => { if (!nbs.includes(n.nb)) nbs.push(n.nb); });
  nbs.forEach(c => {
    B.push({ k: 'h2', t: c });
    const types = ctx.typesFor(c).slice();
    notes.forEach(n => { if (n.nb === c && !types.some(t => t.id === n.type)) types.push({ id: n.type, name: n.type }); });
    types.forEach(t => {
      const tn = notes.filter(n => n.nb === c && n.type === t.id); if (!tn.length) return;
      const gname = n => (n.gid && ctx.groupName(n.gid)) || null;
      const names = [...new Set(tn.map(gname))].sort((a, b) => a === null ? 1 : b === null ? -1 : a.localeCompare(b, 'pt-BR'));
      names.forEach(gn => {
        B.push({ k: 'h3', t: t.name + (gn ? ' › ' + gn : '') });
        tn.filter(n => gname(n) === gn).sort((a, b) => a.created - b.created).forEach(n => {
          const ps = paras(n.html);
          const first = ps.shift() || [{ t: 'Nota vazia' }];
          B.push({ k: 'h4', t: pText(first).trim() });
          B.push({ k: 'date', t: ctx.fullDate(n.created) });
          ps.forEach(p => B.push({ k: 'p', runs: p }));
        });
      });
    });
  });
  return B;
}
export function toMd(B) {
  const mdEsc = s => s.replace(/([\\*_`#\[\]])/g, '\\$1');
  const run = r => {
    if (!r.b && !r.i) return mdEsc(r.t);
    const m = r.t.match(/^(\s*)([\s\S]*?)(\s*)$/); if (!m[2]) return r.t;
    const mk = (r.b ? '**' : '') + (r.i ? '*' : '');
    return m[1] + mk + mdEsc(m[2]) + [...mk].reverse().join('') + m[3];
  };
  return B.map(b => {
    if (b.k === 'h1') return '# ' + b.t + '\n';
    if (b.k === 'meta') return '*' + b.t + '*\n';
    if (b.k === 'h2') return '\n## ' + b.t + '\n';
    if (b.k === 'h3') return '\n### ' + b.t + '\n';
    if (b.k === 'h4') return '\n#### ' + mdEsc(b.t) + '\n';
    if (b.k === 'date') return '*' + b.t + '*\n';
    return b.runs.length ? mergeRuns(b.runs).map(run).join('') + '\n' : '';
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
export function toTxt(B) {
  return B.map(b => {
    if (b.k === 'h1') return b.t + '\n' + '='.repeat(Math.min(60, b.t.length));
    if (b.k === 'meta') return b.t;
    if (b.k === 'h2') return '\n\n' + b.t.toUpperCase() + '\n' + '-'.repeat(Math.min(60, b.t.length));
    if (b.k === 'h3') return '\n[ ' + b.t + ' ]';
    if (b.k === 'h4') return '\n' + b.t;
    if (b.k === 'date') return '(' + b.t + ')';
    return pText(b.runs);
  }).join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
}

/* Word (.docx) feito à mão: um zip sem compressão com o documento e os estilos. */
export function toDocx(B) {
  const x = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const r = (t, o) => '<w:r>' + (o ? '<w:rPr>' + o + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + x(t) + '</w:t></w:r>';
  const p = (style, inner) => '<w:p>' + (style ? '<w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' : '') + inner + '</w:p>';
  let firstH1 = true;
  const body = B.map(b => {
    if (b.k === 'h1') return p('Title', r(b.t));
    if (b.k === 'meta') return p('Meta', r(b.t));
    if (b.k === 'h2') { const s = firstH1 ? 'Heading1First' : 'Heading1'; firstH1 = false; return p(s, r(b.t)); }
    if (b.k === 'h3') return p('Heading2', r(b.t));
    if (b.k === 'h4') return p('Heading3', r(b.t));
    if (b.k === 'date') return p('Meta', r(b.t));
    return p('', mergeRuns(b.runs).map(q => r(q.t, (q.b ? '<w:b/>' : '') + (q.i ? '<w:i/>' : ''))).join(''));
  }).join('');
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + '><w:body>' + body +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const st = (id, name, o, extra) => '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/><w:basedOn w:val="' + (extra || 'Normal') + '"/><w:next w:val="Normal"/><w:qFormat/>' + o + '</w:style>';
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '>' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia" w:cs="Georgia"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    st('Title', 'Title', '<w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/></w:rPr>') +
    st('Heading1', 'heading 1', '<w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="0" w:after="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr>') +
    st('Heading1First', 'Caderno', '<w:pPr><w:pageBreakBefore w:val="0"/><w:spacing w:before="480"/></w:pPr>', 'Heading1') +
    st('Heading2', 'heading 2', '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="555555"/><w:sz w:val="28"/></w:rPr>') +
    st('Heading3', 'heading 3', '<w:pPr><w:keepNext/><w:spacing w:before="280" w:after="40"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr>') +
    st('Meta', 'Meta', '<w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:i/><w:color w:val="888888"/><w:sz w:val="20"/></w:rPr>') +
    '</w:styles>';
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
    ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/_rels/document.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['word/document.xml', doc],
    ['word/styles.xml', styles]
  ]);
}

/* zip simples (sem compressão) */
let CRC = null;
function crc32(buf) {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zip(files) {
  const enc = new TextEncoder();
  const d = new Date(); const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(); const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const parts = [], central = []; let off = 0;
  files.forEach(([name, content]) => {
    const nm = enc.encode(name), data = typeof content === 'string' ? enc.encode(content) : content, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nm.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + data.length;
  });
  const cdSize = central.reduce((s, a) => s + a.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  const all = parts.concat(central, [new Uint8Array(e.buffer)]);
  const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0)); let p = 0; all.forEach(a => { out.set(a, p); p += a.length; });
  return out;
}

/* ---------- versões por aparelho ----------
   v = { idDoAparelho: {html, at, seen, name} }. Cada aparelho grava só a sua versão.
   A mais recente é a que aparece. Há duas versões quando outra versão mais nova do que
   o que a mais recente "viu" tem texto diferente. */
export function versions(v) { return Object.entries(v || {}).map(([dev, e]) => Object.assign({ dev }, e)).sort((a, b) => (b.at || 0) - (a.at || 0)); }
export function newest(v) { return versions(v)[0] || null; }
export function conflictOf(v) {
  const vs = versions(v); const n = vs[0]; if (!n) return null;
  const o = vs.slice(1).find(y => (y.at || 0) > (n.seen || 0) && y.html !== n.html);
  return o ? { newest: n, other: o } : null;
}
export function maxOtherAt(v, dev) { return versions(v).filter(e => e.dev !== dev).reduce((m, e) => Math.max(m, e.at || 0), 0); }
