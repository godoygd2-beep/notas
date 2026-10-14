/* Onde ficam as notas.
   - Firebase (projeto da Carteira): login com a conta Google; cada pessoa só lê e grava notas/{seu uid}
     (ver firestore.rules). O Firestore guarda uma cópia no aparelho: abre sem internet e envia depois.
   - Demonstração (#demo no endereço): notas de exemplo, só neste aparelho. */
import { textToHtml } from './text.js';

export const FIREBASE_VERSION = '12.19.0';
const BASE = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
export const FIREBASE_URLS = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => BASE + f);
const limpo = o => JSON.parse(JSON.stringify(o));
const COLS = { notes: 'notes', groups: 'groups', postits: 'postits' };

export function createFirebaseStore(cfg) {
  let F = null, A = null, auth = null, db = null, user = null, unsubs = [];
  let data = { notes: [], groups: [], postits: [], cadernos: null }, ready = { notes: false, groups: false, postits: false, user: false }, fromServer = false, cb = () => {};
  const allReady = () => ready.notes && ready.groups && ready.postits && ready.user;
  const emit = extra => cb(Object.assign({
    fase: user ? (allReady() ? 'pronto' : 'carregando') : 'login',
    user: user && { email: user.email, nome: user.displayName, uid: user.uid },
    data, fromServer
  }, extra || {}));

  async function load() {
    if (F) return;
    const [app, au, fs] = await Promise.all(FIREBASE_URLS.map(u => import(u)));
    A = au; F = fs;
    const fb = app.initializeApp(cfg, 'notas');
    auth = au.getAuth(fb);
    try { db = fs.initializeFirestore(fb, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
    catch (e) { db = fs.getFirestore(fb); }
  }
  const base = () => 'notas/' + user.uid;
  function parar() { unsubs.forEach(u => { try { u(); } catch (e) { /* ignora */ } }); unsubs = []; }
  function ouvir() {
    parar();
    data = { notes: [], groups: [], postits: [], cadernos: null };
    ready = { notes: false, groups: false, postits: false, user: false };
    Object.keys(COLS).forEach(k => {
      unsubs.push(F.onSnapshot(F.collection(db, base() + '/' + COLS[k]), { includeMetadataChanges: true }, snap => {
        data[k] = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id, _pending: d.metadata.hasPendingWrites }));
        ready[k] = true; if (k === 'notes') fromServer = !snap.metadata.fromCache;
        emit();
      }, e => emit({ erro: e.code || 'erro' })));
    });
    unsubs.push(F.onSnapshot(F.doc(db, base()), snap => {
      data.cadernos = snap.exists() && Array.isArray(snap.data().cadernos) ? snap.data().cadernos : null;
      ready.user = true; emit();
    }, e => { ready.user = true; emit({ erro: e.code || 'erro' }); }));
  }
  const ref = (col, id) => F.doc(db, base() + '/' + COLS[col] + '/' + id);

  return {
    modo: 'firebase',
    async init(onState) {
      cb = onState;
      try { await load(); } catch (e) { cb({ fase: 'erro', erro: 'sem-firebase' }); return; }
      try { await A.getRedirectResult(auth); } catch (e) { /* ignora */ }
      A.onAuthStateChanged(auth, u => { user = u; if (u) ouvir(); else parar(); emit(); });
    },
    async entrar() {
      await load();
      const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      try { await A.signInWithPopup(auth, p); }
      catch (e) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return A.signInWithRedirect(auth, p);
        if (e.code === 'auth/popup-closed-by-user') return;
        throw e;
      }
    },
    async sair() { parar(); await A.signOut(auth); },
    /* grava só os campos passados; mapas (como v) são mesclados, não substituídos */
    set(col, id, patch) { return F.setDoc(ref(col, id), limpo(patch), { merge: true }); },
    del(col, id) { return F.deleteDoc(ref(col, id)); },
    batch(list) {
      const b = F.writeBatch(db);
      list.forEach(o => o.del ? b.delete(ref(o.col, o.id)) : b.set(ref(o.col, o.id), limpo(o.data), { merge: true }));
      return b.commit();
    },
    setCadernos(arr) { return F.setDoc(F.doc(db, base()), { cadernos: arr.slice() }, { merge: true }); }
  };
}

