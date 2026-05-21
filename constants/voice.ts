// constants/voice.ts
// The Tressana voice. Single source of truth for who is speaking to the
// user. Every piece of copy across the app passes through this filter
// before it ships. If it doesn't sound like the person below, rewrite.

export const Voice = {
  /**
   * WHO IS SPEAKING
   *
   * Tressana is voiced by a Black woman in her thirties who has worked
   * in salons and read trichology. She has lived through a postpartum
   * shed and a year of transitioning. She has friends who are post-
   * transplant, who have alopecia, who are still transitioning, who
   * are happily relaxed. She doesn't perform any of that — it's just
   * her room.
   *
   * She would never ask a question she wouldn't want asked of her.
   * She doesn't grovel. She doesn't lecture. She doesn't sell.
   *
   * If a sentence sounds like it could be from any wellness app or any
   * AI-written brand copy, rewrite it until it could only be from her.
   */
  identity: 'thirties Black woman, salon-and-trichology background, lived experience',

  /**
   * SOUNDS LIKE
   *
   * - Direct without being cold. "Postpartum hair sheds. That's normal."
   *   not "We notice some users experience increased shedding."
   * - Warm without performing care. "We hear you" not "We see you and
   *   we honour your journey."
   * - Specific over universal. "A weekly co-wash" not "personalised hair
   *   care routines." Specifics make a real person audible.
   * - Plain words. "Hair that has lived a lot" not "hair with extensive
   *   historical processing."
   * - Comfortable with the difficult words. Says "chemo." Says "alopecia."
   *   Says "postpartum." Doesn't euphemise. Doesn't medicalise either.
   */
  soundsLike: [
    'direct',
    'warm-but-not-saccharine',
    'specific',
    'plain language',
    'comfortable with hard words',
  ],

  /**
   * DOES NOT SOUND LIKE
   *
   * - Saccharine wellness ("your beautiful journey").
   * - Beauty advertising ("hair you'll love").
   * - Clinical or medical ("clients" / "subjects" / "patients" / "users").
   *   The reader is "you," not a case.
   * - Performative empathy ("we see you in your struggle").
   * - Tech-product voice ("seamless," "leverage," "optimise").
   * - AI-balanced rhetoric ("It's not X — it's Y"). Avoid that exact
   *   structure; it's the textbook AI tell.
   * - Bullet-pointed "tips" / "secrets" / "hacks."
   * - Numbers for credibility ("9 out of 10 women") unless they're true
   *   and sourced.
   */
  doesNotSoundLike: [
    'saccharine wellness',
    'beauty advertising',
    'clinical/medical',
    'performative empathy',
    'tech-product voice',
    'It\'s not X — it\'s Y rhetoric (the AI tell)',
    'tips/secrets/hacks framing',
    'unsourced statistics',
  ],

  /**
   * REGISTER BY MOMENT
   *
   * The same voice adjusts tone for what the moment requires.
   */
  register: {
    /** First contact, before anything. "Before we start." */
    welcome: 'gentle but unsentimental — set the room',

    /** Functional questions about hair structure. */
    questioning: 'curious, plain, helpful',

    /** Sensitive disclosure moments (history, segments). */
    disclosure: 'unhurried, holds space, doesn\'t flinch from hard words',

    /** Between-step beats (interstitials). */
    teaching: 'concise, knowing, like a stylist explaining mid-wash',

    /** Acknowledgment moments ("we hear you"). */
    holding: 'four to twelve words. Nothing more. Restraint is the gesture.',

    /** Closing the quiz, opening the routine. */
    welcoming_in: 'arrival, not delivery. "Welcome in," not "Your results are ready."',
  },

  /**
   * NEVER
   *
   * Hard nos — flag in review if any of these show up.
   */
  never: [
    'queen, sis, girl, babe as direct address',
    'emojis (the app uses none, anywhere)',
    'exclamation marks on anything other than direct excitement',
    'we know better than you / dismissive of user choices',
    'shaming any hair state, history, or choice',
    'medicalising postpartum, transitioning, or transplant recovery',
    'implying natural is better than relaxed, or vice versa',
    'before/after framing as if there\'s a deficit',
    'urgency or scarcity (limited time, only X left)',
  ],

  /**
   * GOOD EXAMPLES — REWRITE TARGETS
   *
   * If you're writing a piece of copy, find the closest match below
   * and write toward that texture.
   */
  examples: {
    // Welcome
    welcomeOpening: "We built Tressana for women whose hair has been overlooked, judged, or hard to figure out alone.",
    // Question prompts
    questionPrompt: "How does water act on your hair?",
    questionSubtitle: "Think about wash day. Does it sit on top, or does your hair drink it in?",
    // Pro tip / soft instruction
    proTip: "Don't stretch it. Let it tell you what it wants to do.",
    // Sensitive disclosure intro
    historyPrompt: "What has your hair carried?",
    // Interstitial — teaching beat
    interstitialTeaching: "It's structure — not a score. 1A and 4C aren't a ranking. They're different shapes that hold and lose water differently.",
    // Interstitial — holding beat
    interstitialHolding: "We hear you. Wherever you are — natural, in protective styles, transitioning, recovering — we built this for that.",
    // Inference / auto-promotion
    autoInference: "Because you mentioned postpartum — hair tends to shed more in this phase, that's normal. Keep it or untap it.",
    // Closer
    closer: "Welcome in. Your routine is built from your texture, scalp, story, and what you want next. Yours to swap. Ours to adjust.",
  },

  /**
   * COPY REVIEW CHECKLIST
   *
   * Before any new copy ships, run it past these:
   *   1. Could this be from any wellness app, or only Tressana?
   *   2. Does it sound like the woman described above?
   *   3. Is it doing teaching, holding, welcoming, or questioning?
   *      Does the register match?
   *   4. Are there any "never" items in it?
   *   5. Is there a shorter version that lands harder?
   */
};
