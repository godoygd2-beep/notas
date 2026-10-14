/* Notas de escrita — telas e lógica. */
import { FIREBASE } from './config.js';
import { createFirebaseStore, createDemoStore } from './store.js';
import { paras, pText, toText, titleOf, wordsOf, mergeRuns, parasToHtml, speechToText, buildBlocks, toMd, toTxt, toDocx, versions, newest, conflictOf, maxOtherAt, esc } from './text.js';

export const VERSAO = '1.0.1';

const $ = s => document.querySelector(s);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const H = 3600e3, D = 24 * H;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } }
};

/* este aparelho */
const DEV = store.get('notas-dev') || (() => { const d = 'd' + uid(); store.set('notas-dev', d); return d; })();
const DEVNAME = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'celular' : 'computador';

const TYPES = [
  { id: 'Ideia', c: '--t-ideia', d: 'Uma ideia para desenvolver' },
  { id: 'Reflexão', c: '--t-reflexao', d: 'Pensamentos e observações' },
  { id: 'Cena', c: '--t-cena', d: 'Um trecho da história' },
  { id: 'Personagem', c: '--t-personagem', d: 'Quem é, como fala, o que quer' },
  { id: 'Diálogo', c: '--t-dialogo', d: 'Falas soltas' },
  { id: 'Frase', c: '--t-frase', d: 'Uma frase que não pode se perder' }
];
const PALETTE = ['#e6bf74', '#b6a0f2', '#80b4f2', '#88cb9c', '#6fc8c5', '#f095af', '#f2a46f', '#c5d66f'];
const IC = {
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  more: '<svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
  chev: '<svg class="i" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  pin: '<svg class="i" viewBox="0 0 24 24"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
  trash: '<svg class="i" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  copy: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  exp: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  user: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  out: '<svg class="i" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
  kbd: '<svg class="i" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
  install: '<svg class="i" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7"/><path d="m9 11 3 3 3-3"/></svg>',
  book: '<svg class="i" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  folder: '<svg class="i" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  focus: '<svg class="i" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  pencil: '<svg class="i" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  postit: '<svg class="i" viewBox="0 0 24 24"><path d="M15 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/><path d="M15 21v-4a2 2 0 0 1 2-2h4"/></svg>',
  select: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  branch: '<svg class="i" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="7" r="2.5"/><path d="M6 8.5v7"/><path d="M18 9.5c0 4.5-6 3.5-10.5 7"/></svg>',
  mic: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/></svg>',
  cloud: '<svg class="i" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>'
};

/* ---------- dados ---------- */
/* S.notes: notas da conta + rascunhos deste aparelho. Cada nota: {id, type, gid, nb, pinned, deleted, created, updated, v, html(calculado)} */
const S = { notes: [], groups: [], custom: [], cadernos: ['Geral'] };
const local = {};               /* por nota, só neste aparelho: {seen, hist, hi} */
const drafts = {};              /* notas novas ainda sem texto */
let DB = null, ME = null, demo = false;

const customT = id => S.custom.find(c => c.id === id);
function tInfo(id) {
  const s = TYPES.find(x => x.id === id);
  if (s) return { id: s.id, name: s.id, color: 'var(' + s.c + ')', d: s.d };
  const c = customT(id);
  if (c) return { id: c.id, name: c.name, color: c.color, nb: c.nb, custom: true, d: 'Post-it do caderno ' + c.nb };
  return { id: 'Ideia', name: 'Ideia', color: 'var(--t-ideia)', d: '' };
}
const typeColor = id => tInfo(id).color;
const typeName = id => tInfo(id).name;
const typesFor = nb => TYPES.map(t => tInfo(t.id)).concat(nb ? S.custom.filter(c => c.nb === nb).map(c => tInfo(c.id)) : []);
const grp = id => S.groups.find(g => g.id === id);
const L = id => local[id] || (local[id] = { seen: 0, hist: null, hi: 0 });

function cleanHtml(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  (function walk(node) {
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 8) { ch.remove(); return; }
      if (ch.nodeType !== 1) return;
      const tag = ch.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') { ch.remove(); return; }
      walk(ch);
      if (['B', 'STRONG', 'I', 'EM', 'BR', 'DIV', 'P'].includes(tag)) [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
      else ch.replaceWith(...ch.childNodes);
    });
  })(t.content);
  return t.innerHTML;
}
function fromDoc(d) {
  const nv = newest(d.v);
  return Object.assign({}, d, { html: cleanHtml(nv ? nv.html : ''), updated: Math.max(d.updated || 0, nv ? nv.at || 0 : 0), conflict: conflictOf(d.v) });
}
function applyData(data) {
  S.cadernos = Array.isArray(data.cadernos) && data.cadernos.length ? data.cadernos.slice() : ['Geral'];
  S.groups = data.groups || []; S.custom = data.postits || [];
  const docs = (data.notes || []).map(fromDoc);
  const ids = new Set(docs.map(n => n.id));
  Object.keys(drafts).forEach(id => { if (ids.has(id)) delete drafts[id]; });
  S.notes = docs.concat(Object.values(drafts));
}

const when = ts => {
  const d = Date.now() - ts;
  if (d < 60e3) return 'agora';
  if (d < H) return 'há ' + Math.floor(d / 60e3) + ' min';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (ts >= today.getTime()) return 'há ' + Math.floor(d / H) + ' h';
  if (ts >= today.getTime() - D) return 'ontem';
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
};
const fullDate = ts => new Date(ts).toLocaleString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', '');

/* ---------- estado da tela ---------- */
const app = $('#app'), body = $('#body');
const UI = { nb: store.get('notas-nb') || null, view: 'home', type: null, gid: null, q: '', open: null, sel: null, fmt: store.get('notas-fmt') || 'docx' };
const isDesk = () => matchMedia('(min-width:900px)').matches;
const live = () => S.notes.filter(n => !n.deleted && !n.draft);
const inNb = n => !UI.nb || n.nb === UI.nb;
const cur = () => S.notes.find(n => n.id === UI.open);

/* ---------- gravar na conta ---------- */
const meta = n => ({ type: n.type, gid: n.gid || null, nb: n.nb, pinned: !!n.pinned, deleted: n.deleted || null, created: n.created });
function writeMeta(n, fields) {
  if (n.draft) return;
  const p = { updated: Date.now() }; fields.forEach(f => { p[f] = n[f] === undefined ? null : n[f]; }); n.updated = p.updated;
  DB.set('notes', n.id, p).catch(erroGravar);
}
function writeText(n, html) {
  const at = Date.now();
  const entry = { html, at, seen: L(n.id).seen, name: DEVNAME };
  n.v = Object.assign({}, n.v, { [DEV]: entry }); n.html = html; n.updated = at; n.conflict = conflictOf(n.v);
  const p = { v: { [DEV]: entry }, updated: at };
  if (n.draft) { delete n.draft; delete drafts[n.id]; Object.assign(p, meta(n)); }
  DB.set('notes', n.id, p).catch(erroGravar);
}
let avisouErro = false;
function erroGravar(e) {
  if (avisouErro) return; avisouErro = true; setTimeout(() => { avisouErro = false; }, 20000);
  toast(e && e.code === 'permission-denied' ? 'A conta recusou a gravação. Confira se as regras do Firestore foram publicadas.' : 'Não deu para gravar agora. Tente de novo em instantes.');
}

/* ---------- botão voltar do celular: uma camada por vez ---------- */
const stack = []; const CW = typeof window.CloseWatcher === 'function';
let pendingBack = 0, queued = 0;
function histPush() { if (pendingBack) { queued++; return; } try { history.pushState({ notas: 1 }, ''); } catch (e) { /* ignora */ } }
function histBack() { if (queued) { queued--; return; } pendingBack++; try { history.back(); } catch (e) { pendingBack--; } }
function pushLayer(name, close) {
  const l = { name, close };
  if (CW) { try { l.w = new CloseWatcher(); l.w.onclose = () => { const i = stack.indexOf(l); if (i >= 0) { stack.splice(i, 1); l.close(); } }; } catch (e) { l.w = null; } }
  if (!l.w) { l.h = true; histPush(); }
  stack.push(l);
}
function removeLayer(l, fromPop) {
  const i = stack.indexOf(l); if (i < 0) return;
  stack.splice(i, 1);
  if (l.w) { try { l.w.destroy(); } catch (e) { /* ignora */ } } else if (l.h && !fromPop) histBack();
}
function dropLayer(name) { for (let i = stack.length - 1; i >= 0; i--) { if (stack[i].name === name) { removeLayer(stack[i], false); return; } } }
function closeTop(fromPop) {
  const l = stack[stack.length - 1]; if (!l) return false;
  if (!fromPop && l.name === 'home') return false;
  removeLayer(l, fromPop); l.close(); return true;
}
addEventListener('popstate', () => {
  if (pendingBack) { pendingBack--; if (!pendingBack) while (queued) { queued--; try { history.pushState({ notas: 1 }, ''); } catch (e) { /* ignora */ } } return; }
  closeTop(true);
});
/* na tela inicial, o primeiro voltar avisa; o segundo sai do app (volta a avisar depois de um novo toque) */
function armHome() { if (ME && !stack.length && !isDesk()) pushLayer('home', () => toast('Toque em voltar de novo para sair')); }
document.addEventListener('pointerdown', armHome, true);

