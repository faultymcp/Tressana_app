// lib/tressie/context.ts
// -----------------------------------------------------------------------------
// Builds Tressie's per-request context: hair profile (quiz) + recent chat
// history + retrieved corpus knowledge. This is the PERSONALIZATION layer.
// The quiz data is injected into the prompt at request time — never trained
// into weights — so a profile update is reflected instantly.
//
// Reads defensively from the live user_hair_profiles schema, which has some
// redundant columns from quiz-version drift (scalp_condition vs scalp_conditions,
// goals vs hair_goals). We take whichever is populated.
// -----------------------------------------------------------------------------

import { SupabaseClient } from "@supabase/supabase-js";

// ---- Types matching the live schema ----------------------------------------
interface HairProfile {
  hair_type: string | null;
  curl_pattern: string | null;
  porosity: string | null;
  density: string | null;
  hair_length: string | null;
  budget_preference: string | null;
  scalp_condition: string | null;
  scalp_conditions: string[] | null;
  segments: string[] | null;
  goals: string[] | null;
  hair_goals: string[] | null;
  hair_history: string[] | null;
  allergies: string[] | null;
  quiz_completed_at: string | null;
}

interface CorpusMatch {
  question: string;
  answer: string | null;
  answer_status: string;
  topics: string[];
  textures: string[];
  similarity: number;
}

interface TressieMessage {
  role: "user" | "assistant";
  content: string;
}

// ---- Helpers ----------------------------------------------------------------

// Pick whichever of two redundant fields is actually populated.
function firstNonEmpty(...vals: (string | string[] | null | undefined)[]): string[] {
  for (const v of vals) {
    if (Array.isArray(v) && v.length > 0) return v;
    if (typeof v === "string" && v.trim()) return [v.trim()];
  }
  return [];
}

// Turn the profile row into a compact natural-language block for the prompt.
// Keep it terse — every token here is in every request.
function renderProfile(p: HairProfile): string {
  const goals = firstNonEmpty(p.hair_goals, p.goals);
  const scalp = firstNonEmpty(p.scalp_conditions, p.scalp_condition);
  const history = firstNonEmpty(p.hair_history);
  const segments = firstNonEmpty(p.segments);
  const allergies = firstNonEmpty(p.allergies);

  const parts: string[] = [];
  if (p.hair_type) parts.push(`Hair type: ${p.hair_type}`);
  if (p.curl_pattern) parts.push(`Curl pattern: ${p.curl_pattern}`);
  if (p.porosity) parts.push(`Porosity: ${p.porosity}`);
  if (p.density) parts.push(`Density: ${p.density}`);
  if (p.hair_length) parts.push(`Length: ${p.hair_length}`);
  if (scalp.length) parts.push(`Scalp: ${scalp.join(", ")}`);
  if (history.length) parts.push(`History: ${history.join(", ")}`);
  if (segments.length) parts.push(`Life stage / segment: ${segments.join(", ")}`);
  if (goals.length) parts.push(`Goals: ${goals.join(", ")}`);
  if (p.budget_preference) parts.push(`Budget: ${p.budget_preference}`);

  // Allergies are a SAFETY field — call them out separately and emphatically.
  let block = parts.join("\n");
  if (allergies.length) {
    block += `\n\nIMPORTANT — ALLERGIES / AVOID: ${allergies.join(", ")}. ` +
             `Never recommend products containing these. Flag if unsure.`;
  }
  return block;
}

// Map the user's hair profile to corpus retrieval filters, so we pull
// knowledge relevant to THEIR texture rather than generic results.
function texturesFromProfile(p: HairProfile): string[] {
  const t = (p.curl_pattern || p.hair_type || "").toLowerCase();
  const out: string[] = [];
  if (/4|coil|kink|afro/.test(t)) out.push("coily");
  if (/3|curl|ringlet/.test(t)) out.push("curly");
  if (/2|wav/.test(t)) out.push("wavy");
  if (/1|straight/.test(t)) out.push("straight");
  return out;
}

// ---- Main entry point -------------------------------------------------------

export interface BuildContextArgs {
  supabase: SupabaseClient;       // service-role client (bypasses RLS for corpus)
  userId: string;
  userMessage: string;
  queryEmbedding: number[];       // embedding of userMessage (768-dim, bge-base)
  historyLimit?: number;          // how many past messages to include
  corpusLimit?: number;           // how many corpus chunks to retrieve
}

export interface TressieContext {
  profileBlock: string;
  history: TressieMessage[];
  corpusMatches: CorpusMatch[];
  retrievalFilters: { textures: string[] };
}

export async function buildTressieContext(
  args: BuildContextArgs
): Promise<TressieContext> {
  const {
    supabase,
    userId,
    userMessage,
    queryEmbedding,
    historyLimit = 12,
    corpusLimit = 5,
  } = args;

  // 1. Hair profile (the quiz answers) -----------------------------------
  const { data: profileRow, error: profileErr } = await supabase
    .from("user_hair_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("profile fetch failed:", profileErr.message);
  }

  const profile = (profileRow as HairProfile) || null;
  const profileBlock = profile
    ? renderProfile(profile)
    : "No hair profile on file yet — the user hasn't completed the quiz.";
  const textures = profile ? texturesFromProfile(profile) : [];

  // 2. Recent chat history (memory across sessions) ----------------------
  const { data: historyRows, error: histErr } = await supabase
    .from("tressie_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(historyLimit);

  if (histErr) console.error("history fetch failed:", histErr.message);

  // reverse so it reads oldest -> newest for the model
  const history = ((historyRows as TressieMessage[]) || []).reverse();

  // 3. Corpus retrieval, filtered to the user's texture ------------------
  const { data: matches, error: matchErr } = await supabase.rpc(
    "match_tressie_corpus",
    {
      query_embedding: queryEmbedding,
      match_count: corpusLimit,
      filter_textures: textures.length ? textures : null,
      filter_topics: null,
      only_answered: true, // only retrieve VERIFIED answers (Phase 3 output)
    }
  );

  if (matchErr) console.error("corpus retrieval failed:", matchErr.message);

  return {
    profileBlock,
    history,
    corpusMatches: (matches as CorpusMatch[]) || [],
    retrievalFilters: { textures },
  };
}

// ---- Assemble the final messages array for the model ------------------------

export function assembleTressiePrompt(
  ctx: TressieContext,
  userMessage: string,
  voiceSystemPrompt: string // from constants/voice.ts — Tressie's identity
): { system: string; messages: TressieMessage[] } {
  // Retrieved knowledge becomes grounding context in the system prompt.
  const knowledge = ctx.corpusMatches
    .filter((m) => m.answer)
    .map((m, i) => `[${i + 1}] Q: ${m.question}\nA: ${m.answer}`)
    .join("\n\n");

  const system = [
    voiceSystemPrompt,
    "",
    "=== THIS USER'S HAIR PROFILE ===",
    ctx.profileBlock,
    "",
    "=== RELEVANT HAIR KNOWLEDGE (ground your answer in this; do not invent) ===",
    knowledge || "(no verified knowledge retrieved — answer carefully from general expertise and recommend professional input where appropriate)",
    "",
    "Use the profile so the user never re-explains their hair. Personalize to their texture, porosity, history, goals, and budget. Respect allergies as hard constraints.",
  ].join("\n");

  const messages: TressieMessage[] = [
    ...ctx.history,
    { role: "user", content: userMessage },
  ];

  return { system, messages };
}