/* ---------- Demonstração: tudo no aparelho ---------- */
const DEMO_KEY = 'notas-demo';
function deepMerge(a, b) {
  const out = Object.assign({}, a);
  Object.keys(b).forEach(k => { out[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') ? deepMerge(a[k], b[k]) : b[k]; });
  return out;
}
export function createDemoStore(dev) {
  let st = null, cb = () => {};
  const read = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) { return null; } };
  const save = () => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(st)); } catch (e) { /* cheio */ } };
  const emit = () => cb({ fase: 'pronto', user: { email: 'demonstração', nome: 'Demonstração', uid: 'demo' }, data: limpo(st), fromServer: true, demo: true });
  const change = () => { save(); setTimeout(emit, 0); return Promise.resolve(); };
  return {
    modo: 'demo',
    async init(onState) { cb = onState; st = read(); if (!st || !Array.isArray(st.notes)) { st = exemplo(dev); save(); } emit(); },
    async entrar() {}, async sair() { localStorage.removeItem(DEMO_KEY); location.hash = ''; location.reload(); },
    set(col, id, patch) { const arr = st[col]; const i = arr.findIndex(x => x.id === id); if (i < 0) arr.push(Object.assign({ id }, limpo(patch))); else arr[i] = deepMerge(arr[i], limpo(patch)); return change(); },
    del(col, id) { st[col] = st[col].filter(x => x.id !== id); return change(); },
    batch(list) { list.forEach(o => { if (o.del) st[o.col] = st[o.col].filter(x => x.id !== o.id); else { const arr = st[o.col]; const i = arr.findIndex(x => x.id === o.id); if (i < 0) arr.push(Object.assign({ id: o.id }, limpo(o.data))); else arr[i] = deepMerge(arr[i], limpo(o.data)); } }); return change(); },
    setCadernos(arr) { st.cadernos = arr.slice(); return change(); }
  };
}
function exemplo(dev) {
  const now = Date.now(), H = 3600e3, D = 24 * H;
  let k = 0; const id = () => 'ex' + (++k);
  const L = a => a.map(l => '<div>' + (l || '<br>') + '</div>').join('');
  const nota = (o, html, at) => Object.assign({ id: id(), gid: null, pinned: false, deleted: null, updated: at, v: { [dev]: { html, at, seen: 0, name: 'este aparelho' } } }, o);
  const gLiv = 'gex1', gProt = 'gex2', gCap = 'gex3';
  const notes = [
    nota({ type: 'Ideia', nb: 'Meu livro', pinned: true, created: now - 6 * D }, L(['E se o antagonista acreditasse que está salvando a cidade?', 'Ele não se vê como mau. Cada escolha dele tem uma lógica, e o leitor deveria <b>entender</b> antes de discordar.']), now - 40 * 60e3),
    nota({ type: 'Cena', nb: 'Meu livro', gid: gCap, created: now - 3 * D }, L(['Abertura', 'A chuva parou de repente, como se alguém tivesse desligado o céu.', 'Ela ficou parada na ponte, ouvindo a cidade voltar a respirar.']), now - 3 * H),
    nota({ type: 'Personagem', nb: 'Meu livro', gid: gLiv, created: now - 5 * D }, L(['Jeito de falar', 'Fala baixo e quase nunca termina as frases.', 'Guarda <b>um mapa</b> dentro de um dicionário de 1920.']), now - 1.2 * D),
    nota({ type: 'Personagem', nb: 'Meu livro', gid: gProt, created: now - 6 * D }, L(['Primeira impressão', 'Desconfia de quem sorri rápido demais. Anota tudo num caderno de capa <i>vermelha</i>.']), now - 20 * H),
    nota({ type: 'Diálogo', nb: 'Meu livro', created: now - 2 * D }, L(['— Você ainda acredita nisso?', '— Acredito que alguém precisa acreditar.']), now - 2 * D),
    nota({ type: 'Reflexão', nb: 'Geral', created: now - 4 * D }, L(['Escrever todo dia', 'Nem que seja uma frase. O hábito segura a história quando a inspiração some.']), now - 4 * D),
    nota({ type: 'Frase', nb: 'Geral', pinned: true, created: now - 9 * D }, textToHtml('A saudade é a memória com fome.'), now - 9 * D)
  ];
  /* uma nota com duas versões, para ver como fica */
  notes[1].v.outro = { html: L(['Abertura', 'A chuva parou de repente, como se alguém tivesse desligado o céu.', 'Ela ficou parada na ponte, ouvindo a cidade voltar a respirar.', 'Do outro lado, uma luz acendeu na janela da livraria. <i>Ele ainda estava lá.</i>']), at: now - 2 * H, seen: 0, name: 'computador' };
  notes[1].v[dev].seen = 0; notes[1].v[dev].at = now - 3 * H;
  return {
    cadernos: ['Geral', 'Meu livro'],
    groups: [
      { id: gLiv, name: 'O velho livreiro', type: 'Personagem', nb: 'Meu livro', created: now - 5 * D },
      { id: gProt, name: 'A protagonista', type: 'Personagem', nb: 'Meu livro', created: now - 6 * D },
      { id: gCap, name: 'Capítulo 3', type: 'Cena', nb: 'Meu livro', created: now - 3 * D }
    ],
    postits: [],
    notes
  };
}