/* ---------- coluna da esquerda ---------- */
function render() { renderHead(); renderList(); }
function renderHead() {
  const h = $('#head');
  $('#searchBox').hidden = UI.view !== 'home' || !!UI.sel;
  $('#fab').hidden = !!UI.sel; $('#selBar').hidden = !UI.sel;
  if (UI.sel) {
    const n = UI.sel.size;
    h.innerHTML = '<button class="icon-btn back" data-h="selx" aria-label="Cancelar seleção">' + IC.x + '</button><div class="head-title"><b>' + (n === 1 ? '1 selecionada' : n + ' selecionadas') + '</b></div><div class="spacer"></div><button class="txt-btn" data-h="selall">Todas</button>';
    $('#selExport').textContent = n ? 'Exportar (' + n + ')' : 'Exportar';
    $('#selExport').disabled = !n; $('#selDelete').disabled = !n;
    return;
  }
  if (UI.view === 'home') {
    h.innerHTML = '<button class="nb-btn" data-h="nb" aria-haspopup="dialog"><span>' + esc(UI.nb || 'Todos os cadernos') + '</span>' + IC.chev + '</button><div class="spacer"></div><button class="icon-btn" data-h="menu" aria-label="Menu">' + IC.more + '</button>';
  } else if (UI.view === 'theme') {
    const ti = tInfo(UI.type);
    h.innerHTML = '<button class="icon-btn back" data-h="back" aria-label="Voltar">' + IC.back + '</button><div class="head-title"><b><span class="dot" style="--c:' + ti.color + ';width:10px;height:10px"></span>' + esc(ti.name) + '</b><small>' + esc(ti.custom ? ti.nb : (UI.nb || 'Todos os cadernos')) + '</small></div><div class="spacer"></div><button class="icon-btn" data-h="themeMenu" aria-label="Opções do tema">' + IC.more + '</button>';
  } else {
    const g = grp(UI.gid);
    h.innerHTML = '<button class="icon-btn back" data-h="back" aria-label="Voltar">' + IC.back + '</button><div class="head-title"><b class="serif">' + esc(g ? g.name : '') + '</b><small>' + esc(typeName(UI.type)) + ' · ' + esc(g ? g.nb : '') + '</small></div><div class="spacer"></div><button class="icon-btn" data-h="groupMenu" aria-label="Opções do grupo">' + IC.more + '</button>';
  }
}
$('#head').addEventListener('click', e => {
  const b = e.target.closest('[data-h]'); if (!b) return;
  const a = b.dataset.h;
  if (a === 'nb') nbSheet(false);
  else if (a === 'menu') menuSheet();
  else if (a === 'back') popView();
  else if (a === 'themeMenu') themeMenu();
  else if (a === 'groupMenu') groupMenu();
  else if (a === 'selx') exitSelect();
  else if (a === 'selall') { shown.forEach(id => UI.sel.add(id)); render(); }
});
function hl(text, q) {
  if (!q) return esc(text);
  const i = norm(text).indexOf(norm(q));
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}
const snippet = (text, q) => { if (!q) return text; const i = norm(text).indexOf(norm(q)); return i > 50 ? '…' + text.slice(i - 30) : text; };
let shown = [];
function item(n, opt) {
  const { title, rest } = titleOf(n.html); const q = opt.q || '';
  const g = n.gid ? grp(n.gid) : null;
  let path = '';
  if (opt.showType) path += '<span class="dot" style="--c:' + typeColor(n.type) + '"></span><span class="tp" style="--c:' + typeColor(n.type) + '">' + esc(typeName(n.type)) + (g ? ' › ' + esc(g.name) : '') + '</span>';
  else if (g && opt.showGroup) path += '<span class="tp" style="--c:var(--fg-2)">' + esc(g.name) + '</span>';
  if (!UI.nb) path += (path ? '<span>·</span>' : '') + '<span class="nb">' + esc(n.nb) + '</span>';
  shown.push(n.id);
  const sel = UI.sel ? ' role="checkbox" aria-checked="' + UI.sel.has(n.id) + '"' : '';
  return '<button class="item' + (n.id === UI.open && isDesk() && !UI.sel ? ' active' : '') + '" data-id="' + n.id + '"' + sel + '>' +
    (UI.sel ? '<span class="check">' + IC.check + '</span>' : '') +
    '<span class="item-main"><span class="item-top">' + path + '<span class="when">' + when(n.updated) + '</span></span>' +
    '<h3>' + hl(title, q) + '</h3>' + (rest ? '<p>' + hl(snippet(rest, q), q) + '</p>' : '') +
    (n.conflict ? '<span class="flag">' + IC.branch + 'Duas versões</span>' : '') + '</span></button>';
}
const byUpd = (a, b) => b.updated - a.updated;
let installEvt = null;
function banners() {
  let h = '';
  if (demo) h += '<div class="banner"><span>Demonstração: notas de exemplo, só neste aparelho.</span><button class="btn" data-banner="sairDemo">Sair</button></div>';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!standalone && installEvt && !store.get('notas-noinstall')) h += '<div class="banner"><span>Instale o app para abrir direto da tela inicial.</span><button class="btn primary" data-banner="install">Instalar</button><button class="x" data-banner="noinstall" aria-label="Agora não">' + IC.x + '</button></div>';
  return h;
}
function renderList() {
  shown = [];
  const q = UI.q.trim(); let h = '';
  if (UI.view === 'home') {
    const all = live().filter(inNb).sort(byUpd);
    if (q) {
      const res = all.filter(n => norm(toText(n.html)).includes(norm(q)));
      h += '<div class="group">' + (res.length ? res.length + (res.length > 1 ? ' notas encontradas' : ' nota encontrada') : 'Busca') + '</div>';
      h += res.length ? '<div class="items">' + res.map(n => item(n, { showType: true, q })).join('') + '</div>' : '<div class="empty-list">Nenhuma nota com “' + esc(q) + '”.</div>';
    } else {
      if (!UI.sel) {
        h += banners();
        h += '<div class="posts">' + typesFor(UI.nb).map(t =>
          '<div class="post" style="--c:' + t.color + '"><button class="post-open" data-type="' + esc(t.id) + '">' + esc(t.name) + '</button>' +
          '<button class="post-add" data-add="' + esc(t.id) + '" aria-label="Nova nota em ' + esc(t.name) + '">' + IC.plus + '</button></div>').join('') + '</div>';
      }
      const pinned = all.filter(n => n.pinned), rec = all.filter(n => !n.pinned).slice(0, 30);
      if (pinned.length) h += '<div class="group">' + IC.pin + 'Fixadas</div><div class="items">' + pinned.map(n => item(n, { showType: true })).join('') + '</div>';
      h += '<div class="group">Recentes</div>';
      h += rec.length ? '<div class="items">' + rec.map(n => item(n, { showType: true })).join('') + '</div>' : '<div class="empty-list">Nenhuma nota ainda.<br>Toque num post-it ou em <b>Nova nota</b>.</div>';
    }
  } else if (UI.view === 'theme') {
    const notes = live().filter(n => n.type === UI.type && inNb(n)).sort(byUpd);
    const ct = customT(UI.type);
    const groups = S.groups.filter(g => g.type === UI.type && (!UI.nb || g.nb === UI.nb)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!UI.sel) {
      h += '<div class="group">Grupos</div><div class="groups">' + groups.map(g => {
        const c = notes.filter(n => n.gid === g.id).length;
        return '<button class="gcard" data-gid="' + g.id + '" style="--c:' + typeColor(UI.type) + '"><b>' + esc(g.name) + '</b><small>' + (c === 1 ? '1 nota' : c + ' notas') + (UI.nb || ct ? '' : ' · ' + esc(g.nb)) + '</small></button>';
      }).join('') + '<button class="gcard add" data-newgroup="1">' + IC.plus + 'Novo grupo</button></div>';
    }
    const loose = UI.sel ? notes : notes.filter(n => !n.gid || !grp(n.gid));
    h += '<div class="group">' + (UI.sel ? 'Notas do tema' : groups.length ? 'Sem grupo' : 'Notas') + '</div>';
    h += loose.length ? '<div class="items">' + loose.map(n => item(n, { showGroup: true })).join('') + '</div>'
      : '<div class="empty-list">' + (notes.length ? 'Todas as notas deste tema estão em grupos.' : 'Nenhuma nota de ' + esc(typeName(UI.type)) + ' ainda.<br>Toque em <b>Nova nota</b>.') + '</div>';
  } else {
    const notes = live().filter(n => n.gid === UI.gid).sort(byUpd);
    h += notes.length ? '<div class="items" style="padding-top:4px">' + notes.map(n => item(n, {})).join('') + '</div>'
      : '<div class="empty-list">Nenhuma nota neste grupo ainda.<br>Toque em <b>Nova nota</b>.</div>';
  }
  $('#list').innerHTML = h;
}
$('#q').addEventListener('input', e => { UI.q = e.target.value; renderList(); });

