"use strict";

/* ============================================================
   Conjugation engine
   ============================================================ */

const GODAN_I = { "う": "い", "く": "き", "ぐ": "ぎ", "す": "し", "つ": "ち", "ぬ": "に", "ぶ": "び", "む": "み", "る": "り" };
const GODAN_A = { "う": "わ", "く": "か", "ぐ": "が", "す": "さ", "つ": "た", "ぬ": "な", "ぶ": "ば", "む": "ま", "る": "ら" };
const GODAN_TE = { "う": "って", "つ": "って", "る": "って", "む": "んで", "ぶ": "んで", "ぬ": "んで", "く": "いて", "ぐ": "いで", "す": "して" };

const FORMS = [
  { key: "masu", label: "ます形 (polite)", hint: "polite present: 〜ます" },
  { key: "te", label: "て形 (te-form)", hint: "connective: 〜て/〜で" },
  { key: "nai", label: "ない形 (plain negative)", hint: "plain negative: 〜ない" },
  { key: "ta", label: "た形 (plain past)", hint: "plain past: 〜た/〜だ" },
  { key: "mashita", label: "ました (polite past)", hint: "polite past: 〜ました" },
];

// Conjugates the kana reading. type: godan | ichidan | suru | kuru
function conjugate(kana, type, form) {
  if (type === "suru") {
    const stem = kana.slice(0, -2) + "し";
    return { masu: stem + "ます", te: stem + "て", nai: stem + "ない", ta: stem + "た", mashita: stem + "ました" }[form];
  }
  if (type === "kuru") {
    return { masu: "きます", te: "きて", nai: "こない", ta: "きた", mashita: "きました" }[form];
  }
  if (type === "ichidan") {
    const stem = kana.slice(0, -1);
    return { masu: stem + "ます", te: stem + "て", nai: stem + "ない", ta: stem + "た", mashita: stem + "ました" }[form];
  }
  // godan
  const last = kana.slice(-1);
  const stem = kana.slice(0, -1);
  if (form === "masu") return stem + GODAN_I[last] + "ます";
  if (form === "mashita") return stem + GODAN_I[last] + "ました";
  if (form === "nai") {
    if (kana === "ある") return "ない"; // irregular
    return stem + GODAN_A[last] + "ない";
  }
  // te / ta
  let te = kana === "いく" ? "いって" : stem + GODAN_TE[last];
  if (form === "te") return te;
  return te.slice(0, -1) + (te.endsWith("て") ? "た" : "だ");
}

// A plausible wrong answer: conjugate as if the verb were the other class.
function wrongClassConjugate(kana, type, form) {
  if (type === "ichidan") return conjugate(kana, "godan", form);
  if (type === "godan" && (kana.slice(-1) === "る")) return conjugate(kana, "ichidan", form);
  if (type === "godan") {
    // wrong te/ta group, or wrong vowel row for masu/nai
    const last = kana.slice(-1), stem = kana.slice(0, -1);
    if (form === "te") return stem + (GODAN_TE[last] === "って" ? "いて" : "って");
    if (form === "ta") { const t = stem + (GODAN_TE[last] === "って" ? "いて" : "って"); return t.slice(0, -1) + "た"; }
    return stem + last + (form === "nai" ? "ない" : form === "masu" ? "ます" : "ました");
  }
  if (type === "kuru") return { masu: "くます", te: "くて", nai: "くない", ta: "くた", mashita: "くました" }[form];
  return conjugate(kana, "ichidan", form);
}

/* ============================================================
   SRS — simplified SM-2
   ============================================================ */

const DAY = 24 * 60 * 60 * 1000;

function newCardState() {
  return { ease: 2.5, ivl: 0, due: 0, reps: 0, lapses: 0 };
}

