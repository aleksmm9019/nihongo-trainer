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
   Audio — on-device Japanese text-to-speech
   ============================================================ */

let JA_VOICE = null;

function jaVoices() {
  return speechSynthesis.getVoices().filter(v => v.lang.replace("_", "-").toLowerCase().startsWith("ja"));
}

// Natural/neural voices first; the compact system defaults sound robotic.
function voiceScore(v) {
  const n = v.name.toLowerCase();
  if (n.includes("natural") || n.includes("neural")) return 4;
  if (n.includes("enhanced") || n.includes("premium") || n.includes("siri")) return 3;
  if (n.includes("google")) return 2;
  if (v.localService) return 1;
  return 0;
}

function pickVoice() {
  const vs = jaVoices();
  const saved = S.settings.voiceName ? vs.find(v => v.name === S.settings.voiceName) : null;
  JA_VOICE = saved || vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
}

function speak(text) {
  if (!("speechSynthesis" in window) || S.settings.audio === false || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  if (JA_VOICE) u.voice = JA_VOICE;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

/* ============================================================
   Romaji conversion, dictionary lookup, verb-type detection
   ============================================================ */

const ROMAJI = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
  da: "だ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を", nn: "ん",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ", gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ", hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ", pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ", rya: "りゃ", ryu: "りゅ", ryo: "りょ",
};

function romajiToKana(input) {
  const s = input.toLowerCase().replace(/[^a-z\-']/g, "");
  let out = "", i = 0;
  while (i < s.length) {
    if (s[i] === "-") { out += "ー"; i++; continue; }
    if (s[i] === "'") { i++; continue; } // n'i style separator
    // doubled consonant -> small tsu (but not "nn", that's ん)
    if (s[i] === s[i + 1] && s[i] !== "n" && !"aiueo".includes(s[i])) { out += "っ"; i++; continue; }
    let matched = false;
    for (const len of [3, 2, 1]) {
      const chunk = s.substr(i, len);
      if (ROMAJI[chunk]) { out += ROMAJI[chunk]; i += len; matched = true; break; }
    }
    if (!matched) {
      if (s[i] === "n") out += "ん"; // n before consonant or at end
      i++;
    }
  }
  return out;
}

// Normalize a reading for by-ear matching: katakana -> hiragana, and the
// long-vowel mark expanded (コーヒー -> こおひい), so romaji input like
// "koohii" finds katakana loanwords.
const KANA_ROWS = [["あかがさざただなはばぱまやらわゃゎぁ", "あ"], ["いきぎしじちぢにひびぴみりぃ", "い"], ["うくぐすずつづぬふぶぷむゆるゅぅゔ", "う"], ["えけげせぜてでねへべぺめれぇ", "え"], ["おこごそぞとどのほぼぽもよろをょぉ", "お"]];
function normKana(s) {
  s = s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  let out = "";
  for (const ch of s) {
    if (ch === "ー" && out) {
      const prev = out[out.length - 1];
      const row = KANA_ROWS.find(([set]) => set.includes(prev));
      out += row ? row[1] : ch;
    } else out += ch;
  }
  return out;
}

// Deconjugation: turn a form you'd hear (つくります, たべました, のんで,
// いかない, たかかった) into candidate dictionary forms so lookup works
// without knowing the plain form. Over-generates a little; wrong candidates
// simply don't exist in the dictionary.
const IROW = { り: "る", き: "く", ぎ: "ぐ", し: "す", ち: "つ", に: "ぬ", び: "ぶ", み: "む", い: "う" };
const AROW = { わ: "う", か: "く", が: "ぐ", さ: "す", た: "つ", な: "ぬ", ば: "ぶ", ま: "む", ら: "る" };

// candidates from a masu/tai stem: つくり -> つくる, たべ -> たべる, し -> する
function stemCands(stem, out) {
  if (!stem) return;
  out.add(stem + "る"); // ichidan
  const last = stem[stem.length - 1];
  if (IROW[last]) out.add(stem.slice(0, -1) + IROW[last]); // godan
  if (last === "し") {
    out.add(stem.slice(0, -1) + "する");
    if (stem.length > 1) out.add(stem.slice(0, -1)); // suru-verb noun: べんきょうします -> 勉強
  }
  if (stem === "き" || stem.endsWith("てき")) out.add(stem.slice(0, -1) + "くる");
}

function deconjugate(s) {
  const out = new Set();
  s = s.replace(/です$/, "");
  // progressive ～ている/～ています collapses to the te-form, handled below
  s = s.replace(/([てで])(いる|います|いた|いました|いません|いない|いなかった|いませんでした)$/, "$1");
  // polite & tai families share the masu stem
  for (const end of ["ませんでした", "ましょう", "ました", "ません", "ます", "たくなかった", "たくない", "たかった", "たい"]) {
    if (s.endsWith(end) && s.length > end.length) { stemCands(s.slice(0, -end.length), out); break; }
  }
  // te/ta forms
  for (const [suf, ends] of [["って", ["う", "つ", "る"]], ["いて", ["く"]], ["いで", ["ぐ"]], ["んで", ["ぬ", "ぶ", "む"]], ["して", ["す"]]]) {
    for (const sf of [suf, suf.slice(0, -1) + (suf.endsWith("で") ? "だ" : "た")]) {
      if (s.endsWith(sf) && s.length > sf.length) {
        const base = s.slice(0, -2);
        for (const e of ends) out.add(base + e);
        if (sf[0] === "し") { out.add(base + "する"); if (base) out.add(base); }
      }
    }
  }
  if ((s.endsWith("て") || s.endsWith("た")) && s.length > 1) out.add(s.slice(0, -1) + "る"); // ichidan te/ta
  if (s === "いって" || s === "いった") out.add("いく");
  if (s === "きて" || s === "きた") out.add("くる");
  if (s === "して" || s === "した") out.add("する");
  // plain negative
  for (const end of ["なかった", "ない"]) {
    if (s.endsWith(end) && s.length > end.length) {
      const stem = s.slice(0, -end.length);
      out.add(stem + "る"); // ichidan
      const last = stem[stem.length - 1];
      if (AROW[last]) out.add(stem.slice(0, -1) + AROW[last]); // godan
      if (last === "し") { out.add(stem.slice(0, -1) + "する"); if (stem.length > 1) out.add(stem.slice(0, -1)); }
      break;
    }
  }
  if (s === "こない" || s === "こなかった") out.add("くる");
  // i-adjectives
  for (const end of ["くなかった", "かった", "くない", "くて"]) {
    if (s.endsWith(end) && s.length > end.length) { out.add(s.slice(0, -end.length) + "い"); break; }
  }
  out.delete(s); // the input itself is matched directly, not as a candidate
  return out;
}

// Search the bundled dictionary by kanji, kana, romaji, or English.
// Conjugated input falls back to deconjugated candidates (marked .via).
function searchDict(q) {
  q = q.trim();
  if (!q) return [];
  const kana = /^[a-zA-Z\-']+$/.test(q) ? romajiToKana(q) : "";
  const qn = normKana(kana || q);
  const cands = deconjugate(qn);
  const lower = q.toLowerCase();
  const out = [];
  for (const [w, k, m, lvl] of DICT) {
    let score = -1, via = false;
    const ml = m.toLowerCase();
    const kn = normKana(k);
    if (w === q || k === q || kn === qn) score = 100;
    else if (cands.has(kn) || cands.has(w)) { score = 90; via = true; }
    else if (qn.length >= 2 && kn.startsWith(qn)) score = 70 - (kn.length - qn.length);
    else if (w.startsWith(q) || k.startsWith(q)) score = 65;
    else if (lower.length >= 3 && ml.includes(lower)) {
      score = ml === lower || ml.startsWith(lower + ",") ? 60
        : ("," + ml).includes("," + lower) || (" " + ml).includes(" " + lower) ? 40 : 15;
    }
    if (score >= 0) out.push({ w, k, m, lvl, score, via });
  }
  return out.sort((a, b) => b.score - a.score || b.lvl - a.lvl).slice(0, 12);
}

// Godan verbs that end in -iru/-eru and masquerade as ichidan (matched on kanji form).
const GODAN_TRAPS = ["帰る", "入る", "走る", "知る", "切る", "要る", "喋る", "滑る", "握る", "限る", "蹴る", "減る", "参る", "交じる", "混じる", "焦る", "散る"];

function looksLikeVerb(meaning) {
  const m = meaning.toLowerCase();
  return m.startsWith("to ") || m.includes(", to ");
}

function guessVerbType(word, kana) {
  if (kana.endsWith("する")) return "suru";
  if (word === "来る" || kana === "くる") return "kuru";
  const last = kana.slice(-1);
  if (!"うくぐすつぬぶむる".includes(last)) return null;
  if (last !== "る") return "godan";
  if (GODAN_TRAPS.some(t => word.endsWith(t))) return "godan";
  const prev = kana.slice(-2, -1);
  return "いきぎしじちにひびぴみりえけげせぜてでねへべぺめれ".includes(prev) ? "ichidan" : "godan";
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
    if (raw) {
      const d = JSON.parse(raw);
      if (!d.custom) d.custom = { vocab: [], verbs: [] }; // migration from pre-AddWord saves
      if (!d.inbox) d.inbox = [];                         // migration from pre-inbox saves
      return d;
    }
  } catch (e) { /* corrupted -> start fresh */ }
  return {
    cards: {},          // id -> SRS state (only once introduced)
    intro: {},          // dateStr -> {vocab, kanji} new cards introduced that day
    log: {},            // dateStr -> {reviews, correct, grammar, grammarCorrect}
    custom: { vocab: [], verbs: [] }, // user-added words; vocab ids start with "c"
    inbox: [],          // words jotted down to look up later: {id, text}
    settings: { newVocab: 8, newKanji: 3, furigana: true, audio: true, autoSpeak: true, prodCards: true, listenCards: true },
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

function deckOf(id) { return id[0] === "k" ? "kanji" : id[0] === "g" ? "grammar" : "vocab"; }
function itemById(id) {
  if (deckOf(id) === "kanji") return KANJI.find(x => x.id === id);
  if (deckOf(id) === "grammar") return GRAMMAR.find(x => x.id === id);
  return VOCAB.find(x => x.id === id) || S.custom.vocab.find(x => x.id === id);
}

// flashcard queue: vocab + kanji only (grammar reviews have their own flow)
function dueCards() {
  const now = Date.now();
  return Object.keys(S.cards).filter(id => deckOf(id) !== "grammar" && S.cards[id].due <= now && itemById(id));
}

function dueGrammar() {
  const now = Date.now();
  return Object.keys(S.cards).filter(id => deckOf(id) === "grammar" && S.cards[id].due <= now && itemById(id));
}

// one new grammar point per day keeps lessons digestible
function newGrammarPoint() {
  const introToday = (S.intro[todayStr()] || {}).grammar || 0;
  if (introToday >= 1) return null;
  return GRAMMAR.find(g => !S.cards[g.id]) || null;
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
  const gDue = dueGrammar().length, gNew = newGrammarPoint();
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
      <button class="menu-btn" onclick="startGrammar()" ${gDue + (gNew ? 1 : 0) ? "" : "disabled"}>
        文法 Grammar <span class="badge">${gDue + (gNew ? 1 : 0)}</span>
        <span class="sub">${gNew ? "1 new lesson · " : ""}${gDue} reviews due</span>
      </button>
      <button class="menu-btn" onclick="startConjugation()">
        活用 Conjugation drill
        <span class="sub">ます・て・ない・た forms — 10 questions</span>
      </button>
      <button class="menu-btn" onclick="startParticles()">
        は・が・を Particle drill
        <span class="sub">fill in the blank — 10 questions</span>
      </button>
      <button class="menu-btn" onclick="startSentences()">
        文 Sentence drill
        <span class="sub">real sentences, fill in the word — 10 questions</span>
      </button>
      <button class="menu-btn" onclick="showCheatsheet()">
        📖 Conjugation cheat sheet
        <span class="sub">godan / ichidan rules at a glance</span>
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
  if (!queue.length) return startGrammar(true);
  runCards(queue, "Session", () => startGrammar(true));
}

function runCards(queue, title, onDone) {
  if (!queue.length) { showToday(); return; }
  Q = { queue, title, done: 0, total: queue.length, onDone };
  nextCard();
}

// Pick how this review is prompted. New cards and kanji are always
// recognition; familiar vocab mixes in production / listening prompts.
function cardMode(id) {
  if (deckOf(id) === "kanji" || S.cards[id].reps === 0) return "recog";
  const modes = ["recog"];
  if (S.settings.prodCards !== false) modes.push("prod");
  if (S.settings.listenCards !== false && "speechSynthesis" in window) modes.push("listen");
  return modes[Math.floor(Math.random() * modes.length)];
}

function speakBtn() { return `<button class="speak-btn" onclick="speakCurrent()" title="play audio">🔊</button>`; }

function speakCurrent() {
  const it = Q && Q.cur && Q.cur.item;
  if (!it) return;
  speak(it.kana || (it.examples ? it.examples[0][1] : ""));
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
  const mode = cardMode(id);
  Q.cur = { id, item, mode };
  const isNew = S.cards[id].reps === 0;
  let front, back;
  if (deckOf(id) === "kanji") {
    front = DECKS.kanji.front(item);
    back = DECKS.kanji.back(item) + speakBtn();
  } else if (mode === "prod") {
    front = `<div class="prod-label">Say it in Japanese</div><div class="prod-en">${item.en}</div>`;
    back = `<div class="big-jp">${item.jp}</div><div class="reading">${item.kana}</div>${speakBtn()}`;
  } else if (mode === "listen") {
    front = `<div class="prod-label">What did you hear?</div><button class="speak-big" onclick="speakCurrent()">🔊</button>`;
    back = `<div class="big-jp">${item.jp}</div><div class="reading">${item.kana}</div><div class="meaning">${item.en}</div>${speakBtn()}`;
  } else {
    front = DECKS.vocab.front(item);
    back = DECKS.vocab.back(item) + speakBtn();
  }
  render(`
    <div class="progress"><div style="width:${(Q.done / Q.total) * 100}%"></div></div>
    <div class="card" id="card">
      ${isNew ? '<div class="new-tag">NEW</div>' : ""}
      <div class="card-front">${front}</div>
      <div class="card-back hidden" id="back">${back}</div>
    </div>
    <div class="answer-area" id="answerArea">
      <button class="show-btn" onclick="flipCard()">Show answer</button>
    </div>
  `);
  if (mode === "listen") speakCurrent();
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
  if (S.settings.autoSpeak !== false && Q.cur.mode !== "listen") speakCurrent();
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

/* ---------- grammar track ---------- */

let GR = null; // active grammar session

function grammarLessonHTML(g) {
  return `
    <div class="lesson">
      <h2>${g.title}</h2>
      <div class="structure">${esc(g.structure)}</div>
      <p>${g.explain}</p>
      ${g.examples.map(e => `
        <div class="g-ex">
          <div class="g-jp">${rubify(e[0])}</div>
          <div class="g-en">${e[1]}</div>
          <button class="speak-btn small" onclick="speak('${stripRuby(e[0])}')">🔊</button>
        </div>`).join("")}
    </div>`;
}

function startGrammar(chained) {
  const fresh = [];
  const np = newGrammarPoint();
  if (np) {
    S.cards[np.id] = newCardState();
    const intro = S.intro[todayStr()] || (S.intro[todayStr()] = { vocab: 0, kanji: 0 });
    intro.grammar = (intro.grammar || 0) + 1;
    save();
    fresh.push(np.id);
  }
  const queue = [...fresh, ...shuffle(dueGrammar().filter(id => !fresh.includes(id)))];
  const onDone = chained ? () => startConjugation(true) : null;
  if (!queue.length) return onDone ? onDone() : showToday();
  GR = { queue, onDone, total: queue.length, done: 0 };
  nextGrammar();
}

function nextGrammar() {
  if (!GR.queue.length) {
    const after = GR.onDone;
    GR = null;
    if (after) return after();
    return render(`
      <div class="finish">
        <div class="finish-emoji">🎉</div>
        <h2>Grammar done!</h2>
        <button class="menu-btn primary" onclick="showToday()">Back</button>
      </div>`);
  }
  const id = GR.queue[0];
  const g = itemById(id);
  if (S.cards[id].reps === 0) {
    render(`
      <div class="progress"><div style="width:${(GR.done / GR.total) * 100}%"></div></div>
      <div class="new-tag inline">NEW GRAMMAR</div>
      ${grammarLessonHTML(g)}
      <button class="menu-btn primary" onclick="grammarQuiz()">Got it — quiz me ▶</button>
    `);
  } else {
    grammarQuiz();
  }
}

function grammarQuiz() {
  const id = GR.queue[0];
  const g = itemById(id);
  const q = g.questions[Math.floor(Math.random() * g.questions.length)];
  GR.q = q;
  GR.choices = shuffle(q.choices.slice());
  render(`
    <div class="progress"><div style="width:${(GR.done / GR.total) * 100}%"></div></div>
    <div class="drill-q">
      <div class="q-form">${g.title}</div>
      <div class="q-sentence">${rubify(q.q).replace(/＿＿/g, '<span class="blank">＿＿</span>')}</div>
      <div class="q-en">${q.en}</div>
    </div>
    <div class="choices" id="choices">
      ${GR.choices.map((c, i) => `<button class="choice" onclick="answerGrammar(${i})">${esc(c)}</button>`).join("")}
    </div>
    <div id="feedback"></div>
  `);
}

function answerGrammar(idx) {
  const ok = GR.choices[idx] === GR.q.a;
  const id = GR.queue.shift();
  gradeCard(S.cards[id], ok ? 2 : 0);
  logEvent("grammar", ok);
  if (!ok) {
    GR.queue.splice(Math.min(2, GR.queue.length), 0, id); // see it again shortly
    GR.total++;
  }
  GR.done++;
  save();
  document.querySelectorAll(".choice").forEach((b, i) => {
    b.disabled = true;
    if (GR.choices[i] === GR.q.a) b.classList.add("right");
    else if (i === idx) b.classList.add("wrong");
  });
  const full = stripRuby(GR.q.q).replace(/＿＿/, GR.q.a);
  document.getElementById("feedback").innerHTML = `
    <div class="why ${ok ? "ok" : "no"}">
      <b>${ok ? "正解！" : "→ " + esc(GR.q.a)}</b> ${esc(full)}
      <div class="why-en">${GR.q.en}</div>
    </div>
    <button class="menu-btn primary" onclick="nextGrammar()">Next</button>`;
  speak(full);
}

function showLesson(id) {
  const g = itemById(id);
  render(`${grammarLessonHTML(g)}<button class="menu-btn" onclick="showBrowse()">Back</button>`);
}

/* ---------- sentence drill ---------- */

function startSentences() {
  const qs = pick(SENTENCES, 10).map(([jp, en, target]) => {
    let pool = VOCAB.map(v => v.jp).filter(w => w !== target && Math.abs(w.length - target.length) <= 1);
    if (pool.length < 3) pool = VOCAB.map(v => v.jp).filter(w => w !== target);
    const choices = shuffle([target, ...pick(pool, 3)]);
    return {
      prompt: `<div class="q-sentence">${esc(jp).replace(target, '<span class="blank">＿＿</span>')}</div><div class="q-en">${esc(en)}</div>`,
      choices,
      correct: target,
      why: esc(jp),
      speakText: jp,
    };
  });
  runDrill(qs, "Sentences");
}

/* ---------- conjugation drill ---------- */

let G = null; // active grammar drill

function startConjugation(chained) {
  const qs = [];
  const verbs = pick(VERBS.concat(S.custom.verbs), 10);
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
      speakText: correct,
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
      return { prompt: particlePrompt(p), choices, correct: "から / まで", why: p.why, en: p.en, speakText: particleSpeakText(p) };
    }
    const banned = new Set([p.a, ...(p.alts || [])]);
    const wrongs = pick(ALL_P.filter(x => !banned.has(x)), 3);
    choices = shuffle([p.a, ...wrongs]);
    return { prompt: particlePrompt(p), choices, correct: p.a, why: p.why, en: p.en, speakText: particleSpeakText(p) };
  });
  runDrill(qs, "Particles", null, true); // particles is the last stage of a chained session
}

// Converts 漢字[よみ] markup to <ruby> furigana, or strips the readings
// entirely when furigana is switched off in Settings.
const RUBY_RE = /([一-鿿々]+)\[([^\]]+)\]/g;

function stripRuby(s) { return s.replace(RUBY_RE, "$1"); }

function rubify(s) {
  return S.settings.furigana === false
    ? stripRuby(s)
    : s.replace(RUBY_RE, "<ruby>$1<rt>$2</rt></ruby>");
}

// The full sentence with the blank(s) filled in — what the TTS voice reads aloud.
function particleSpeakText(p) {
  const plain = stripRuby(p.s);
  if (p.twoBlanks) {
    const parts = p.a.split("/");
    let i = 0;
    return plain.replace(/＿/g, () => parts[i++]);
  }
  return plain.replace(/＿/g, p.a);
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
  speak(q.speakText); // hear the correct form/sentence either way
}

/* ---------- add word ---------- */

let ADD = null;         // currently selected dictionary hit
let INBOX_PICK = null;  // inbox item being resolved -> cleared from inbox once added

function showAdd() {
  setTab("");
  ADD = null;
  INBOX_PICK = null;
  render(`
    <h2>＋ Add a word</h2>
    <p class="muted">Type it any way you like — <i>oyogu</i>, およぐ, 泳ぐ, or "to swim". Conjugated forms work too: <i>tsukurimasu</i> finds 作る. No time? <b>Later</b> saves it to look up when you're free.</p>
    <form class="add-form" onsubmit="doSearch(); return false">
      <input type="text" id="q" placeholder="oyogu" autocomplete="off" autocapitalize="none">
      <button type="submit" class="menu-btn primary slim">Search</button>
      <button type="button" class="menu-btn slim" onclick="stashWord()">📥 Later</button>
    </form>
    ${S.inbox.length ? `
    <div class="inbox">
      <div class="muted">📥 Saved for later — tap to look up:</div>
      <div class="chips">${S.inbox.map(it => `
        <button type="button" class="chip" onclick="pickInbox('${it.id}')">${esc(it.text)}</button><button type="button" class="chip x" onclick="dropInbox('${it.id}')" title="Remove">✕</button>`).join("")}
      </div>
    </div>` : ""}
    <div id="results"></div>
    <div id="confirm"></div>
    <details class="manual">
      <summary>Word not found? Add it manually</summary>
      <input type="text" id="m-kana" placeholder="reading in kana, or romaji (required)">
      <input type="text" id="m-jp" placeholder="kanji (optional)">
      <input type="text" id="m-en" placeholder="meaning (required)">
      <div class="chips" id="m-chips">
        ${["none", "godan", "ichidan", "suru"].map(t => `<button type="button" class="chip ${t === "none" ? "sel" : ""}" data-t="${t}" onclick="selChip(this)">${t === "none" ? "not a verb" : t}</button>`).join("")}
      </div>
      <button class="menu-btn primary slim" onclick="addManual()">Add card</button>
    </details>
    <p class="credit">Dictionary data: JMdict (EDRDG licence) · ${DICT.length.toLocaleString()} words</p>
  `);
  document.getElementById("q").focus();
}

function doSearch() {
  const q = document.getElementById("q").value;
  const hits = searchDict(q);
  document.getElementById("confirm").innerHTML = "";
  document.getElementById("results").innerHTML = hits.length
    ? (hits[0].via ? `<p class="muted">That looks like a conjugated form — these are the dictionary forms:</p>` : "") + hits.map((h, i) => `
      <button class="hit" onclick="pickHit(${i})">
        <span class="row-jp">${esc(h.w)}</span>
        <span class="row-kana">${esc(h.k)}</span>
        <span class="row-en">${esc(h.m)}</span>
        <span class="lvl">${h.lvl ? "N" + h.lvl : "•"}</span>
      </button>`).join("")
    : `<p class="muted">Nothing found in the dictionary — and it knows ${DICT.length.toLocaleString()} words, so double-check the spelling. You can save it for later with 📥, add it manually below, or check <a href="https://jisho.org/search/${encodeURIComponent(q)}" target="_blank">Jisho</a>.</p>`;
  window.__hits = hits;
}

function stashWord() {
  const q = document.getElementById("q").value.trim();
  if (!q) return;
  S.inbox.push({ id: "i" + Date.now().toString(36), text: q });
  save();
  showAdd(); // re-render: the new chip appearing is the confirmation
}

function pickInbox(id) {
  const it = S.inbox.find(x => x.id === id);
  if (!it) return;
  INBOX_PICK = id;
  document.getElementById("q").value = it.text;
  doSearch();
}

function dropInbox(id) {
  S.inbox = S.inbox.filter(x => x.id !== id);
  save();
  showAdd();
}

function pickHit(i) {
  const h = window.__hits[i];
  const isVerb = looksLikeVerb(h.m);
  const guess = isVerb ? guessVerbType(h.w, h.k) : null;
  ADD = h;
  document.getElementById("confirm").innerHTML = `
    <div class="confirm-card">
      <div class="big-jp">${esc(h.w)}</div>
      <div class="reading">${esc(h.k)}</div>
      <div class="meaning">${esc(h.m)}</div>
      ${isVerb ? `
        <p class="muted">Looks like a verb — it will join the conjugation drills as:</p>
        <div class="chips" id="v-chips">
          ${["none", "godan", "ichidan", "suru"].map(t => `<button type="button" class="chip ${t === (guess || "none") ? "sel" : ""}" data-t="${t}" onclick="selChip(this)">${t === "none" ? "not a verb" : t}</button>`).join("")}
        </div>` : ""}
      <button class="menu-btn primary slim" onclick="confirmAdd()">Add card</button>
    </div>`;
}

function selChip(el) {
  el.parentElement.querySelectorAll(".chip").forEach(c => c.classList.remove("sel"));
  el.classList.add("sel");
}

function chipValue(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return "none";
  return el.querySelector(".chip.sel").dataset.t;
}

function confirmAdd() {
  addCustomWord(ADD.w, ADD.k, ADD.m, chipValue("v-chips"), ADD.lvl);
}

function addManual() {
  let kana = document.getElementById("m-kana").value.trim();
  const en = document.getElementById("m-en").value.trim();
  if (!kana || !en) return alert("Reading and meaning are required.");
  if (/^[a-zA-Z\-']+$/.test(kana)) kana = romajiToKana(kana);
  const jp = document.getElementById("m-jp").value.trim() || kana;
  addCustomWord(jp, kana, en, chipValue("m-chips"), 0);
}

function addCustomWord(jp, kana, en, verbType, level) {
  if (S.custom.vocab.some(v => v.jp === jp && v.kana === kana)) return alert("Already in your deck!");
  const id = "c" + Date.now().toString(36);
  S.custom.vocab.push({ id, jp, kana, en, level });
  S.cards[id] = newCardState(); // due immediately — shows up in today's reviews
  if (verbType && verbType !== "none") S.custom.verbs.push({ dict: jp, kana, en, type: verbType, custom: true });
  if (INBOX_PICK) { S.inbox = S.inbox.filter(x => x.id !== INBOX_PICK); INBOX_PICK = null; } // resolved
  save();
  render(`
    <div class="finish">
      <div class="finish-emoji">✅</div>
      <h2>${esc(jp)} added</h2>
      <p class="muted">It's due for review right now${verbType && verbType !== "none" ? " and joins the conjugation drills" : ""}.</p>
      <button class="menu-btn primary" onclick="showAdd()">Add another</button>
      <button class="menu-btn" onclick="showToday()">Back</button>
    </div>`);
}

function removeCustom(id) {
  const v = S.custom.vocab.find(x => x.id === id);
  if (!v || !confirm(`Remove ${v.jp} from your deck?`)) return;
  S.custom.vocab = S.custom.vocab.filter(x => x.id !== id);
  S.custom.verbs = S.custom.verbs.filter(x => !(x.dict === v.jp && x.kana === v.kana));
  delete S.cards[id];
  save();
  showBrowse();
}

/* ---------- cheat sheet ---------- */

function showCheatsheet() {
  setTab("");
  render(`
    <h2>活用 Cheat sheet</h2>

    <h3>Step 1 — which type is it?</h3>
    <div class="cheat-box">
      <p>1. Ends in <b>する</b> → <b>suru verb</b> (勉強する)</p>
      <p>2. Is <b>来る</b>(くる) → <b>kuru</b> — fully irregular</p>
      <p>3. Ends in <b>-iru / -eru</b> sound → usually <b>ichidan</b> (食べる, 見る, 起きる)</p>
      <p>4. Everything else → <b>godan</b> (飲む, 買う, 話す)</p>
      <p class="muted">⚠ Trap verbs: these end in -iru/-eru but are GODAN:<br>
      帰る・入る・走る・知る・切る・要る・喋る・減る</p>
    </div>

    <h3>Ichidan — the easy ones</h3>
    <div class="cheat-box">
      <p>Drop <b>る</b>, attach anything:</p>
      <table>
        <tr><td>食べ<b>る</b></td><td>食べ<b>ます</b></td><td>食べ<b>て</b></td><td>食べ<b>ない</b></td><td>食べ<b>た</b></td></tr>
        <tr><td>見<b>る</b></td><td>見<b>ます</b></td><td>見<b>て</b></td><td>見<b>ない</b></td><td>見<b>た</b></td></tr>
      </table>
    </div>

    <h3>Godan — ます・ない: shift the vowel</h3>
    <div class="cheat-box">
      <p><b>ます形:</b> last kana → <b>i row</b> + ます　(飲む → 飲<b>み</b>ます)</p>
      <p><b>ない形:</b> last kana → <b>a row</b> + ない　(飲む → 飲<b>ま</b>ない)</p>
      <p class="muted">⚠ Verbs ending in う → <b>わ</b>ない: 買う → 買<b>わ</b>ない</p>
      <table>
        <tr><th>ends in</th><th>ます</th><th>ない</th><th>example</th></tr>
        <tr><td>う</td><td>〜います</td><td>〜わない</td><td>買う→買います・買わない</td></tr>
        <tr><td>く</td><td>〜きます</td><td>〜かない</td><td>書く→書きます・書かない</td></tr>
        <tr><td>ぐ</td><td>〜ぎます</td><td>〜がない</td><td>泳ぐ→泳ぎます・泳がない</td></tr>
        <tr><td>す</td><td>〜します</td><td>〜さない</td><td>話す→話します・話さない</td></tr>
        <tr><td>つ</td><td>〜ちます</td><td>〜たない</td><td>待つ→待ちます・待たない</td></tr>
        <tr><td>ぬ</td><td>〜にます</td><td>〜なない</td><td>死ぬ→死にます・死なない</td></tr>
        <tr><td>ぶ</td><td>〜びます</td><td>〜ばない</td><td>遊ぶ→遊びます・遊ばない</td></tr>
        <tr><td>む</td><td>〜みます</td><td>〜まない</td><td>飲む→飲みます・飲まない</td></tr>
        <tr><td>る</td><td>〜ります</td><td>〜らない</td><td>作る→作ります・作らない</td></tr>
      </table>
    </div>

    <h3>Godan — て・た: the te-form song</h3>
    <div class="cheat-box">
      <table>
        <tr><th>ends in</th><th>て形</th><th>example</th></tr>
        <tr><td>う・つ・る</td><td><b>って</b></td><td>買う→買って／待つ→待って／作る→作って</td></tr>
        <tr><td>む・ぶ・ぬ</td><td><b>んで</b></td><td>飲む→飲んで／遊ぶ→遊んで／死ぬ→死んで</td></tr>
        <tr><td>く</td><td><b>いて</b></td><td>書く→書いて</td></tr>
        <tr><td>ぐ</td><td><b>いで</b></td><td>泳ぐ→泳いで</td></tr>
        <tr><td>す</td><td><b>して</b></td><td>話す→話して</td></tr>
      </table>
      <p>た形 = same rules with <b>て→た, で→だ</b> (飲んで → 飲んだ)</p>
      <p class="muted">⚠ 行く is special: 行<b>って</b>・行<b>った</b> (not いいて)</p>
    </div>

    <h3>The irregulars — just memorize these</h3>
    <div class="cheat-box">
      <table>
        <tr><th></th><th>ます</th><th>て</th><th>ない</th><th>た</th></tr>
        <tr><td>する</td><td>します</td><td>して</td><td>しない</td><td>した</td></tr>
        <tr><td>来る(くる)</td><td>きます</td><td>きて</td><td><b>こ</b>ない</td><td>きた</td></tr>
        <tr><td>ある</td><td>あります</td><td>あって</td><td><b>ない</b></td><td>あった</td></tr>
      </table>
    </div>

    <button class="menu-btn" onclick="showToday()">Back</button>
  `);
}

/* ---------- browse ---------- */

function showBrowse() {
  setTab("browse");
  const learned = id => S.cards[id] ? "learned" : "";
  render(`
    <h2>Decks</h2>
    <button class="menu-btn" onclick="showAdd()">＋ Add a word</button>
    ${S.custom.vocab.length ? `
    <details open>
      <summary>My words (${S.custom.vocab.length})</summary>
      <div class="list">${S.custom.vocab.map(v => `<div class="row learned"><span class="row-jp">${esc(v.jp)}</span><span class="row-kana">${esc(v.kana)}</span><span class="row-en">${esc(v.en)}</span><button class="del" onclick="removeCustom('${v.id}')">✕</button></div>`).join("")}</div>
    </details>` : ""}
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
    <details>
      <summary>Grammar (${GRAMMAR.length}) — ${GRAMMAR.filter(g => S.cards[g.id]).length} learning</summary>
      <div class="list">${GRAMMAR.map(g => `<div class="row ${learned(g.id)}" onclick="showLesson('${g.id}')" style="cursor:pointer"><span class="row-en" style="text-align:left">${g.title}</span></div>`).join("")}</div>
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
      <div class="stat"><b>${VOCAB.length + KANJI.length + GRAMMAR.length + S.custom.vocab.length - learning}</b><span>cards remaining</span></div>
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
    <h3>Audio</h3>
    <label class="setting toggle">
      <input type="checkbox" ${S.settings.audio === false ? "" : "checked"}
        onchange="S.settings.audio=this.checked; save()">
      Japanese audio (text-to-speech)
    </label>
    <label class="setting toggle">
      <input type="checkbox" ${S.settings.autoSpeak === false ? "" : "checked"}
        onchange="S.settings.autoSpeak=this.checked; save()">
      Auto-play word when a card flips
    </label>
    <label class="setting">Voice
      <select id="voiceSel" onchange="setVoice(this.value)">
        <option value="">Auto (most natural available)</option>
        ${("speechSynthesis" in window ? jaVoices() : []).map(v =>
          `<option value="${esc(v.name)}" ${S.settings.voiceName === v.name ? "selected" : ""}>${esc(v.name)}${v.localService ? " · offline" : " · online"}</option>`).join("")}
      </select>
    </label>
    <button class="menu-btn slim" onclick="speak('こんにちは。日本語の練習をしましょう。')">▶ Test voice</button>
    <p class="muted">Voices come from your device. For a much more natural voice:<br>
      <b>iPhone:</b> Settings → Accessibility → Spoken Content → Voices → Japanese → download <b>Kyoko (Enhanced)</b> or a Siri voice, then pick it here.<br>
      <b>Android:</b> install "Speech Recognition &amp; Synthesis" / Google Japanese TTS data.<br>
      Voices marked <b>online</b> sound best but need a connection; <b>offline</b> ones work in tunnels.</p>
    <h3>Card types</h3>
    <label class="setting toggle">
      <input type="checkbox" ${S.settings.prodCards === false ? "" : "checked"}
        onchange="S.settings.prodCards=this.checked; save()">
      Production cards (English → Japanese)
    </label>
    <label class="setting toggle">
      <input type="checkbox" ${S.settings.listenCards === false ? "" : "checked"}
        onchange="S.settings.listenCards=this.checked; save()">
      Listening cards (audio first)
    </label>
    <h3>Backup</h3>
    <button class="menu-btn" onclick="exportProgress()">Export progress</button>
    <button class="menu-btn" onclick="importProgress()">Import progress</button>
    <textarea id="backup" placeholder="Exported progress appears here. Paste a backup here and tap Import."></textarea>
    <h3>Danger zone</h3>
    <button class="menu-btn danger" onclick="resetProgress()">Reset all progress</button>
  `);
}

function setVoice(name) {
  S.settings.voiceName = name || null;
  save();
  pickVoice();
  speak("こんにちは。この声でいいですか。");
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

if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

showToday();