function openTheme(type) {
  UI.view = 'theme'; UI.type = type; UI.q = ''; $('#q').value = '';
  pushLayer('view', () => { UI.view = 'home'; render(); });
  render(); $('#list').scrollTop = 0;
}
function openGroup(gid) {
  UI.view = 'group'; UI.gid = gid;
  pushLayer('view', () => { UI.view = 'theme'; UI.gid = null; render(); });
  render(); $('#list').scrollTop = 0;
}
function popView() {
  for (let i = stack.length - 1; i >= 0; i--) { if (stack[i].name === 'view') { const l = stack[i]; removeLayer(l, false); l.close(); return; } }
  UI.view = 'home'; render();
}

/* toques na lista: abrir, segurar, selecionar */
let lp = null;
const listEl = $('#list');
listEl.addEventListener('pointerdown', e => {
  lp = null;
  const it = e.target.closest('.item'); if (!it || UI.sel) return;
  it.classList.add('held');
  lp = { id: it.dataset.id, el: it, x: e.clientX, y: e.clientY, fired: false,
    t: setTimeout(() => { lp.fired = true; lp.at = Date.now(); it.classList.remove('held'); try { navigator.vibrate && navigator.vibrate(12); } catch (_) { /* ignora */ } noteActions(it.dataset.id); }, 480) };
});
listEl.addEventListener('pointermove', e => { if (lp && !lp.fired && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.t); lp.el.classList.remove('held'); lp = null; } });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => listEl.addEventListener(ev, () => { if (lp && !lp.fired) { clearTimeout(lp.t); lp.el.classList.remove('held'); lp = null; } }));
listEl.addEventListener('contextmenu', e => {
  const it = e.target.closest('.item'); if (!it) return;
  e.preventDefault(); if (UI.sel) return;
  if (lp && lp.fired) return;
  if (lp) { clearTimeout(lp.t); lp.el.classList.remove('held'); lp = { fired: true, at: Date.now() }; }
  noteActions(it.dataset.id);
});
listEl.addEventListener('click', e => {
  if (lp && lp.fired && Date.now() - (lp.at || 0) < 1500) { lp = null; e.preventDefault(); return; }
  lp = null;
  const bn = e.target.closest('[data-banner]');
  if (bn) {
    const a = bn.dataset.banner;
    if (a === 'install') doInstall();
    else if (a === 'noinstall') { store.set('notas-noinstall', '1'); render(); }
    else if (a === 'sairDemo') { location.hash = ''; location.reload(); }
    return;
  }
  const it = e.target.closest('.item');
  if (it) {
    if (UI.sel) { const id = it.dataset.id; UI.sel.has(id) ? UI.sel.delete(id) : UI.sel.add(id); render(); }
    else openNote(it.dataset.id);
    return;
  }
  const add = e.target.closest('[data-add]'); if (add) { newNote({ type: add.dataset.add }); return; }
  const po = e.target.closest('[data-type]'); if (po) { openTheme(po.dataset.type); return; }
  const gc = e.target.closest('[data-gid]'); if (gc) { openGroup(gc.dataset.gid); return; }
  if (e.target.closest('[data-newgroup]')) newGroupSheet();
});

/* ---------- seleção ---------- */
function enterSelect(id) {
  if (UI.sel) return;
  UI.sel = new Set(id ? [id] : []);
  pushLayer('select', exitSelect);
  render();
}
function exitSelect() { dropLayer('select'); UI.sel = null; render(); }
$('#selExport').onclick = () => {
  const ids = [...UI.sel]; const notes = ids.map(id => S.notes.find(n => n.id === id)).filter(Boolean);
  exportSheet(notes, notes.length === 1 ? titleOf(notes[0].html).title : notes.length + ' notas');
};
$('#selDelete').onclick = () => {
  const ids = [...UI.sel]; const now = Date.now();
  if (ids.includes(UI.open)) closeEditor();
  ids.forEach(id => { const n = S.notes.find(x => x.id === id); if (n) n.deleted = now; });
  DB.batch(ids.map(id => ({ col: 'notes', id, data: { deleted: now, updated: now } }))).catch(erroGravar);
  exitSelect();
  toast(ids.length === 1 ? 'Nota movida para a lixeira' : ids.length + ' notas movidas para a lixeira', 'Desfazer', () => {
    ids.forEach(id => { const n = S.notes.find(x => x.id === id); if (n) n.deleted = null; });
    DB.batch(ids.map(id => ({ col: 'notes', id, data: { deleted: null, updated: Date.now() } }))).catch(erroGravar); render();
  });
};

/* ---------- abrir / fechar nota ---------- */
function histKey(id) { return 'notas-h-' + id; }
function loadHist(n) {
  const l = L(n.id);
  if (!l.hist) {
    try { const h = JSON.parse(store.get(histKey(n.id)) || 'null'); if (h && Array.isArray(h.hist) && h.hist[h.hi] === n.html) { l.hist = h.hist; l.hi = h.hi; } } catch (e) { /* ignora */ }
    if (!l.hist) { l.hist = [n.html]; l.hi = 0; }
  }
  if (l.hist[l.hi] !== n.html) { l.hist = l.hist.slice(0, l.hi + 1); l.hist.push(n.html); l.hi = l.hist.length - 1; }
}
function saveHist(id) {
  const l = local[id]; if (!l || !l.hist) return;
  const hist = l.hist.slice(-40), hi = Math.max(0, l.hi - (l.hist.length - hist.length));
  if (!store.set(histKey(id), JSON.stringify({ hist, hi }))) {
    Object.keys(localStorage).filter(k => k.startsWith('notas-h-')).forEach(k => store.del(k));
    store.set(histKey(id), JSON.stringify({ hist: hist.slice(-10), hi: Math.min(hi, 9) }));
  }
}
function openNote(id, focusEnd) {
  if (UI.open && UI.open !== id) leaveNote();
  const n = S.notes.find(x => x.id === id); if (!n) return;
  UI.open = id;
  L(id).seen = maxOtherAt(n.v, DEV);
  loadHist(n);
  body.innerHTML = n.html; dirty = false;
  $('#editor').hidden = false; $('#emptyEd').hidden = true;
  if (!isDesk() && !app.classList.contains('editing')) pushLayer('editor', () => closeEditor());
  app.classList.add('editing');
  renderMeta(); renderUndo(); setStatus(); renderList();
  $('#edScroll').scrollTop = 0;
  if (focusEnd) { body.focus(); caretEnd(); }
}
function leaveNote() {
  const n = cur(); if (!n) return;
  flushSnap(); saveNow(); saveHist(n.id);
  if (!toText(n.html).trim() && !n.conflict) {
    if (n.draft) { delete drafts[n.id]; S.notes = S.notes.filter(x => x !== n); }
    else { S.notes = S.notes.filter(x => x !== n); DB.del('notes', n.id).catch(erroGravar); store.del(histKey(n.id)); }
  }
}
function closeEditor() {
  dropLayer('editor'); exitFocus();
  leaveNote();
  UI.open = null; app.classList.remove('editing');
  $('#editor').hidden = true; $('#emptyEd').hidden = false;
  render();
}
$('#backBtn').onclick = () => closeEditor();
function newNote(o) {
  o = o || {};
  const type = o.type || (UI.view !== 'home' ? UI.type : 'Ideia');
  const gid = o.gid !== undefined ? o.gid : (UI.view === 'group' ? UI.gid : null);
  const g = gid ? grp(gid) : null, ct = customT(type);
  const now = Date.now();
  const n = { id: uid(), type, gid, nb: g ? g.nb : ct ? ct.nb : (UI.nb || 'Geral'), pinned: false, deleted: null, created: now, updated: now, html: '', v: {}, conflict: null, draft: true };
  drafts[n.id] = n; S.notes.push(n); openNote(n.id, true);
}
$('#fab').onclick = () => newNote();
function caretEnd() { const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function renderMeta() {
  const n = cur(); if (!n) return;
  const tc = $('#typeChip'); tc.querySelector('.dot').style.setProperty('--c', typeColor(n.type)); tc.lastElementChild.textContent = typeName(n.type);
  const g = n.gid ? grp(n.gid) : null;
  $('#groupChip').lastElementChild.textContent = g ? g.name : 'Grupo';
  $('#groupChip').classList.toggle('ghost', !g);
  $('#nbChip').lastElementChild.textContent = n.nb;
  $('#edDate').textContent = 'Criada em ' + fullDate(n.created);
  $('#conflictBar').hidden = !n.conflict;
  renderWords();
}
function renderWords() {
  const w = wordsOf(toText(body.innerHTML));
  const s = w === 1 ? '1 palavra' : w.toLocaleString('pt-BR') + ' palavras';
  $('#words').textContent = s; $('#focusWords').textContent = s;
}

/* ---------- salvar sozinho ---------- */
let saveT = null, dirty = false;
function setStatus(saving) {
  const n = cur();
  if (saving) { $('#status').textContent = 'Salvando…'; return; }
  const off = !navigator.onLine || (n && n._pending && !demo);
  $('#status').innerHTML = off ? IC.check + 'Salvo no aparelho' : IC.check + 'Salvo';
  $('#status').title = off ? 'Vai para a sua conta quando tiver internet' : '';
}
function saveNow() {
  clearTimeout(saveT); saveT = null;
  const n = cur(); if (!n) return;
  const h = body.innerHTML;
  if (h !== n.html) {
    if (toText(h).trim() || !n.draft) writeText(n, h);
    else { n.html = h; }
    renderList();
  }
  dirty = false; setStatus();
}
function scheduleSave() { dirty = true; setStatus(true); clearTimeout(saveT); saveT = setTimeout(saveNow, 1200); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flushSnap(); saveNow(); if (UI.open) saveHist(UI.open); } });
addEventListener('pagehide', () => { flushSnap(); saveNow(); if (UI.open) saveHist(UI.open); });
addEventListener('online', () => setStatus()); addEventListener('offline', () => setStatus());

