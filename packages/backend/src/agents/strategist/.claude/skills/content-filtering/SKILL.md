---
name: content-filtering
description: Use this skill when the Content Strategist is deciding what from the user's dump is worth turning into content. Apply after matching the dump to angles — not every angle match deserves a post.
---

## The Core Question

Not everything that fits an angle is worth posting. After you've matched the dump to one of the 10 angles, run the material through this filter.

Ask one question:

**"Would someone who doesn't know this person stop scrolling for this?"**

If the answer is no — skip it.

---

## The Three Tests

For an idea to survive filtering, all three must pass:

### Test 1 — Specific over generic

The material must contain at least one detail that couldn't have been said by anyone else on any day.

- Bad: "I've been thinking about productivity."
- Good: "I tracked every interruption for a week. 73% came from one person."
- Bad: "I shipped something today."
- Good: "I shipped at 2am and watched the first user sign up 14 minutes later."

If the dump contains only the generic version, the filter blocks the idea — even if an angle technically matches.

### Test 2 — Real reaction is plausible

You can picture a specific comment someone would actually type. Not "great post" — a real reply with content.

- "actually I disagree because…"
- "wait, what stack did you use?"
- "same thing happened to me when…"
- "this is wrong — here's why…"

If you can't picture a real reply, the angle is matching the surface but the material is too thin underneath.

### Test 3 — Not a recent duplicate

Check the content history block in the system prompt. Block the idea only if the **same topic in the same angle** appeared in the last 30 days.

- Same topic, different angle → allowed if the new framing is genuinely different (a `hot_take` about AI replacing juniors three days ago does not block a `specific_story` about a concrete moment a client fired their team).
- Same angle, different topic → fine. Angles are structures and should repeat.
- Same topic and same angle within 30 days → skip.

Soft balance: avoid stacking the same angle 4+ times in the last 5 ideas. If multiple angles fit equally well, prefer one used less recently.

---

## What to Skip

### Generic productivity / motivation
"Today was productive." "Sometimes you just have to push through." "Consistency is key."

Could have been said by anyone on any day. Zero specificity = zero reason to stop scrolling.

### Inside information without context
Information that only makes sense if you know the full backstory. If the audience needs 5 paragraphs of context to understand why something is interesting, it's not ready yet.

### Vague observations
"I've been thinking a lot about AI lately." "The market is changing." "Things are evolving fast."

Sounds like something, says nothing. Every statement needs a specific claim behind it.

### "I did X" with no insight, result, or lesson
Progress updates without a sharp detail. "I've been working on my app" is not a post. "I realized the feature I've been building for 2 weeks is the wrong solution" — that's a post.

### Complaints without resolution
Frustration with no lesson, no resolution, no insight. Skip it.

### Material that fits structurally but has no specifics
Most dangerous category. The dump has the right shape for an angle (e.g., "I noticed people…") but no concrete observation behind it. This produces AI-slop. Block it.

---

## The Angle-First Decision

Always sequence:

1. **Does the dump match an angle clearly?** If yes, proceed. If no — this isn't a filtering problem, it's an extraction problem (run Extraction Protocol).
2. **Does the material pass the three tests above?**
3. **Has it been covered in the last 30 days?**

If 1 fails → no idea (use Extraction Protocol).
If 2 or 3 fails → SKIP and tell the user briefly why.

---

## Filtering Output

For each candidate idea, classify:

- **POST** — angle matches, material is specific, reaction is plausible, not covered recently. Save it.
- **SKIP** — angle matches structurally but material is too thin, generic, or recently covered. Don't save. Briefly tell the user why.
- **HOLD** — angle and material are interesting but need more detail before saving. Use the Extraction Protocol to ask for what's missing.

Only call `save_content_idea` for POST items.

For SKIP items, tell the user in one sentence what's missing — so they understand the reasoning and can decide whether to expand.