// grade: 0=Again 1=Hard 2=Good 3=Easy. Mutates c.
function gradeCard(c, grade) {
  const now = Date.now();
  c.reps++;
  if (grade === 0) {
    c.lapses++;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.ivl = 0;
    c.due = now + 60 * 1000; // requeued within the session
    return;
  }
  if (grade === 1) {
    c.ease = Math.max(1.3, c.ease - 0.15);
    c.ivl = Math.max(1, Math.round(c.ivl * 1.2)) || 1;
  } else if (grade === 2) {
    c.ivl = c.ivl === 0 ? 1 : c.ivl === 1 ? 3 : Math.round(c.ivl * c.ease);
  } else {
    c.ease += 0.15;
    c.ivl = c.ivl === 0 ? 2 : Math.round(Math.max(c.ivl * c.ease * 1.3, c.ivl + 2));
  }
  c.due = now + c.ivl * DAY;
}

function intervalPreview(c, grade) {
  const copy = { ...c };
  gradeCard(copy, grade);
  if (grade === 0) return "<1m";
  return copy.ivl >= 30 ? Math.round(copy.ivl / 30) + "mo" : copy.ivl + "d";
}

/* ============================================================
   Persistent state
   ============================================================ */

const STORE_KEY = "nihongo-trainer-v1";

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted -> start fresh */ }
  return {
    cards: {},          // id -> SRS state (only once introduced)
    intro: {},          // dateStr -> {vocab, kanji} new cards introduced that day
    log: {},            // dateStr -> {reviews, correct, grammar, grammarCorrect}
    settings: { newVocab: 8, newKanji: 3, furigana: true },
  };
}

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function logEvent(field, ok) {
  const t = todayStr();
  const l = S.log[t] || (S.log[t] = { reviews: 0, correct: 0, grammar: 0, grammarCorrect: 0 });
  l[field]++;
  if (ok) l[field === "reviews" ? "correct" : "grammarCorrect"]++;
  save();
}