/* ---------- desfazer / refazer ---------- */
let snapT = null;
function snap() {
  snapT = null;
  const n = cur(); if (!n) return;
  const l = L(n.id), h = body.innerHTML;
  if (l.hist[l.hi] === h) return;
  l.hist = l.hist.slice(0, l.hi + 1); l.hist.push(h);
  if (l.hist.length > 100) l.hist.shift();
  l.hi = l.hist.length - 1; renderUndo();
}
function flushSnap() { if (snapT) { clearTimeout(snapT); snap(); } }
function renderUndo() {
  const n = cur(), l = n && L(n.id);
  const changed = n && l.hist && body.innerHTML !== l.hist[l.hi];
  $('#undoBtn').disabled = !n || !l.hist || (l.hi <= 0 && !changed);
  $('#redoBtn').disabled = !n || !l.hist || l.hi >= l.hist.length - 1;
}
function undo() { const n = cur(); if (!n) return; flushSnap(); const l = L(n.id); if (l.hi <= 0) return; l.hi--; restore(n); }
function redo() { const n = cur(); if (!n) return; flushSnap(); const l = L(n.id); if (l.hi >= l.hist.length - 1) return; l.hi++; restore(n); }
function restore(n) { const l = L(n.id); body.innerHTML = l.hist[l.hi]; caretEnd(); saveNow(); saveHist(n.id); renderUndo(); renderWords(); }
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
body.addEventListener('input', () => {
  if (body.innerHTML === '<br>' || body.innerHTML === '<div><br></div>') body.innerHTML = '';
  clearTimeout(snapT); snapT = setTimeout(snap, 700);
  scheduleSave(); renderWords(); renderUndo(); fmtState();
});
body.addEventListener('paste', e => { e.preventDefault(); insertText((e.clipboardData || window.clipboardData).getData('text/plain')); });
function insertText(t) {
  t.replace(/\r\n?/g, '\n').split('\n').forEach((p, i) => { if (i) document.execCommand('insertParagraph'); if (p) document.execCommand('insertText', false, p); });
}

/* ---------- negrito / itálico ---------- */
function fmt(cmd) { body.focus(); restoreSel(); document.execCommand(cmd); flushSnap(); snap(); scheduleSave(); fmtState(); }
['#boldBtn', '#italicBtn', '#micBtn'].forEach(s => $(s).addEventListener('mousedown', e => e.preventDefault()));
$('#boldBtn').onclick = () => fmt('bold');
$('#italicBtn').onclick = () => fmt('italic');
function fmtState() {
  let b = false, i = false;
  try { b = document.queryCommandState('bold'); i = document.queryCommandState('italic'); } catch (e) { /* ignora */ }
  $('#boldBtn').setAttribute('aria-pressed', b && document.activeElement === body);
  $('#italicBtn').setAttribute('aria-pressed', i && document.activeElement === body);
}
let savedRange = null;
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && body.contains(s.anchorNode)) { savedRange = s.getRangeAt(0).cloneRange(); fmtState(); }
});
function restoreSel() {
  if (savedRange && body.contains(savedRange.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  else caretEnd();
}

/* ---------- modo foco ---------- */
function enterFocus() { if (app.classList.contains('focus')) return; app.classList.add('focus'); $('#editor').classList.add('focus'); $('#focusOut').hidden = false; $('#focusWords').hidden = false; pushLayer('focus', exitFocus); body.focus(); }
function exitFocus() { dropLayer('focus'); app.classList.remove('focus'); $('#editor').classList.remove('focus'); $('#focusOut').hidden = true; $('#focusWords').hidden = true; }
$('#focusBtn').onclick = enterFocus; $('#focusOut').onclick = exitFocus;

/* ---------- folhas ---------- */
const sheet = $('#sheet'), panel = $('#sheetPanel');
function openSheet(html, wide) {
  panel.innerHTML = html; panel.classList.toggle('wide', !!wide); panel.scrollTop = 0;
  if (sheet.hidden) { sheet.hidden = false; pushLayer('sheet', closeSheet); }
}
function closeSheet() { dropLayer('sheet'); sheet.hidden = true; stopVoice(true); }
$('#sheetBg').onclick = closeSheet;
let ctx = {};

panel.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.type) {
    const n = cur(); n.type = b.dataset.type; if (n.gid && (!grp(n.gid) || grp(n.gid).type !== n.type)) n.gid = null;
    writeMeta(n, ['type', 'gid']); renderMeta(); render(); closeSheet();
  }
  else if ('nb' in b.dataset) pickNb(b.dataset.nb);
  else if ('pickgid' in b.dataset) pickGroup(b.dataset.pickgid || null);
  else if (b.dataset.color) { ctx.color = b.dataset.color; panel.querySelectorAll('[data-color]').forEach(x => x.setAttribute('aria-checked', x === b)); const pv = $('#ptPreview'); if (pv) pv.style.setProperty('--c', ctx.color); }
  else if (b.dataset.fmt) { UI.fmt = b.dataset.fmt; store.set('notas-fmt', UI.fmt); panel.querySelectorAll('[data-fmt]').forEach(x => x.setAttribute('aria-checked', x.dataset.fmt === UI.fmt)); }
  else if (b.dataset.act) ACT[b.dataset.act](b);
});
panel.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'nbForm') {
    const v = $('#nbNew').value.trim(); if (!v) return;
    if (!S.cadernos.includes(v)) { S.cadernos.push(v); DB.setCadernos(S.cadernos).catch(erroGravar); }
    pickNb(v);
  } else if (f.id === 'groupForm') {
    const v = $('#gName').value.trim(); if (!v) return;
    const nbSel = $('#gNb');
    const g = { id: 'g' + uid(), name: v, type: ctx.type, nb: ctx.nb || (nbSel ? nbSel.value : 'Geral'), created: Date.now() };
    S.groups.push(g); DB.set('groups', g.id, g).catch(erroGravar);
    if (ctx.noteId) {
      const n = S.notes.find(x => x.id === ctx.noteId); n.gid = g.id; n.nb = g.nb; writeMeta(n, ['gid', 'nb']);
      if (n.id === UI.open) renderMeta();
    }
    closeSheet(); render(); toast('Grupo “' + v + '” criado');
  } else if (f.id === 'renameForm') {
    const v = $('#gRename').value.trim(); if (!v) return;
    const g = grp(ctx.gid); g.name = v; DB.set('groups', g.id, { name: v }).catch(erroGravar); closeSheet(); render(); if (UI.open) renderMeta();
  } else if (f.id === 'postitForm') {
    const v = $('#ptName').value.trim(); if (!v) return;
    const nbSel = $('#ptNb');
    if (ctx.editId) {
      const c = customT(ctx.editId); c.name = v; c.color = ctx.color; DB.set('postits', c.id, { name: v, color: ctx.color }).catch(erroGravar);
      closeSheet(); render(); if (UI.open) renderMeta(); toast('Post-it atualizado');
    } else {
      const nb = UI.nb || (nbSel ? nbSel.value : 'Geral');
      if (typesFor(nb).some(t => norm(t.name) === norm(v))) { toast('Já existe um post-it “' + v + '” em ' + nb + '.'); return; }
      const c = { id: 'c' + uid(), name: v, color: ctx.color, nb, created: Date.now() };
      S.custom.push(c); DB.set('postits', c.id, c).catch(erroGravar);
      closeSheet(); setNb(nb); render(); toast('Post-it “' + v + '” criado em ' + nb);
    }
  }
});
function setNb(v) { UI.nb = v || null; if (UI.nb) store.set('notas-nb', UI.nb); else store.del('notas-nb'); }

