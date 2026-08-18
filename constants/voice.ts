// constants/voice.ts
// The Tressie voice. Single source of truth for who is speaking to the
// user. Every piece of copy across the app passes through this filter
// before it ships. If it doesn't sound like the person below, rewrite.
//
// Audience: women with hair of any type — straight, wavy, curly, coily.
// Across every ethnicity, every life stage, every history. The product
// is built so a 1A woman with fine flat hair and a 4C woman post-
// transplant both feel the app is for them — without flattening either
// experience into the other.

export const Voice = {
  /**
   * WHO IS SPEAKING
   *
   * Tressie is voiced by a woman in her thirties who has worked in
   * salons across many hair types and read trichology. Her own hair is
   * not the point — what matters is that she has held space for the full
   * range: the woman with sleek straight hair who can't figure out why
   * it suddenly gets oily, the woman with loose waves who's never been
   * told what to do with them, the woman with tight coils transitioning
   * out of a relaxer, the woman who just had a hair transplant, the
   * woman going through chemo, the woman whose postpartum shed is
   * scaring her.
   *
   * She doesn't perform care. She doesn't grovel. She doesn't lecture.
   * She doesn't assume any one experience is the default. She speaks
   * to whoever is in front of her — without making them feel they need
   * to translate themselves first.
   */
  identity: 'thirties stylist with trichology background, has worked across the full range of hair types and life stages, holds space without performing it',

  /**
   * SOUNDS LIKE
   *
   * - Direct without being cold. "Fine hair gets oily fast. That's
   *   the trade-off for the softness." not "We notice some users
   *   experience increased sebum production."
   * - Warm without performing care. "We hear you" not "We see you
   *   and we honour your journey."
   * - Specific over universal. "A weekly clarifying wash" not
   *   "personalised hair care routines." Specifics make a real
   *   person audible.
   * - Plain words. "Hair that has lived a lot" not "hair with
   *   extensive historical processing."
   * - Comfortable with the difficult words. Says "chemo." Says
   *   "alopecia." Says "postpartum." Doesn't euphemise. Doesn't
   *   medicalise either.
   * - Even-handed across hair types. Doesn't position any type as
   *   better, harder, more deserving, or more "natural" than any
   *   other. Each type is its own thing, with its own needs.
   */
  soundsLike: [
    'direct',
    'warm-but-not-saccharine',
    'specific',
    'plain language',
    'comfortable with hard words',
    'even-handed across all hair types',
  ],

  /**
   * DOES NOT SOUND LIKE
   *
   * - Saccharine wellness ("your beautiful journey").
   * - Beauty advertising ("hair you'll love").
   * - Clinical or medical ("clients" / "subjects" / "patients" /
   *   "users"). The reader is "you," not a case.
   * - Performative empathy ("we see you in your struggle"). Use
   *   sparingly and only where genuinely true.
   * - Tech-product voice ("seamless," "leverage," "optimise").
   * - AI-balanced rhetoric ("It's not X — it's Y"). Avoid that exact
   *   structure; it's the textbook AI tell.
   * - Bullet-pointed "tips" / "secrets" / "hacks."
   * - Numbers for credibility ("9 out of 10 women") unless they're
   *   true and sourced.
   * - Hair-type hierarchy. Never imply curlier is harder, straighter
   *   is easier, natural is better, relaxed is worse, long is the
   *   goal, short is a phase.
   * - "Other" framing. Never make any hair type feel like the niche
   *   one being accommodated. Straight hair is not the default;
   *   neither is coily. Each is just hair.
   */
  doesNotSoundLike: [
    'saccharine wellness',
    'beauty advertising',
    'clinical/medical',
    'performative empathy',
    'tech-product voice',
    "It's not X — it's Y rhetoric (the AI tell)",
    'tips/secrets/hacks framing',
    'unsourced statistics',
    'hair-type hierarchy',
    'making any type feel like the accommodated minority',
  ],

  /**
   * REGISTER BY MOMENT
   *
   * The same voice adjusts tone for what the moment requires.
   */
  register: {
    welcome: 'gentle but unsentimental — set the room',
    questioning: 'curious, plain, helpful',
    disclosure: "unhurried, holds space, doesn't flinch from hard words",
    teaching: 'concise, knowing, like a stylist explaining mid-wash',
    holding: 'four to twelve words. Nothing more. Restraint is the gesture.',
    welcoming_in: 'arrival, not delivery. "Welcome in," not "Your results are ready."',
    recognition: 'specific, calm, no ceremony. Reads facts back as care.',
  },

  /**
   * NEVER
   *
   * Hard nos — flag in review if any of these show up.
   */
  never: [
    'queen, sis, girl, babe, hun as direct address',
    'emojis (the app uses none, anywhere)',
    'exclamation marks on anything other than direct excitement',
    'we know better than you / dismissive of user choices',
    'shaming any hair state, history, or choice',
    'medicalising postpartum, transitioning, transplant recovery, or chemo',
    'implying any hair type is more natural, harder, easier, or more deserving than another',
    'before/after framing as if there is a deficit',
    'urgency or scarcity (limited time, only X left)',
    'making a Type 1 user feel her hair is being accommodated, or making a Type 4 user feel her hair is being explained to outsiders',
  ],

  /**
   * GOOD EXAMPLES — REWRITE TARGETS
   *
   * If you're writing a piece of copy, find the closest match below
   * and write toward that texture. Where examples differ by hair type,
   * both versions are included — same voice, same warmth, different
   * specifics. The voice does not change. The facts do.
   */
  examples: {
    welcomeOpening: "We built Tressie for the moment your hair stops making sense — when what worked stopped working, when nothing you've been told fits, when you want to understand your hair instead of fighting it.",
    questionPrompt: "How does water act on your hair?",
    questionSubtitle: "Think about wash day. Does it sit on top, or does your hair drink it in?",
    proTip: "Don't stretch it. Let it tell you what it wants to do.",
    historyPrompt: "What has your hair carried?",
    interstitialTeaching: "It's structure — not a score. 1A and 4C aren't a ranking. They're different shapes that hold and lose water differently.",
    interstitialHolding: "We hear you. Wherever your hair is — recovering, transitioning, growing out, settling in — we built this for that.",
    autoInference: "Because you mentioned postpartum — hair tends to shed more in this phase. That's normal. Keep it on, or untick it.",
    closer: "Welcome in. Your routine is built from your hair, your scalp, your story, and what you want next. Yours to swap. Ours to adjust.",
    recognitionType1: "Maya. You have fine, straight hair that gets oily by day two. You wash daily, you have ten minutes in the morning, and you want more volume. Here's what that combination needs — and what to stop doing that's making it flatter.",
    recognitionType2: "Maya. You have wavy hair that loses shape between washes. You've been heat-styling for years, you wash every few days, you want definition without the heat. Here's what your waves actually need.",
    recognitionType3: "Maya. You have springy curls, fine density, low porosity. You've coloured your hair, you wash weekly, you have ten minutes in the morning. Here's what that combination means — and what to stop doing that's making it frizz.",
    recognitionType4: "Maya. You have tight coils, coarse density, high porosity. You're transitioning out of relaxers, you co-wash only, you have forty minutes when you want them. Here's what your hair needs right now — and what it'll need as it grows out.",
  },

  /**
   * COPY REVIEW CHECKLIST
   *
   * Before any new copy ships, run it past these:
   *   1. Could this be from any wellness app, or only Tressie?
   *   2. Does it sound like the woman described above?
   *   3. Is it doing teaching, holding, welcoming, recognition, or
   *      questioning? Does the register match?
   *   4. Are there any "never" items in it?
   *   5. If a 1A woman read this, would she feel spoken to or
   *      accommodated? If a 4C woman read this, would she feel seen
   *      or explained? Both should feel addressed, neither should
   *      feel othered.
   *   6. Is there a shorter version that lands harder?
   */
};