function streak() {
  let n = 0;
  const d = new Date();
  // today counts if studied; otherwise start from yesterday
  const t = todayStr();
  if (!S.log[t]) d.setDate(d.getDate() - 1);
  for (; ;) {
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (S.log[key]) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

/* ============================================================
   Decks & queues
   ============================================================ */

const DECKS = {
  vocab: { items: VOCAB, front: v => `<div class="big-jp">${v.jp}</div>`, back: v => `<div class="reading">${v.kana}</div><div class="meaning">${v.en}</div>` },
  kanji: {
    items: KANJI,
    front: k => `<div class="big-jp">${k.ch}</div>`,
    back: k => `
      <div class="meaning">${k.meaning}</div>
      <div class="readings"><span class="rlabel">音</span> ${k.on} <span class="rlabel">訓</span> ${k.kun}</div>
      <div class="story">${k.story}</div>
      <div class="examples">${k.examples.map(e => `<div><span class="ex-jp">${e[0]}</span> <span class="ex-kana">${e[1]}</span> — ${e[2]}</div>`).join("")}</div>`,
  },
};

function deckOf(id) { return id.startsWith("k") ? "kanji" : "vocab"; }
function itemById(id) { return (deckOf(id) === "kanji" ? KANJI : VOCAB).find(x => x.id === id); }

function dueCards() {
  const now = Date.now();
  return Object.keys(S.cards).filter(id => S.cards[id].due <= now && itemById(id));
}

function newAvailable(deck) {
  const t = todayStr();
  const introToday = (S.intro[t] || {})[deck] || 0;
  const limit = deck === "vocab" ? S.settings.newVocab : S.settings.newKanji;
  const remaining = Math.max(0, limit - introToday);
  const pool = DECKS[deck].items.filter(it => !S.cards[it.id]);
  return { remaining: Math.min(remaining, pool.length), pool };
}

function introduceNew(deck, count) {
  const t = todayStr();
  const { pool } = newAvailable(deck);
  const taken = pool.slice(0, count);
  const intro = S.intro[t] || (S.intro[t] = { vocab: 0, kanji: 0 });
  for (const it of taken) S.cards[it.id] = newCardState();
  intro[deck] += taken.length;
  save();
  return taken.map(it => it.id);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pick(arr, n) { return shuffle(arr.slice()).slice(0, n); }

/* ============================================================
   UI plumbing
   ============================================================ */

const $view = () => document.getElementById("view");

function render(html) { $view().innerHTML = html; }

function setTab(name) {
  document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
}

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

/* ============================================================
   Screens
   ============================================================ */

function showToday() {
  setTab("today");
  const due = dueCards();
  const nv = newAvailable("vocab"), nk = newAvailable("kanji");
  const st = streak();
  render(`
    <div class="hero">
      <div class="streak">${st > 0 ? "🔥 " + st + " day streak" : "Start your streak today"}</div>
    </div>
    <div class="menu">
      <button class="menu-btn primary" onclick="startFullSession()">
        ▶ Full session
        <span class="sub">reviews + new cards + grammar (~25 min)</span>
      </button>
      <button class="menu-btn" onclick="startReview()" ${due.length ? "" : "disabled"}>
        Reviews <span class="badge">${due.length}</span>
        <span class="sub">cards due now</span>
      </button>
      <button class="menu-btn" onclick="startNew()" ${nv.remaining + nk.remaining ? "" : "disabled"}>
        New cards <span class="badge">${nv.remaining + nk.remaining}</span>
        <span class="sub">${nv.remaining} vocab · ${nk.remaining} kanji left today</span>
      </button>
      <button class="menu-btn" onclick="startConjugation()">
        活用 Conjugation drill
        <span class="sub">ます・て・ない・た forms — 10 questions</span>
      </button>
      <button class="menu-btn" onclick="startParticles()">
        は・が・を Particle drill
        <span class="sub">fill in the blank — 10 questions</span>
      </button>
    </div>
  `);
}

/* ---------- flashcard session ---------- */

let Q = null; // active session

function startReview() { runCards(shuffle(dueCards()), "Reviews"); }

function startNew() {
  const nv = newAvailable("vocab"), nk = newAvailable("kanji");
  const ids = [...introduceNew("vocab", nv.remaining), ...introduceNew("kanji", nk.remaining)];
  if (!ids.length) return showToday();
  runCards(shuffle(ids), "New cards");
}

function startFullSession() {
  const due = shuffle(dueCards());
  const nv = newAvailable("vocab"), nk = newAvailable("kanji");
  const fresh = shuffle([...introduceNew("vocab", nv.remaining), ...introduceNew("kanji", nk.remaining)]);
  const queue = [...due, ...fresh];
  if (!queue.length) return startConjugation(true);
  runCards(queue, "Session", () => startConjugation(true));
}

function runCards(queue, title, onDone) {
  if (!queue.length) { showToday(); return; }
  Q = { queue, title, done: 0, total: queue.length, onDone };
  nextCard();
}

function nextCard() {
  if (!Q.queue.length) {
    const after = Q.onDone, total = Q.total;
    Q = null;
    if (after) return after();
    return render(`
      <div class="finish">
        <div class="finish-emoji">🎉</div>
        <h2>Done!</h2>
        <p>${total} cards reviewed</p>
        <button class="menu-btn primary" onclick="showToday()">Back</button>
      </div>`);
  }
  const id = Q.queue[0];
  const item = itemById(id);
  const deck = DECKS[deckOf(id)];
  const isNew = S.cards[id].reps === 0;
  render(`
    <div class="progress"><div style="width:${(Q.done / Q.total) * 100}%"></div></div>
    <div class="card" id="card">
      ${isNew ? '<div class="new-tag">NEW</div>' : ""}
      <div class="card-front">${deck.front(item)}</div>
      <div class="card-back hidden" id="back">${deck.back(item)}</div>
    </div>
    <div class="answer-area" id="answerArea">
      <button class="show-btn" onclick="flipCard()">Show answer</button>
    </div>
  `);
}

function flipCard() {
  const id = Q.queue[0];
  const c = S.cards[id];
  document.getElementById("back").classList.remove("hidden");
  document.getElementById("answerArea").innerHTML = `
    <div class="grades">
      <button class="grade again" onclick="answer(0)">Again<span>${intervalPreview(c, 0)}</span></button>
      <button class="grade hard" onclick="answer(1)">Hard<span>${intervalPreview(c, 1)}</span></button>
      <button class="grade good" onclick="answer(2)">Good<span>${intervalPreview(c, 2)}</span></button>
      <button class="grade easy" onclick="answer(3)">Easy<span>${intervalPreview(c, 3)}</span></button>
    </div>`;
}

function answer(grade) {
  const id = Q.queue.shift();
  gradeCard(S.cards[id], grade);
  logEvent("reviews", grade > 0);
  if (grade === 0) {
    // see it again a few cards later
    Q.queue.splice(Math.min(3, Q.queue.length), 0, id);
    Q.total++;
  }
  Q.done++;
  save();
  nextCard();
}

/* ---------- conjugation drill ---------- */

let G = null; // active grammar drill

function startConjugation(chained) {
  const qs = [];
  const verbs = pick(VERBS, 10);
  for (const v of verbs) {
    const form = FORMS[Math.floor(Math.random() * FORMS.length)];
    const correct = conjugate(v.kana, v.type, form.key);
    const wrongs = new Set();
    wrongs.add(wrongClassConjugate(v.kana, v.type, form.key));
    // wrong forms of the right verb as additional distractors
    for (const f of shuffle(FORMS.slice())) {
      if (wrongs.size >= 3) break;
      const w = conjugate(v.kana, v.type, f.key);
      if (w !== correct) wrongs.add(w);
    }
    wrongs.delete(correct);
    qs.push({
      prompt: `<div class="q-form">${form.label}</div><div class="q-word">${v.dict}<span class="q-kana">${v.kana}</span></div><div class="q-en">${v.en} · ${v.type === "godan" ? "godan (u-verb)" : v.type === "ichidan" ? "ichidan (ru-verb)" : "irregular"}</div>`,
      choices: shuffle([correct, ...[...wrongs].slice(0, 3)]),
      correct,
      why: form.hint,
    });
  }
  runDrill(qs, "Conjugation", chained ? () => startParticles(true) : null);
}

/* ---------- particle drill ---------- */

function startParticles(chained) {
  const ALL_P = ["は", "が", "を", "に", "で", "へ", "と", "から", "まで", "も", "の", "か"];
  const qs = pick(PARTICLES, 10).map(p => {
    let choices;
    if (p.twoBlanks) {
      choices = shuffle(["から / まで", "まで / から", "に / まで", "から / に"]);
      return { prompt: particlePrompt(p), choices, correct: "から / まで", why: p.why, en: p.en };
    }
    const banned = new Set([p.a, ...(p.alts || [])]);
    const wrongs = pick(ALL_P.filter(x => !banned.has(x)), 3);
    choices = shuffle([p.a, ...wrongs]);
    return { prompt: particlePrompt(p), choices, correct: p.a, why: p.why, en: p.en };
  });
  runDrill(qs, "Particles", null, true); // particles is the last stage of a chained session
}

// Converts 漢字[よみ] markup to <ruby> furigana, or strips the readings
// entirely when furigana is switched off in Settings.
function rubify(s) {
  const RUBY = /([一-鿿々]+)\[([^\]]+)\]/g;
  return S.settings.furigana === false
    ? s.replace(RUBY, "$1")
    : s.replace(RUBY, "<ruby>$1<rt>$2</rt></ruby>");
}

function particlePrompt(p) {
  return `<div class="q-sentence">${rubify(p.s).replace(/＿/g, '<span class="blank">＿</span>')}</div>`;
}

/* ---------- shared drill runner ---------- */

function runDrill(qs, title, onDone, hasHint) {
  G = { qs, i: 0, correct: 0, title, onDone, hasHint };
  nextDrillQ();
}

function nextDrillQ() {
  if (G.i >= G.qs.length) {
    const pct = Math.round((G.correct / G.qs.length) * 100);
    const after = G.onDone, score = `${G.correct}/${G.qs.length}`;
    G = null;
    window.__afterDrill = after;
    return render(`
      <div class="finish">
        <div class="finish-emoji">${pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
        <h2>${score} correct</h2>
        ${after ? `<button class="menu-btn primary" onclick="__afterDrill()">Continue session ▶</button>` : ""}
        <button class="menu-btn ${after ? "" : "primary"}" onclick="showToday()">Back</button>
      </div>`);
  }
  const q = G.qs[G.i];
  render(`
    <div class="progress"><div style="width:${(G.i / G.qs.length) * 100}%"></div></div>
    <div class="drill-q">${q.prompt}</div>
    ${G.hasHint ? `<button class="hint-btn" id="hintBtn" onclick="showHint()">show English</button><div class="hint hidden" id="hint">${q.en || ""}</div>` : ""}
    <div class="choices" id="choices">
      ${q.choices.map((c, idx) => `<button class="choice" onclick="answerDrill(${idx})">${esc(c)}</button>`).join("")}
    </div>
    <div id="feedback"></div>
  `);
}

function showHint() {
  document.getElementById("hint").classList.remove("hidden");
  document.getElementById("hintBtn").classList.add("hidden");
}

function answerDrill(idx) {
  const q = G.qs[G.i];
  const chosen = q.choices[idx];
  const ok = chosen === q.correct;
  if (ok) G.correct++;
  logEvent("grammar", ok);
  document.querySelectorAll(".choice").forEach((b, i) => {
    b.disabled = true;
    if (q.choices[i] === q.correct) b.classList.add("right");
    else if (i === idx) b.classList.add("wrong");
  });
  document.getElementById("feedback").innerHTML = `
    <div class="why ${ok ? "ok" : "no"}">
      <b>${ok ? "正解！" : "→ " + esc(q.correct)}</b> ${q.why}${q.en && !G.hasHint ? `<div class="why-en">${q.en}</div>` : ""}
    </div>
    <button class="menu-btn primary" onclick="G.i++; nextDrillQ()">Next</button>`;
}

/* ---------- browse ---------- */

function showBrowse() {
  setTab("browse");
  const learned = id => S.cards[id] ? "learned" : "";
  render(`
    <h2>Decks</h2>
    <details>
      <summary>Vocabulary (${VOCAB.length}) — ${VOCAB.filter(v => S.cards[v.id]).length} learning</summary>
      <div class="list">${VOCAB.map(v => `<div class="row ${learned(v.id)}"><span class="row-jp">${v.jp}</span><span class="row-kana">${v.kana}</span><span class="row-en">${v.en}</span></div>`).join("")}</div>
    </details>
    <details>
      <summary>Kanji (${KANJI.length}) — ${KANJI.filter(k => S.cards[k.id]).length} learning</summary>
      <div class="list">${KANJI.map(k => `<div class="row ${learned(k.id)}"><span class="row-jp">${k.ch}</span><span class="row-kana">${k.kun} / ${k.on}</span><span class="row-en">${k.meaning}</span></div>`).join("")}</div>
    </details>
    <details>
      <summary>Verbs (${VERBS.length})</summary>
      <div class="list">${VERBS.map(v => `<div class="row"><span class="row-jp">${v.dict}</span><span class="row-kana">${v.kana} · ${v.type}</span><span class="row-en">${v.en}</span></div>`).join("")}</div>
    </details>
  `);
}

/* ---------- stats ---------- */

function showStats() {
  setTab("stats");
  const learning = Object.keys(S.cards).length;
  const mature = Object.values(S.cards).filter(c => c.ivl >= 21).length;
  const now = Date.now();
  const dueTomorrow = Object.values(S.cards).filter(c => c.due > now && c.due <= now + DAY).length;
  const days = Object.keys(S.log).sort().slice(-14);
  const totalReviews = Object.values(S.log).reduce((a, l) => a + l.reviews + l.grammar, 0);
  render(`
    <h2>Stats</h2>
    <div class="stat-grid">
      <div class="stat"><b>${streak()}</b><span>day streak</span></div>
      <div class="stat"><b>${learning}</b><span>cards learning</span></div>
      <div class="stat"><b>${mature}</b><span>mature (3wk+)</span></div>
      <div class="stat"><b>${dueTomorrow}</b><span>due in 24h</span></div>
      <div class="stat"><b>${totalReviews}</b><span>total answers</span></div>
      <div class="stat"><b>${VOCAB.length + KANJI.length - learning}</b><span>cards remaining</span></div>
    </div>
    <h3>Last 14 days</h3>
    <div class="history">
      ${days.length ? days.map(d => {
        const l = S.log[d];
        const acc = l.reviews + l.grammar ? Math.round(((l.correct + l.grammarCorrect) / (l.reviews + l.grammar)) * 100) : 0;
        return `<div class="hist-row"><span>${d.slice(5)}</span><span>${l.reviews} cards · ${l.grammar} grammar</span><span>${acc}%</span></div>`;
      }).join("") : "<p>No study history yet.</p>"}
    </div>
  `);
}

/* ---------- settings ---------- */

function showSettings() {
  setTab("settings");
  render(`
    <h2>Settings</h2>
    <label class="setting">New vocab per day: <b id="nvVal">${S.settings.newVocab}</b>
      <input type="range" min="0" max="20" value="${S.settings.newVocab}"
        oninput="document.getElementById('nvVal').textContent=this.value"
        onchange="S.settings.newVocab=+this.value; save()">
    </label>
    <label class="setting">New kanji per day: <b id="nkVal">${S.settings.newKanji}</b>
      <input type="range" min="0" max="10" value="${S.settings.newKanji}"
        oninput="document.getElementById('nkVal').textContent=this.value"
        onchange="S.settings.newKanji=+this.value; save()">
    </label>
    <label class="setting toggle">
      <input type="checkbox" ${S.settings.furigana === false ? "" : "checked"}
        onchange="S.settings.furigana=this.checked; save()">
      Furigana on kanji in grammar drills
    </label>
    <h3>Backup</h3>
    <button class="menu-btn" onclick="exportProgress()">Export progress</button>
    <button class="menu-btn" onclick="importProgress()">Import progress</button>
    <textarea id="backup" placeholder="Exported progress appears here. Paste a backup here and tap Import."></textarea>
    <h3>Danger zone</h3>
    <button class="menu-btn danger" onclick="resetProgress()">Reset all progress</button>
  `);
}

function exportProgress() {
  document.getElementById("backup").value = JSON.stringify(S);
  document.getElementById("backup").select();
  try { navigator.clipboard.writeText(JSON.stringify(S)); } catch (e) { }
}

function importProgress() {
  try {
    const data = JSON.parse(document.getElementById("backup").value);
    if (!data.cards || !data.settings) throw new Error("bad format");
    S = data; save(); alert("Progress imported!"); showToday();
  } catch (e) { alert("That doesn't look like a valid backup."); }
}

function resetProgress() {
  if (confirm("Really delete ALL progress? This cannot be undone.")) {
    localStorage.removeItem(STORE_KEY);
    S = load(); showToday();
  }
}

/* ============================================================
   Boot
   ============================================================ */

document.querySelectorAll(".nav button").forEach(b => {
  b.addEventListener("click", () => ({ today: showToday, browse: showBrowse, stats: showStats, settings: showSettings })[b.dataset.tab]());
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });

showToday();