function typeSheet() {
  const n = cur();
  openSheet('<div class="sh-title">Tipo da nota</div>' + typesFor(n.nb).map(t =>
    '<button class="opt" data-type="' + esc(t.id) + '" role="menuitemradio" aria-checked="' + (n.type === t.id) + '"><span class="dot" style="--c:' + t.color + ';width:10px;height:10px"></span><span>' + esc(t.name) + '<span class="desc">' + esc(t.d) + '</span></span><span class="meta">' + (n.type === t.id ? IC.check : '') + '</span></button>').join(''));
}
function nbSheet(forNote) {
  const n = cur(); const sel = forNote ? n.nb : UI.nb;
  const cnt = c => live().filter(x => x.nb === c).length;
  let h = '<div class="sh-title">' + (forNote ? 'Mover para o caderno' : 'Cadernos') + '</div>';
  if (!forNote) h += '<button class="opt" data-nb="" aria-checked="' + (!UI.nb) + '">' + IC.book + '<span>Todos os cadernos</span><span class="meta">' + (!UI.nb ? IC.check : live().length) + '</span></button>';
  h += S.cadernos.map(c => '<button class="opt" data-nb="' + esc(c) + '" aria-checked="' + (sel === c) + '">' + IC.book + '<span>' + esc(c) + '</span><span class="meta">' + (sel === c ? IC.check : cnt(c)) + '</span></button>').join('');
  h += '<div class="sep"></div><form class="row-input" id="nbForm"><input id="nbNew" placeholder="Novo caderno (ex.: nome do livro)" maxlength="40" aria-label="Nome do novo caderno" autocomplete="off"><button class="btn" type="submit">Criar</button></form>';
  ctx = { mode: forNote ? 'note' : 'list' };
  openSheet(h);
}
function pickNb(v) {
  if (ctx.mode === 'note') {
    const n = cur();
    if (n.nb !== v) {
      n.nb = v; if (n.gid && (!grp(n.gid) || grp(n.gid).nb !== v)) n.gid = null;
      const ct = customT(n.type); let msg = 'Movida para ' + v;
      if (ct && ct.nb !== v) { n.type = 'Ideia'; n.gid = null; msg += '. O post-it “' + ct.name + '” é de outro caderno, então ela foi para Ideia.'; }
      writeMeta(n, ['nb', 'gid', 'type']); renderMeta(); toast(msg);
    }
  } else {
    setNb(v);
    if (UI.nb && UI.view !== 'home') {
      const ct = customT(UI.type), g = UI.view === 'group' ? grp(UI.gid) : null;
      if (ct && ct.nb !== UI.nb) { popView(); if (UI.view !== 'home') popView(); }
      else if (g && g.nb !== UI.nb) popView();
    }
  }
  closeSheet(); render();
}
function groupSheet(noteId) {
  const n = S.notes.find(x => x.id === noteId);
  const groups = S.groups.filter(g => g.type === n.type && g.nb === n.nb).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  ctx = { noteId, type: n.type, nb: n.nb };
  openSheet('<div class="sh-title">Grupo em ' + esc(typeName(n.type)) + '</div><div class="sh-sub">Grupos do caderno ' + esc(n.nb) + '.</div>' +
    '<button class="opt" data-pickgid="" aria-checked="' + (!n.gid) + '">' + IC.folder + '<span>Sem grupo</span><span class="meta">' + (!n.gid ? IC.check : '') + '</span></button>' +
    groups.map(g => '<button class="opt" data-pickgid="' + g.id + '" aria-checked="' + (n.gid === g.id) + '">' + IC.folder + '<span>' + esc(g.name) + '</span><span class="meta">' + (n.gid === g.id ? IC.check : '') + '</span></button>').join('') +
    '<div class="sep"></div><form class="row-input" id="groupForm"><input id="gName" placeholder="Novo grupo (ex.: nome do personagem)" maxlength="50" aria-label="Nome do novo grupo" autocomplete="off"><button class="btn" type="submit">Criar</button></form>');
}
function pickGroup(gid) {
  const n = S.notes.find(x => x.id === ctx.noteId);
  n.gid = gid; writeMeta(n, ['gid']);
  if (n.id === UI.open) renderMeta();
  closeSheet(); render();
  toast(gid ? 'Nota movida para “' + grp(gid).name + '”' : 'Nota sem grupo');
}
function nbDefault() { return UI.nb || (S.cadernos.find(c => c !== 'Geral') || 'Geral'); }
function newGroupSheet() {
  const ct = customT(UI.type);
  ctx = { type: UI.type, nb: ct ? ct.nb : UI.nb };
  const pickNbHtml = ctx.nb || S.cadernos.length < 2 ? '' : '<select id="gNb" aria-label="Caderno do grupo">' + S.cadernos.map(c => '<option' + (c === nbDefault() ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>';
  if (!ctx.nb && S.cadernos.length < 2) ctx.nb = S.cadernos[0];
  openSheet('<div class="sh-title">Novo grupo em ' + esc(typeName(UI.type)) + '</div><div class="sh-sub">' + (UI.type === 'Personagem' ? 'Por exemplo, um grupo para cada personagem.' : 'Junte as notas de ' + esc(typeName(UI.type)) + ' que andam juntas.') + '</div>' +
    '<form class="row-input" id="groupForm"><input id="gName" placeholder="Nome do grupo" maxlength="50" aria-label="Nome do grupo" autocomplete="off">' + pickNbHtml + '<button class="btn primary" type="submit">Criar</button></form>');
  setTimeout(() => { const i = $('#gName'); if (i) i.focus(); }, 60);
}
$('#typeChip').onclick = typeSheet;
$('#nbChip').onclick = () => nbSheet(true);
$('#groupChip').onclick = () => groupSheet(UI.open);

/* menus */
function menuSheet() {
  const t = S.notes.filter(n => n.deleted).length;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openSheet(
    '<button class="opt" data-act="exportPick">' + IC.exp + '<span>Exportar<span class="desc">Tudo, um caderno ou notas escolhidas</span></span></button>' +
    '<button class="opt" data-act="newPostit">' + IC.postit + '<span>Novo post-it<span class="desc">' + (UI.nb ? 'Só no caderno ' + esc(UI.nb) : 'Escolha o caderno') + '</span></span></button>' +
    '<button class="opt" data-act="selectMode">' + IC.select + '<span>Selecionar notas</span></button>' +
    '<button class="opt" data-act="trash">' + IC.trash + '<span>Lixeira<span class="desc">Notas excluídas ficam 30 dias</span></span><span class="meta">' + t + '</span></button>' +
    (isDesk() ? '<button class="opt" data-act="keys">' + IC.kbd + '<span>Atalhos do teclado</span></button>' : '') +
    (!standalone && installEvt ? '<button class="opt" data-act="install">' + IC.install + '<span>Instalar app</span></button>' : '') +
    '<div class="sep"></div>' +
    '<div class="acct">' + IC.user + '<span style="min-width:0"><b>' + esc(ME ? (ME.nome || 'Sua conta') : '') + '</b><small>' + esc(ME ? ME.email : '') + '</small></span></div>' +
    '<button class="opt" data-act="logout">' + IC.out + '<span>' + (demo ? 'Sair da demonstração' : 'Sair da conta') + '</span></button>' +
    '<div class="ver-line">Notas de escrita · versão ' + VERSAO + '</div>');
}
function themeMenu() {
  const n = live().filter(x => x.type === UI.type && inNb(x)).length;
  openSheet('<div class="sh-title">' + esc(typeName(UI.type)) + '</div>' +
    '<button class="opt" data-act="newGroup">' + IC.folder + '<span>Novo grupo</span></button>' +
    '<button class="opt" data-act="exportTheme">' + IC.exp + '<span>Exportar este tema<span class="desc">' + n + (n === 1 ? ' nota' : ' notas') + (UI.nb ? ' de ' + esc(UI.nb) : ' de todos os cadernos') + '</span></span></button>' +
    '<button class="opt" data-act="selectMode">' + IC.select + '<span>Selecionar notas</span></button>' +
    (customT(UI.type) ? '<div class="sep"></div>' +
      '<button class="opt" data-act="editPostit">' + IC.pencil + '<span>Editar post-it<span class="desc">Nome e cor</span></span></button>' +
      '<button class="opt danger" data-act="delPostitAsk">' + IC.trash + '<span>Excluir post-it<span class="desc">Você escolhe para onde vão as notas</span></span></button>' : ''));
}
function postitSheet(editId) {
  const c = editId ? customT(editId) : null;
  const usedHere = typesFor(UI.nb).map(t => t.color);
  ctx = { editId, color: c ? c.color : (PALETTE.find(p => !usedHere.includes(p)) || PALETTE[6]) };
  const nbHtml = (c || UI.nb || S.cadernos.length < 2) ? '' : '<div class="row-input"><select id="ptNb" aria-label="Caderno do post-it" style="flex:1">' + S.cadernos.map(x => '<option' + (x === nbDefault() ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div>';
  openSheet('<div class="sh-title">' + (c ? 'Editar post-it' : 'Novo post-it') + '</div><div class="sh-sub">' + (c ? 'Caderno ' + esc(c.nb) + '.' : UI.nb ? 'Aparece só na página do caderno ' + esc(UI.nb) + '.' : 'Aparece só na página do caderno que você escolher.') + '</div>' +
    '<form id="postitForm">' +
      '<div class="pt-row"><div class="post pt-preview" id="ptPreview" style="--c:' + ctx.color + '"><span id="ptPrevName">' + esc(c ? c.name : 'Nome') + '</span></div>' +
      '<div class="pt-fields"><input id="ptName" placeholder="Nome (ex.: Lugares)" maxlength="18" value="' + (c ? esc(c.name) : '') + '" aria-label="Nome do post-it" autocomplete="off">' +
      '<div class="swatches" role="radiogroup" aria-label="Cor">' + PALETTE.map(p => '<button type="button" class="sw" data-color="' + p + '" style="--c:' + p + '" role="radio" aria-checked="' + (p === ctx.color) + '" aria-label="Cor"></button>').join('') + '</div></div></div>' +
      nbHtml +
      '<div class="sh-actions"><button class="btn primary grow" type="submit">' + (c ? 'Salvar' : 'Criar post-it') + '</button></div>' +
    '</form>');
  const inp = $('#ptName');
  inp.addEventListener('input', () => { $('#ptPrevName').textContent = inp.value.trim() || 'Nome'; });
  setTimeout(() => inp.focus(), 60);
}
function groupMenu() {
  const g = grp(UI.gid); if (!g) return; ctx = { gid: g.id };
  openSheet('<div class="sh-title serif">' + esc(g.name) + '</div>' +
    '<button class="opt" data-act="exportGroup">' + IC.exp + '<span>Exportar este grupo</span></button>' +
    '<button class="opt" data-act="renameGroup">' + IC.pencil + '<span>Renomear</span></button>' +
    '<button class="opt" data-act="selectMode">' + IC.select + '<span>Selecionar notas</span></button>' +
    '<div class="sep"></div>' +
    '<button class="opt danger" data-act="delGroup">' + IC.trash + '<span>Excluir grupo<span class="desc">As notas continuam em ' + esc(typeName(g.type)) + ', sem grupo</span></span></button>');
}
function noteActions(id) {
  const n = S.notes.find(x => x.id === id); if (!n) return;
  ctx = { noteId: id };
  const g = n.gid ? grp(n.gid) : null;
  openSheet('<div class="sh-title serif">' + esc(titleOf(n.html).title) + '</div><div class="sh-sub">' + esc(typeName(n.type)) + (g ? ' › ' + esc(g.name) : '') + ' · ' + esc(n.nb) + '</div>' +
    '<button class="opt" data-act="pinNote">' + IC.pin + '<span>' + (n.pinned ? 'Desafixar' : 'Fixar no topo') + '</span></button>' +
    '<button class="opt" data-act="moveNote">' + IC.folder + '<span>Mover para um grupo</span></button>' +
    '<button class="opt" data-act="exportNote">' + IC.exp + '<span>Exportar esta nota</span></button>' +
    '<button class="opt" data-act="selectFrom">' + IC.select + '<span>Selecionar várias</span></button>' +
    '<div class="sep"></div>' +
    '<button class="opt danger" data-act="delNote">' + IC.trash + '<span>Excluir</span></button>');
}
function edMenuSheet() {
  const n = cur(); ctx = { noteId: n.id };
  openSheet(
    '<button class="opt" data-act="pinNote">' + IC.pin + '<span>' + (n.pinned ? 'Desafixar' : 'Fixar no topo') + '</span></button>' +
    '<button class="opt" data-act="focus">' + IC.focus + '<span>Modo foco<span class="desc">Só o texto na tela</span></span></button>' +
    '<button class="opt" data-act="exportNote">' + IC.exp + '<span>Exportar esta nota</span></button>' +
    '<button class="opt" data-act="copyNote">' + IC.copy + '<span>Copiar texto</span></button>' +
    '<div class="sep"></div>' +
    '<button class="opt danger" data-act="delNote">' + IC.trash + '<span>Mover para a lixeira</span></button>');
}
$('#edMenuBtn').onclick = () => { flushSnap(); saveNow(); edMenuSheet(); };

const ACT = {
  close() { closeSheet(); },
  trash() { trashSheet(); },
  install() { closeSheet(); doInstall(); },
  logout(b) {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.querySelector('span').textContent = 'Toque de novo para sair'; return; }
    closeSheet(); if (UI.open) closeEditor();
    DB.sair().catch(() => {}); if (!demo) store.del('notas-nb');
  },
  keys() {
    openSheet('<div class="sh-title">Atalhos no computador</div><div class="kbd-list">' +
      [['Alt + N', 'Nova nota'], ['Ctrl + F', 'Buscar'], ['Ctrl + Z', 'Desfazer'], ['Ctrl + Y', 'Refazer'], ['Ctrl + B', 'Negrito'], ['Ctrl + I', 'Itálico'], ['Ctrl + S', 'Salvar agora (já salva sozinho)'], ['Esc', 'Voltar uma etapa']]
        .map(k => '<kbd>' + k[0] + '</kbd><span>' + k[1] + '</span>').join('') + '</div>');
  },
  selectMode() { closeSheet(); enterSelect(); },
  selectFrom() { const id = ctx.noteId; closeSheet(); enterSelect(id); },
  exportPick() {
    const all = live();
    openSheet('<div class="sh-title">O que exportar?</div>' +
      '<button class="opt" data-act="exportAll">' + IC.book + '<span>Tudo<span class="desc">Todos os cadernos</span></span><span class="meta">' + all.length + '</span></button>' +
      S.cadernos.map((c, i) => '<button class="opt" data-act="exportNb" data-i="' + i + '">' + IC.book + '<span>Caderno ' + esc(c) + '</span><span class="meta">' + all.filter(n => n.nb === c).length + '</span></button>').join('') +
      '<div class="sep"></div><button class="opt" data-act="selectMode">' + IC.select + '<span>Escolher notas<span class="desc">Marque uma ou mais na lista</span></span></button>');
  },
  exportAll() { exportSheet(live(), 'Tudo'); },
  exportNb(b) { const c = S.cadernos[+b.dataset.i]; exportSheet(live().filter(n => n.nb === c), c); },
  exportTheme() { exportSheet(live().filter(n => n.type === UI.type && inNb(n)), typeName(UI.type) + (UI.nb ? ' - ' + UI.nb : '')); },
  exportGroup() { const g = grp(ctx.gid); exportSheet(live().filter(n => n.gid === g.id), g.name); },
  exportNote() { const n = S.notes.find(x => x.id === ctx.noteId); exportSheet([n], titleOf(n.html).title); },
  doExport() { doExport(); },
  newGroup() { newGroupSheet(); },
  newPostit() { postitSheet(null); },
  editPostit() { postitSheet(UI.type); },
  delPostitAsk() {
    const c = customT(UI.type);
    const cnt = S.notes.filter(n => n.type === c.id && !n.draft).length;
    const dest = typesFor(c.nb).filter(t => t.id !== c.id);
    openSheet('<div class="sh-title">Excluir o post-it “' + esc(c.name) + '”</div><div class="sh-sub">' + (cnt ? 'As ' + cnt + ' notas e os grupos dele vão para o post-it que você escolher. Nenhuma nota é apagada.' : 'Ele não tem notas.') + '</div>' +
      (cnt ? dest.map(t => '<button class="opt" data-act="delPostit" data-to="' + esc(t.id) + '"><span class="dot" style="--c:' + t.color + ';width:10px;height:10px"></span><span>Mover para ' + esc(t.name) + '</span></button>').join('')
        : '<div class="sh-actions"><button class="btn danger grow" data-act="delPostit" data-to="Ideia">Excluir post-it</button></div>'));
  },
  delPostit(b) {
    const c = customT(UI.type), to = b.dataset.to, now = Date.now(), ops = [];
    S.notes.forEach(n => { if (n.type === c.id) { n.type = to; if (!n.draft) ops.push({ col: 'notes', id: n.id, data: { type: to, updated: now } }); } });
    S.groups.forEach(g => { if (g.type === c.id) { g.type = to; ops.push({ col: 'groups', id: g.id, data: { type: to } }); } });
    ops.push({ col: 'postits', id: c.id, del: true });
    S.custom = S.custom.filter(x => x !== c);
    DB.batch(ops).catch(erroGravar);
    closeSheet(); popView(); if (UI.open) renderMeta();
    toast('Post-it excluído');
  },
  renameGroup() {
    const g = grp(ctx.gid);
    openSheet('<div class="sh-title">Renomear grupo</div><form class="row-input" id="renameForm"><input id="gRename" value="' + esc(g.name) + '" maxlength="50" aria-label="Nome do grupo" autocomplete="off"><button class="btn primary" type="submit">Salvar</button></form>');
    setTimeout(() => { const i = $('#gRename'); if (i) { i.focus(); i.select(); } }, 60);
  },
  delGroup(b) {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.querySelector('span').firstChild.textContent = 'Toque de novo para excluir o grupo'; return; }
    const g = grp(ctx.gid), now = Date.now(), ops = [];
    S.notes.forEach(n => { if (n.gid === g.id) { n.gid = null; if (!n.draft) ops.push({ col: 'notes', id: n.id, data: { gid: null, updated: now } }); } });
    ops.push({ col: 'groups', id: g.id, del: true });
    S.groups = S.groups.filter(x => x !== g);
    DB.batch(ops).catch(erroGravar);
    closeSheet(); popView(); if (UI.open) renderMeta();
    toast('Grupo excluído. As notas continuam em ' + typeName(g.type) + '.');
  },
  pinNote() { const n = S.notes.find(x => x.id === ctx.noteId); n.pinned = !n.pinned; writeMeta(n, ['pinned']); render(); closeSheet(); toast(n.pinned ? 'Nota fixada no topo' : 'Nota desafixada'); },
  moveNote() { groupSheet(ctx.noteId); },
  focus() { closeSheet(); enterFocus(); },
  copyNote() { copy(toText(body.innerHTML), 'Texto copiado'); closeSheet(); },
  delNote() {
    const n = S.notes.find(x => x.id === ctx.noteId); if (!n) return;
    closeSheet();
    if (n.id === UI.open) { flushSnap(); saveNow(); if (n.draft) { closeEditor(); return; } }
    n.deleted = Date.now(); writeMeta(n, ['deleted']);
    if (n.id === UI.open) closeEditor(); else render();
    const id = n.id;
    toast('Nota movida para a lixeira', 'Desfazer', () => { const x = S.notes.find(y => y.id === id); if (x) { x.deleted = null; writeMeta(x, ['deleted']); render(); } });
  },
  restore(b) {
    const n = S.notes.find(x => x.id === b.dataset.id); n.deleted = null;
    const f = ['deleted']; if (n.gid && !grp(n.gid)) { n.gid = null; f.push('gid'); }
    if (TYPES.every(t => t.id !== n.type) && !customT(n.type)) { n.type = 'Ideia'; f.push('type'); }
    writeMeta(n, f); render(); trashSheet(); toast('Nota restaurada');
  },
  purge(b) {
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmar'; b.classList.add('primary'); return; }
    S.notes = S.notes.filter(x => x.id !== b.dataset.id); DB.del('notes', b.dataset.id).catch(erroGravar); store.del(histKey(b.dataset.id)); trashSheet();
  },
  keepLocal() { resolveConflict('newest'); },
  keepOther() { resolveConflict('other'); },
  merge() { resolveConflict('merge'); },
  stopVoice() { stopVoice(false); }
};

function trashSheet() {
  const arr = S.notes.filter(n => n.deleted).sort((a, b) => b.deleted - a.deleted);
  let h = '<div class="sh-title">Lixeira</div><div class="sh-sub">Cada nota é apagada de vez 30 dias depois de excluída.</div>';
  if (!arr.length) h += '<div class="empty-list" style="padding:20px">A lixeira está vazia.</div>';
  h += arr.map(n => {
    const left = Math.max(1, 30 - Math.floor((Date.now() - n.deleted) / D));
    return '<div class="trash-item"><div class="tx"><b>' + esc(titleOf(n.html).title) + '</b><small>' + esc(typeName(n.type)) + ' · some em ' + left + ' dias</small></div>' +
      '<button class="btn" data-act="restore" data-id="' + n.id + '">Restaurar</button><button class="btn danger" data-act="purge" data-id="' + n.id + '">Apagar</button></div>';
  }).join('');
  openSheet(h);
}

/* ---------- exportar ---------- */
const FORMATS = [
  { id: 'docx', name: 'Word (.docx)', d: 'Mantém negrito e itálico. Bom para revisar o livro.' },
  { id: 'md', name: 'Markdown (.md)', d: 'Texto com marcações simples. Abre em qualquer editor.' },
  { id: 'txt', name: 'Texto (.txt)', d: 'Só o texto, sem formatação.' }
];
function exportSheet(notes, label) {
  if (UI.open) { flushSnap(); saveNow(); }
  notes = notes.filter(Boolean);
  ctx = { exp: notes, label };
  const types = new Set(notes.map(n => n.type)).size;
  openSheet('<div class="sh-title">Exportar</div><div class="sh-sub">' + esc(label) + ' · ' + notes.length + (notes.length === 1 ? ' nota' : ' notas') + (types > 1 ? ', organizadas por tema e grupo' : '') + '</div>' +
    FORMATS.map(f => '<button class="opt" data-fmt="' + f.id + '" role="radio" aria-checked="' + (UI.fmt === f.id) + '"><span class="radio"></span><span>' + f.name + '<span class="desc">' + f.d + '</span></span></button>').join('') +
    '<div class="sh-actions"><button class="btn primary grow" data-act="doExport"' + (notes.length ? '' : ' disabled') + '>Salvar arquivo</button></div>');
}
function doExport() {
  const { exp, label } = ctx; const f = UI.fmt;
  const B = buildBlocks(exp, label, {
    cadernos: S.cadernos, typesFor, groupName: id => (grp(id) || {}).name || null, fullDate,
    today: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  });
  const safe = label.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Notas';
  const d = new Date(); const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const filename = 'Notas de escrita - ' + safe + ' - ' + ds + '.' + f;
  const blob = f === 'docx' ? new Blob([toDocx(B)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    : new Blob([f === 'md' ? toMd(B) : toTxt(B)], { type: (f === 'md' ? 'text/markdown' : 'text/plain') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  closeSheet(); toast('Arquivo salvo em Downloads: ' + filename);
}

/* ---------- duas versões ---------- */
function diffHtml(a, b) {
  const la = toText(a).split('\n');
  return toText(b).split('\n').map(l => la.includes(l) ? esc(l) : '<span class="add">' + esc(l) + '</span>').join('\n');
}
const verLabel = e => e.dev === DEV ? 'Neste aparelho' : 'No ' + (e.name || 'outro aparelho');
function compareSheet() {
  const n = cur(); if (!n || !n.conflict) return;
  flushSnap(); saveNow();
  const c = conflictOf(n.v); if (!c) { renderMeta(); return; }
  const a = c.newest, b = c.other;
  openSheet('<div class="sh-title">Duas versões desta nota</div><div class="sh-sub">Os trechos em verde existem só naquela versão. Nada se perde até você escolher.</div>' +
    '<div class="versions">' +
      '<div class="ver"><div class="ver-h"><b>' + esc(verLabel(a)) + '</b><span>' + when(a.at) + '</span></div><div class="ver-b">' + diffHtml(b.html, a.html) + '</div><button class="btn" data-act="keepLocal">Ficar com esta</button></div>' +
      '<div class="ver"><div class="ver-h"><b>' + esc(verLabel(b)) + '</b><span>' + when(b.at) + '</span></div><div class="ver-b">' + diffHtml(a.html, b.html) + '</div><button class="btn" data-act="keepOther">Ficar com esta</button></div>' +
    '</div><div class="sh-actions"><button class="btn primary" data-act="merge">Juntar as duas</button></div>', true);
}
function resolveConflict(how) {
  const n = cur(); const c = conflictOf(n.v); if (!c) { closeSheet(); return; }
  let html = cleanHtml(c.newest.html);
  if (how === 'other') html = cleanHtml(c.other.html);
  if (how === 'merge') {
    const mine = toText(html).split('\n');
    const extra = paras(c.other.html).filter(p => { const t = pText(p); return t.trim() && !mine.includes(t); });
    html += parasToHtml(extra);
  }
  body.innerHTML = html;
  L(n.id).seen = maxOtherAt(n.v, DEV);
  writeText(n, html); flushSnap(); snap(); saveHist(n.id); renderMeta(); render(); closeSheet();
  toast(how === 'merge' ? 'Versões juntadas. Use Desfazer se não gostar.' : 'Pronto, ficou uma versão só. Dá para desfazer.');
}
$('#compareBtn').onclick = compareSheet;

/* ---------- ditado ---------- */
let rec = null, voiceRaw = '', voiceDone = false, voiceFinal = '';
function prevChar() {
  try { restoreSel(); const s = getSelection(); if (!s.rangeCount) return ''; const r = s.getRangeAt(0).cloneRange(); r.setStart(body, 0); return r.toString().slice(-3); }
  catch (e) { return ''; }
}
function voiceSheet() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Este navegador não tem ditado. Use o microfone do teclado do celular.'); return; }
  voiceRaw = ''; voiceFinal = ''; voiceDone = false;
  openSheet('<div class="voice" id="voiceBox"><div class="pulse">' + IC.mic + '</div><div class="voice-state" id="vState">Ouvindo… pode falar.</div>' +
    '<div class="voice-live" id="vLive"></div>' +
    '<div class="voice-help">Fale a pontuação: <code>vírgula</code> <code>ponto</code> <code>interrogação</code> <code>exclamação</code> <code>dois pontos</code> <code>nova linha</code> <code>travessão</code></div>' +
    '</div><div class="sh-actions"><button class="btn grow" data-act="close">Cancelar</button><button class="btn primary grow" data-act="stopVoice">Parar e inserir</button></div>');
  try {
    rec = new SR(); rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) voiceFinal += ' ' + e.results[i][0].transcript; else interim += ' ' + e.results[i][0].transcript; }
      voiceRaw = (voiceFinal + interim).trim(); showVoice();
    };
    rec.onerror = ev => {
      const st = $('#vState'); if (!st) return;
      const m = { 'not-allowed': 'O microfone está bloqueado. Permita o microfone para o app nas configurações do Chrome.', 'service-not-allowed': 'O microfone está bloqueado. Permita o microfone para o app nas configurações do Chrome.', network: 'O ditado precisa de internet.', 'no-speech': 'Não ouvi nada. Pode falar.', 'audio-capture': 'Não achei o microfone.' }[ev.error];
      if (m) st.textContent = m;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed' || ev.error === 'audio-capture') { $('#voiceBox').classList.add('idle'); voiceDone = true; }
    };
    rec.onend = () => { if (rec && !voiceDone) { try { rec.start(); } catch (e) { /* ignora */ } } };
    rec.start();
  } catch (e) { rec = null; const st = $('#vState'); if (st) st.textContent = 'Não deu para começar o ditado.'; }
}
function showVoice() { const l = $('#vLive'); if (l) l.textContent = speechToText(voiceRaw, ''); }
function stopVoice(cancel) {
  voiceDone = true;
  if (rec) { try { rec.stop(); } catch (e) { /* ignora */ } rec = null; }
  if (cancel) { voiceRaw = ''; return; }
  const raw = voiceRaw.trim(); voiceRaw = '';
  closeSheet();
  if (!raw) return;
  body.focus(); const p = prevChar();
  insertText(speechToText(raw, p));
  flushSnap(); snap(); scheduleSave(); renderWords(); renderUndo();
  toast('Texto do ditado inserido', 'Desfazer', undo);
}
$('#micBtn').onclick = voiceSheet;

/* ---------- avisos ---------- */
let toastT = null;
function toast(msg, label, fn) {
  const t = $('#toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (label ? '<button>' + esc(label) + '</button>' : '');
  t.hidden = false;
  if (label) t.querySelector('button').onclick = () => { t.hidden = true; fn(); };
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, label ? 5000 : 3000);
}
function copy(txt, msg) {
  const done = () => toast(msg);
  const fallback = () => { const a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) { /* ignora */ } a.remove(); done(); };
  try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
}

/* ---------- teclado do computador ---------- */
document.addEventListener('keydown', e => {
  if (!ME) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.key === 'Escape') { if (!CW && closeTop()) e.preventDefault(); return; }
  if (e.altKey && k === 'n') { e.preventDefault(); newNote(); return; }
  if (!mod) return;
  if (k === 'n') { e.preventDefault(); newNote(); }
  else if (k === 'f') {
    e.preventDefault();
    if (!sheet.hidden) closeSheet();
    if (UI.sel) exitSelect();
    if (app.classList.contains('focus')) exitFocus();
    if (UI.open && !isDesk()) closeEditor();
    while (UI.view !== 'home') popView();
    $('#q').focus(); $('#q').select();
  }
  else if (k === 's') { e.preventDefault(); flushSnap(); saveNow(); toast('Salvo'); }
  else if (document.activeElement === body && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (document.activeElement === body && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  else if (document.activeElement === body && (k === 'b' || k === 'i')) { setTimeout(() => { flushSnap(); snap(); scheduleSave(); fmtState(); }); }
});

/* ---------- teclado do celular ---------- */
function fit() { const vv = window.visualViewport; if (vv) document.documentElement.style.setProperty('--app-h', vv.height + 'px'); }
if (window.visualViewport) { visualViewport.addEventListener('resize', fit); fit(); }

/* ---------- instalar e atualizar ---------- */
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (ME && UI.view === 'home') renderList(); });
addEventListener('appinstalled', () => { installEvt = null; if (ME) renderList(); toast('App instalado. Abra pela tela inicial.'); });
async function doInstall() {
  if (!installEvt) { toast('No Chrome, toque no menu ⋮ e em “Instalar app”.'); return; }
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (e) { /* ignora */ }
  installEvt = null; renderList();
}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg => {
    const show = w => { $('#update').hidden = false; $('#updateBtn').onclick = () => { flushSnap(); saveNow(); w.postMessage('skip-waiting'); }; };
    if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60e3);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}

