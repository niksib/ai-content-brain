---
name: tone-of-voice-matching
description: Use this skill before writing any Threads post. Threads is the platform closest to how someone actually talks — generic or polished voice kills authenticity. Apply to match the creator's exact voice from their profile.
---

# Tone of Voice Matching for Threads (2026)

## Core Principle
The Creator Profile contains the user's tone of voice data. Your job is to write AS that person — not for that person. On Threads specifically, the output must sound like something they'd send in a voice memo, not something they'd publish in a newsletter.

Threads is the most unfiltered expression of a creator's voice. If it sounds slightly too clean — it's wrong.

## How to Extract Voice from Creator Profile

### What to Look For
When reading the Creator Profile, extract:

1. **Vocabulary level** — do they use simple everyday words or more specific/technical language?
2. **Sentence rhythm** — short and punchy, or longer and flowing?
3. **Personality markers** — are they direct, funny, vulnerable, confident, casual, formal?
4. **Signature phrases** — specific words or expressions they used in their onboarding interview (these are in `raw_notes`)
5. **What they avoid** — formal corporate language, hype, overly polished phrasing?
6. **How they explain things** — do they use analogies, examples, numbers, stories?

### The raw_notes Field is Gold
The `raw_notes` field in the Creator Profile contains exact phrases and words the user used during onboarding. These are more valuable than any description. If they said "basically", "so the thing is", "what I realized was" — use those patterns. If they never use these phrases — don't invent them.

## Techniques for Matching Voice

### 1. Anchor to Their Vocabulary
If they speak simply — write simply. If they use specific jargon from their field — use it. Never use vocabulary that's more elevated than what they'd naturally use.

### 2. Match Sentence Rhythm
- Short, choppy sentences signal directness and confidence
- Longer sentences with subordinate clauses signal thoughtfulness
- Mixed rhythm is most natural — vary length intentionally
- Read the output out loud. If it doesn't sound like how they talk, rewrite it.

### 3. Preserve Their Personality Signals
- If they're funny — include humor where natural, but only their style of humor
- If they're direct — never soften or hedge unnecessarily
- If they're vulnerable — allow moments of honesty and uncertainty
- If they're confident — don't undermine with qualifiers like "maybe" or "I think"

### 4. Use Their Actual Examples and Context
Every piece of content must be rooted in the specific story or insight from their daily dump. Generic content that could apply to anyone will never sound like them. Reference the specific project, the specific mistake, the specific result.

## What Makes Content Sound Like a Real Person

### Do
- Use contractions (it's, I've, they're, you're)
- Use fragments when appropriate ("Exactly." "Not even close." "Big mistake.")
- Include specific numbers, names, details from the actual story
- Show uncertainty when relevant ("I'm not sure why, but..." / "Might be wrong here")
- Include personal reactions ("Honestly surprised me." / "Still thinking about this.")
- Write how people talk, not how they write formally
- Vary sentence length — short. Then a longer one that explains. Then short again.
- Use "but" and "and" to start sentences when it sounds right
- **Specificity**: Real details from the actual story
- **Imperfection**: Moments of uncertainty, honest reactions, things that didn't go as planned
- **Opinion**: A clear point of view, not neutral coverage of all angles
- **Rhythm**: Variation in sentence length and energy
- **Voice**: Vocabulary and phrasing that belongs to this specific person
- **Surprise**: At least one moment that the reader didn't expect
- 
### Don't
- Use formal transitions: "Furthermore," "Moreover," "In addition," "Additionally," "Thus"
- Start with generic openers: "In today's world," "In today's fast-paced environment"
- Use corporate/polished language: leverage, utilize, facilitate, implement, endeavor
- Write conclusions that summarize what was just said
- Use identical sentence length throughout
- Repeat the same phrase multiple times in one piece
- Add unnecessary qualifiers: "It is important to note that," "It is worth mentioning"
- Be vague — every statement should have a specific detail behind it

## Threads-Specific Voice Calibration

Threads is the most unfiltered platform. The voice calibration here is different from other platforms:

- **More raw** — incomplete thoughts are ok, mid-scene openers, reactions in real time
- **Less structured** — no intro, no "today I want to talk about", no summary at the end
- **More opinionated** — Threads rewards conviction; hedging ("I might be wrong, but...") only when genuinely uncertain, not as a style choice
- **Closer to texting** — not closer to blogging or essay writing

If the creator's voice on other platforms sounds professional and put-together, their Threads voice should sound like the same person on a less formal day. Not a different person — just less composed.

## Self-Check Before Delivering Output

Before delivering any content, ask:
1. Could any other creator have written this? If yes — rewrite with more specific details
2. Does this sound like how they speak in their raw_notes? If no — adjust vocabulary and rhythm
3. Does every sentence have a specific detail or does it stay abstract? If abstract — add specifics
4. Read it out loud in your head. Does it flow naturally or does it feel constructed?
