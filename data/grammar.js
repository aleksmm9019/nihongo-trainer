// Grammar points (Bunpro-style). Each point is an SRS item: first encounter
// shows the lesson, reviews quiz with a random question from the point.
// Kanji readings use 漢字[よみ] markup, rendered as furigana.
const GRAMMAR = [
  {
    id: "g001", title: "〜たい — want to do", level: 5,
    structure: "verb ます-stem ＋ たい",
    explain: "Attach たい to the ます-stem to say you want to do something: 食べます → 食べたい (I want to eat). たい then conjugates like an i-adjective: 食べたくない (don't want to), 食べたかった (wanted to). It's for YOUR wishes — for other people use 〜たがっている.",
    examples: [
      ["日本[にほん]に行[い]きたいです。", "I want to go to Japan."],
      ["今日[きょう]は何[なに]も食[た]べたくないです。", "I don't want to eat anything today."],
    ],
    questions: [
      { q: "すしを食[た]べ＿＿です。", en: "I want to eat sushi.", choices: ["たい", "たり", "たく", "たければ"], a: "たい" },
      { q: "映画[えいが]を見[み]＿＿です。", en: "I don't want to watch the movie.", choices: ["たくない", "たいない", "ないたい", "なくたい"], a: "たくない" },
      { q: "日本[にほん]へ行[い]き＿＿です。", en: "I wanted to go to Japan.", choices: ["たかった", "たいでした", "たいだった", "かったたい"], a: "たかった" },
    ],
  },
  {
    id: "g002", title: "〜ませんか・〜ましょう — invitations", level: 5,
    structure: "verb ます-stem ＋ ませんか／ましょう",
    explain: "〜ませんか (won't you...?) politely invites someone: 行きませんか (won't you go with me?). 〜ましょう (let's...) proposes doing it together: 行きましょう (let's go). Reply to ませんか with ましょう to accept.",
    examples: [
      ["一緒[いっしょ]に昼[ひる]ご飯[はん]を食[た]べませんか。", "Won't you have lunch with me?"],
      ["駅[えき]まで歩[ある]きましょう。", "Let's walk to the station."],
    ],
    questions: [
      { q: "一緒[いっしょ]に映画[えいが]を見[み]＿＿か。", en: "Won't you watch a movie with me?", choices: ["ません", "ましょう", "たい", "ないです"], a: "ません" },
      { q: "じゃ、行[い]き＿＿。", en: "Well then, let's go.", choices: ["ましょう", "ませんか", "たいです", "ました"], a: "ましょう" },
      { q: "コーヒーを飲[の]み＿＿か。", en: "Shall we drink some coffee?", choices: ["ましょう", "ました", "たかった", "ません"], a: "ましょう" },
    ],
  },
  {
    id: "g003", title: "〜てください — please do", level: 5,
    structure: "verb て-form ＋ ください",
    explain: "The て-form plus ください makes a polite request: 待ってください (please wait). This is THE reason the て-form matters so much — requests, permission, and ongoing actions all build on it.",
    examples: [
      ["ここに名前[なまえ]を書[か]いてください。", "Please write your name here."],
      ["ゆっくり話[はな]してください。", "Please speak slowly."],
    ],
    questions: [
      { q: "ちょっと待[ま]＿＿ください。", en: "Please wait a moment.", choices: ["って", "ちて", "た", "つ"], a: "って" },
      { q: "もう一度[いちど]言[い]＿＿ください。", en: "Please say it one more time.", choices: ["って", "いて", "した", "う"], a: "って" },
      { q: "窓[まど]を開[あ]け＿＿ください。", en: "Please open the window.", choices: ["て", "って", "た", "る"], a: "て" },
    ],
  },
  {
    id: "g004", title: "〜てもいいです — permission", level: 5,
    structure: "verb て-form ＋ もいいです（か）",
    explain: "て-form + もいいです means 'it's okay to do'. As a question it asks permission: 入ってもいいですか (may I come in?). Grant it with どうぞ or はい、いいですよ.",
    examples: [
      ["写真[しゃしん]を撮[と]ってもいいですか。", "May I take a photo?"],
      ["ここに座[すわ]ってもいいですよ。", "You may sit here."],
    ],
    questions: [
      { q: "トイレに行[い]っ＿＿いいですか。", en: "May I go to the bathroom?", choices: ["ても", "では", "とも", "ければ"], a: "ても" },
      { q: "この水[みず]を飲[の]＿＿もいいですか。", en: "May I drink this water?", choices: ["んで", "みて", "むで", "んだ"], a: "んで" },
      { q: "テレビを見[み]＿＿もいいですか。", en: "May I watch TV?", choices: ["て", "って", "た", "る"], a: "て" },
    ],
  },
  {
    id: "g005", title: "〜てはいけません — must not", level: 5,
    structure: "verb て-form ＋ はいけません",
    explain: "て-form + はいけません forbids something: ここで泳いではいけません (you must not swim here). Casual speech shortens てはいけない to ちゃいけない／じゃいけない. Compare: てもいいです allows, てはいけません forbids.",
    examples: [
      ["ここで写真[しゃしん]を撮[と]ってはいけません。", "You must not take photos here."],
      ["授業[じゅぎょう]中[ちゅう]に話[はな]してはいけません。", "You must not talk during class."],
    ],
    questions: [
      { q: "ここでお酒[さけ]を飲[の]んで＿＿いけません。", en: "You must not drink alcohol here.", choices: ["は", "も", "が", "を"], a: "は" },
      { q: "この川[かわ]で泳[およ]＿＿はいけません。", en: "You must not swim in this river.", choices: ["いで", "って", "ぎて", "んで"], a: "いで" },
      { q: "ここに入[はい]＿＿はいけません。", en: "You must not enter here.", choices: ["って", "いて", "りて", "んで"], a: "って" },
    ],
  },
  {
    id: "g006", title: "〜ています — ongoing action / state", level: 5,
    structure: "verb て-form ＋ います",
    explain: "て-form + います covers (1) an action happening right now: 食べています (is eating), (2) an ongoing state: 結婚しています (is married), and (3) habits: 毎日働いています (works every day). Context decides which.",
    examples: [
      ["今[いま]、晩[ばん]ご飯[はん]を作[つく]っています。", "I'm making dinner right now."],
      ["父[ちち]は銀行[ぎんこう]で働[はたら]いています。", "My father works at a bank."],
    ],
    questions: [
      { q: "トムは今[いま]、本[ほん]を読[よ]＿＿います。", en: "Tom is reading a book right now.", choices: ["んで", "みて", "んだ", "むで"], a: "んで" },
      { q: "雨[あめ]が降[ふ]っ＿＿います。", en: "It is raining.", choices: ["て", "た", "ても", "ては"], a: "て" },
      { q: "母[はは]は病院[びょういん]で働[はたら]＿＿います。", en: "My mother works at a hospital.", choices: ["いて", "って", "きて", "んで"], a: "いて" },
    ],
  },
  {
    id: "g007", title: "〜たことがあります — experience", level: 5,
    structure: "verb た-form ＋ ことがあります",
    explain: "た-form + ことがあります says you've done something before (at least once in your life): 日本に行ったことがあります (I have been to Japan). Negative: 〜たことがありません (I've never...). Don't use it for things you did recently — that's just plain past.",
    examples: [
      ["すしを食[た]べたことがありますか。", "Have you ever eaten sushi?"],
      ["富士山[ふじさん]を見[み]たことがありません。", "I have never seen Mt. Fuji."],
    ],
    questions: [
      { q: "日本[にほん]に行[い]っ＿＿ことがあります。", en: "I have been to Japan.", choices: ["た", "て", "く", "き"], a: "た" },
      { q: "この映画[えいが]を見[み]たこと＿＿ありますか。", en: "Have you ever seen this movie?", choices: ["が", "を", "に", "で"], a: "が" },
      { q: "馬[うま]に乗[の]ったことが＿＿。", en: "I have never ridden a horse.", choices: ["ありません", "ないです", "いません", "なかった"], a: "ありません" },
    ],
  },
  {
    id: "g008", title: "〜のが好きです — like doing", level: 5,
    structure: "verb dictionary form ＋ のが好きです",
    explain: "の turns a verb into a noun, so you can like/dislike doing it: 泳ぐのが好きです (I like swimming). Also works with 上手 (good at) and 下手 (bad at): 歌うのが下手です. The thing you like takes が, not を.",
    examples: [
      ["音楽[おんがく]を聞[き]くのが好[す]きです。", "I like listening to music."],
      ["弟[おとうと]は料理[りょうり]するのが上手[じょうず]です。", "My little brother is good at cooking."],
    ],
    questions: [
      { q: "本[ほん]を読[よ]む＿＿が好[す]きです。", en: "I like reading books.", choices: ["の", "こと", "もの", "ところ"], a: "の" },
      { q: "泳[およ]ぐの＿＿好[す]きです。", en: "I like swimming.", choices: ["が", "を", "に", "で"], a: "が" },
      { q: "トムは歌[うた]う＿＿下手[へた]です。", en: "Tom is bad at singing.", choices: ["のが", "のを", "が", "を"], a: "のが" },
    ],
  },
  {
    id: "g009", title: "〜から — because", level: 5,
    structure: "reason ＋ から、result",
    explain: "から after a clause gives the reason: 忙しいから、行きません (I'm not going because I'm busy). The reason comes FIRST in Japanese. With nouns and na-adjectives use だから: 雨だから (because it's rain[ing]).",
    examples: [
      ["時間[じかん]がないから、タクシーで行[い]きます。", "Since there's no time, I'll go by taxi."],
      ["今日[きょう]は日曜日[にちようび]だから、学校[がっこう]は休[やす]みです。", "Because it's Sunday, school is off."],
    ],
    questions: [
      { q: "忙[いそが]しい＿＿、行[い]きません。", en: "I'm not going because I'm busy.", choices: ["から", "ので", "でも", "まで"], a: "から" },
      { q: "雨[あめ]＿＿、家[いえ]にいます。", en: "Because it's raining, I'll stay home.", choices: ["だから", "から", "とから", "にから"], a: "だから" },
      { q: "この店[みせ]は安[やす]い＿＿、よく買[か]い物[もの]します。", en: "Because this shop is cheap, I often shop there.", choices: ["から", "だから", "より", "とき"], a: "から" },
    ],
  },
  {
    id: "g010", title: "〜と思います — I think", level: 5,
    structure: "plain form ＋ と思います",
    explain: "Quote your opinion with と思います. The clause before と must be PLAIN form: 行くと思います (I think [someone] will go), 高いと思います (I think it's expensive). With nouns/na-adjectives add だ: 先生だと思います.",
    examples: [
      ["明日[あした]は雨[あめ]が降[ふ]ると思[おも]います。", "I think it will rain tomorrow."],
      ["この本[ほん]は面白[おもしろ]いと思[おも]います。", "I think this book is interesting."],
    ],
    questions: [
      { q: "トムは来[く]る＿＿思[おも]います。", en: "I think Tom will come.", choices: ["と", "を", "が", "は"], a: "と" },
      { q: "この映画[えいが]は面白[おもしろ]い＿＿思[おも]います。", en: "I think this movie is interesting.", choices: ["と", "だと", "のと", "って"], a: "と" },
      { q: "あの人[ひと]は先生[せんせい]＿＿と思[おも]います。", en: "I think that person is a teacher.", choices: ["だ", "です", "な", "の"], a: "だ" },
    ],
  },
  {
    id: "g011", title: "〜ほうがいいです — had better", level: 5,
    structure: "verb た-form ＋ ほうがいいです",
    explain: "Advice: た-form + ほうがいい means 'you'd better do it': 休んだほうがいいです (you should rest). For 'better NOT to', use ない-form instead: 行かないほうがいいです (you'd better not go).",
    examples: [
      ["早[はや]く寝[ね]たほうがいいですよ。", "You'd better go to bed early."],
      ["お酒[さけ]を飲[の]まないほうがいいです。", "You'd better not drink alcohol."],
    ],
    questions: [
      { q: "病院[びょういん]に行[い]っ＿＿ほうがいいですよ。", en: "You'd better go to the hospital.", choices: ["た", "て", "く", "かない"], a: "た" },
      { q: "休[やす]＿＿ほうがいいです。", en: "You'd better rest.", choices: ["んだ", "みた", "むだ", "んで"], a: "んだ" },
      { q: "夜[よる]、コーヒーを飲[の]＿＿ほうがいいです。", en: "You'd better not drink coffee at night.", choices: ["まない", "んだ", "みたくない", "んでない"], a: "まない" },
    ],
  },
  {
    id: "g012", title: "〜ことができます — can do", level: 5,
    structure: "verb dictionary form ＋ ことができます",
    explain: "Dictionary form + ことができます says you can / are able to do something: 漢字を読むことができます (I can read kanji). It's the long, always-safe way to say 'can' — later you'll learn the shorter potential form (読める).",
    examples: [
      ["日本語[にほんご]を話[はな]すことができます。", "I can speak Japanese."],
      ["ここで切符[きっぷ]を買[か]うことができます。", "You can buy tickets here."],
    ],
    questions: [
      { q: "私[わたし]は漢字[かんじ]を読[よ]む＿＿ができます。", en: "I can read kanji.", choices: ["こと", "の", "もの", "ところ"], a: "こと" },
      { q: "トムは泳[およ]ぐこと＿＿できます。", en: "Tom can swim.", choices: ["が", "を", "に", "は"], a: "が" },
      { q: "ここで写真[しゃしん]を＿＿ことができます。", en: "You can take photos here.", choices: ["撮る", "撮った", "撮って", "撮り"], a: "撮る" },
    ],
  },
  {
    id: "g013", title: "〜とき — when", level: 5,
    structure: "plain form ＋ とき",
    explain: "とき (時) after a clause means 'when': 日本に行くとき (when I go to Japan). Tense matters: 行くとき = on the way / before arriving; 行ったとき = after arriving. With nouns use の: 子供のとき (when I was a child).",
    examples: [
      ["暇[ひま]なとき、音楽[おんがく]を聞[き]きます。", "When I'm free, I listen to music."],
      ["子供[こども]のとき、よく川[かわ]で泳[およ]ぎました。", "When I was a child, I often swam in the river."],
    ],
    questions: [
      { q: "子供[こども]＿＿とき、犬[いぬ]がいました。", en: "When I was a child, we had a dog.", choices: ["の", "だ", "な", "に"], a: "の" },
      { q: "日本[にほん]へ＿＿とき、かばんを買[か]いました。", en: "When I went to Japan (before arriving), I bought a bag.", choices: ["行く", "行った", "行って", "行き"], a: "行く" },
      { q: "暇[ひま]＿＿とき、テレビを見[み]ます。", en: "When I'm free, I watch TV.", choices: ["な", "の", "だ", "い"], a: "な" },
    ],
  },
  {
    id: "g014", title: "〜すぎます — too much", level: 5,
    structure: "verb ます-stem／adjective stem ＋ すぎます",
    explain: "すぎる means 'to exceed': attach it to a ます-stem or adjective stem for 'too...': 食べすぎました (ate too much), 高すぎます (too expensive). For i-adjectives drop the い: 大きい → 大きすぎる. な-adjectives attach directly: 静かすぎる.",
    examples: [
      ["昨日[きのう]、飲[の]みすぎました。", "I drank too much yesterday."],
      ["この靴[くつ]は大[おお]きすぎます。", "These shoes are too big."],
    ],
    questions: [
      { q: "食[た]べ＿＿ました。", en: "I ate too much.", choices: ["すぎ", "すぎる", "すぎて", "すぎた"], a: "すぎ" },
      { q: "この服[ふく]は高[たか]＿＿ます。", en: "These clothes are too expensive.", choices: ["すぎ", "いすぎ", "くすぎ", "さすぎ"], a: "すぎ" },
      { q: "この問題[もんだい]は難[むずか]し＿＿ます。", en: "This problem is too difficult.", choices: ["すぎ", "いすぎ", "くすぎ", "すぎる"], a: "すぎ" },
    ],
  },
];