/* ---------- dados chegando da conta ---------- */
let first = true, purged = false;
function onData(st) {
  const lg = $('#login');
  if (st.fase === 'erro') { lg.hidden = false; $('#loginSpin').hidden = true; $('#loginBox').hidden = false; showLoginErr('Não deu para carregar o app. Confira a internet e abra de novo.'); return; }
  if (st.fase === 'login') {
    ME = null; lg.hidden = false; $('#loginSpin').hidden = true; $('#loginBox').hidden = false;
    S.notes = []; first = true; return;
  }
  if (st.fase === 'carregando') { lg.hidden = false; $('#loginSpin').hidden = false; $('#loginBox').hidden = true; return; }
  ME = st.user; demo = !!st.demo;
  if (st.erro === 'permission-denied') toast('A conta recusou o acesso às notas. Confira se as regras do Firestore foram publicadas.');
  applyData(st.data);
  lg.hidden = true;
  if (UI.nb && !S.cadernos.includes(UI.nb)) setNb(null);

  /* nota aberta: mostra a mudança feita em outro aparelho, se você não estiver no meio de uma edição */
  const n = cur();
  if (n) {
    const nv = newest(n.v);
    if (!dirty && !snapT && !n.conflict && nv && nv.dev !== DEV && n.html !== body.innerHTML) {
      const focused = document.activeElement === body;
      body.innerHTML = n.html; L(n.id).seen = maxOtherAt(n.v, DEV); loadHist(n);
      if (focused) caretEnd();
      renderUndo(); renderWords();
    }
    renderMeta(); setStatus();
  } else if (UI.open) { UI.open = null; app.classList.remove('editing'); $('#editor').hidden = true; $('#emptyEd').hidden = false; dropLayer('editor'); }
  if (UI.view === 'group' && !grp(UI.gid)) popView();
  if (UI.view === 'theme' && !TYPES.some(t => t.id === UI.type) && !customT(UI.type)) popView();

  if (!purged && st.fromServer) {
    purged = true; const lim = Date.now() - 30 * D;
    const old = S.notes.filter(x => x.deleted && x.deleted < lim);
    if (old.length) DB.batch(old.map(x => ({ col: 'notes', id: x.id, del: true }))).catch(() => {});
  }
  if (!sheet.hidden && panel.querySelector('.trash-item, .empty-list')) { /* deixa a folha como está */ }
  render();
  if (first) {
    first = false;
    if (isDesk() && !UI.open) {
      const f = live().sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated))[0];
      if (f) openNote(f.id);
    }
  }
}
function showLoginErr(m) { const e = $('#loginErr'); e.textContent = m; e.hidden = !m; }
$('#loginBtn').onclick = async () => {
  showLoginErr('');
  try { await DB.entrar(); }
  catch (e) {
    const m = { 'auth/network-request-failed': 'Sem internet. Conecte e tente de novo.', 'auth/unauthorized-domain': 'Este endereço ainda não está liberado no Firebase.' }[e && e.code];
    showLoginErr(m || 'Não deu para entrar. Tente de novo.');
  }
};

/* ---------- início ---------- */
demo = location.hash === '#demo';
DB = demo ? createDemoStore(DEV) : createFirebaseStore(FIREBASE);
DB.init(onData);
