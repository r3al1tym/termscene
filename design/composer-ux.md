# termscene Composer — UX direction

> Working design doc. The strategic case for turning the browser playground into
> a first-class **creator experience** ("Composer"), the personas and scenarios it
> serves, and the gallery rethink that feeds it. Not a spec yet — the spec is scoped
> against the priority scenarios below.

## The thesis

Stop treating the browser tool as a *funnel to the CLI*. It's a **second product for
a bigger audience** — the zero-install, in-browser way to make a terminal clip. No one
owns that lane: VHS needs a binary + a `.tape` file; asciinema records a *real* session.
termscene already stands in the empty lane — it's just been labeled a toy.

Don't pick CLI-vs-browser. **Unify them through the scene file:**
- **Browser (Composer)** = front door — create, customize, share. Bigger audience.
- **CLI** = back office — reproduce, automate, byte-stable renders. The reference renderer.

The portable scene file is the moat: a creation moves browser → repo → agent with no
translation. JSON stays the source of truth and the stable contract, so the agent
(Claude/Cursor) and the CLI never drift from what the visual tool produces.

## Personas

The **agent** (Claude/Cursor) writes JSON and never opens the UI — a *constraint*
(keep JSON the contract), not a Composer user. The four who actually use Composer:

- **MNT — OSS maintainer / dev.** README hero clips. Terminal-fluent, wants precision
  and the right brand look fast. *The proven wedge.*
- **DRA — DevRel / advocate.** Launch clips, threads, talk b-roll. Volume creator,
  brand-conscious. *The growth bet.*
- **FDR — Founder / product marketer.** Pitch and launch clips. Least terminal-fluent,
  wants it to look professional. *The lowest skill floor — the real test of "simple."*
- **EDU — Educator / content creator.** Tutorials, course clips. Needs many matched
  clips. *Reuse-driven.*

## Top 10 scenarios (ranked by value)

Value ≈ reach × frequency × termscene's unique edge × how much a *visual* surface
beats raw JSON.

| # | Scenario | Personas | What it needs |
|---|----------|----------|---------------|
| 1 | **Make-it-mine from a template** — start from a scene that already looks right, swap commands + output for my product, export | MNT·DRA·FDR·EDU | Template-first landing; click a visible line → edit text in place; zero JSON |
| 2 | **README hero loop** — one seamless looping GIF of install→run atop my repo | MNT | wide/landscape, `loopOffset`, GitHub-sized GIF, brand-terminal match |
| 3 | **Launch / social clip** — a 5–10s scroll-stopper for X / LinkedIn / Product Hunt | DRA·FDR | platform aspect presets (square/portrait), brand accent, MP4, fast |
| 4 | **Idealized agent / AI-flow demo** — show the agent doing the thing *perfectly*, even if it's half-built or flaky live | FDR·DRA | streaming-output look, tool-call styling, freedom to fabricate output |
| 5 | **Slide / deck terminal moment** — a clean terminal beat in a deck, sometimes a still | FDR·EDU | landscape, plain/no chrome, high-res, PNG still export |
| 6 | **Tutorial / course clip series** — a consistent set of step-by-step clips | EDU | duplicate/fork a scene, locked theme |
| 7 | **Bug-repro / issue illustration** — paste failing command + error onto a PR/issue | MNT | `err` styling, plain chrome, speed over polish |
| 8 | **Seamless loop b-roll** — ambient looping terminal behind a talk slide/hero | DRA | `loopOffset`, longer, muted |
| 9 | **Brand-kit clip set** — our company's terminal colors/prompt across many clips | DRA (org) | visual color overrides on a preset + save/reuse a custom theme |
| 10 | **Share-to-fork** — send a teammate a link to my scene to tweak theirs | DRA·EDU | URL-hash share, opens editable in Composer |

## Synthesis — the design center of gravity

Scenarios **1–5 cluster hard**, and the cluster dictates the UX:

- **Start from a template, never a blank file.** 1, 2, 3, 5 all begin from a known-good
  look. Empty-editor authoring is the *secondary* path.
- **"The look" is a primary creative act.** 2, 3, 4, 5 are all "make it look like X."
  → visual theme picker (swatch + label) and visual aspect selector are *core*, not
  dropdowns tucked in a bar.
- **The dominant gesture is "click a visible line, edit its text."** 1, 3, 4, 7 are
  content swaps on an existing scene, not choreography built from scratch. **Build
  Composer around that one gesture first.** Insert / reorder / timing / stream / color
  are the long tail → progressive disclosure, never blocking the main path.
- **Destination drives aspect *and* format.** README→wide→GIF; social→square/portrait→MP4;
  deck→landscape→PNG/MP4.

**The loop to optimize, end to end:**
> pick a template (look) → swap text on the preview → confirm look (theme + aspect) →
> export to destination.

Target: a finished clip in **under a minute, no JSON, no schema knowledge.**

### Implications that fall out
- **Reframe the aspect picker as "where's this going?"** (README / X post / story / slide).
  One creator-legible choice sets aspect *and* nudges export format — collapses two
  expert decisions into one. Serves 2, 3, 5.
- **Code view serves MNT-precision + agents.** Keep it an equal-peer **Visual | Code**
  toggle (remembers last choice), but **default new creators into Visual/template.**
- **Compose vs Play split.** Edit on a *frozen, fully-settled* render (every line shown
  in full, nothing typing, nothing clipped) — a static transcript that *looks* like the
  terminal but *behaves* like a document. Flip to **Play** for the real timed playback
  (the thing that exports). This neutralizes the three frictions of editing on a live
  playhead: time (lines mid-type), scroll (overflow clips the top), and invisible props
  (`wait`/`stream`/`style` have no stable visual at an instant — render them as
  compose-only chips).

### Don't design for (scope discipline)
Multi-scene side-by-side, a video-editor timeline, multiplayer/cloud sync, batch
rendering. Honor the model: **single scene, instant, local** (URL-hash + localStorage,
never a backend — keeps the instant/private magic).

## Open naming question

The core gesture is **customize / remix a template**, not compose-from-scratch.
"Composer" was chosen before that reframe — revisit whether it still fits (vs. Studio,
or a remix-flavored name). URL path stays `/playground/` regardless so links/OG/README
don't break.

## The gallery rethink (front door → Composer)

**Today** the gallery is a *style board*: 8 cards, one per terminal look (claude, warp,
gemini, codex, iterm2, macos, ubuntu, starship), each hover → "Customize in playground."
It's organized by the **visual axis** and the scenes were authored to demo *fidelity*.

**Problem:** that answers "which terminal?" — but a visitor arrives with a **job**
("I need a README clip / a launch post / an agent demo"), not a terminal preference.
Organizing the front door by style optimizes for the secondary decision.

**Direction:** make **use-case the primary gallery axis, style a secondary filter.**
- Primary cards = the high-value scenarios (1–5): *README hero · Launch / social ·
  Agent demo · Deck moment · Bug repro.* Each card is a real, finished clip; hover →
  **"Make this mine"** → opens that scene in Composer, already shaped for the job
  (right aspect, right chrome, sensible steps to swap).
- Secondary control = a **style toggle/filter** (the 8 terminal looks) that re-skins the
  shown examples, so "I want it to look like Warp" is one click *within* a use case.
- This makes the gallery a **scenario launcher** that hands the visitor a job-shaped
  starting point — which is exactly Composer's template-first landing. Gallery and
  Composer become the same on-ramp, not two separate ideas.

**Why this matters:** it aligns the front door with scenario #1 (the universal on-ramp)
and the "start from a template, never blank" principle. Style stops being the headline
and becomes what it actually is — a property of the clip you adjust, not the reason you
came.

> Caveat to validate: we have 8 style exemplars but only a few job-shaped scenes today.
> Standing up a use-case gallery means authoring 1 strong reference clip per scenario
> (1–5) — worth it, since those double as the Composer templates.

## Sequencing (cheapest validation first)

0. **Reframe + plumbing** (days): positioning/copy, own OG, **share-via-URL-hash**,
   **localStorage autosave**, templates-as-landing. Then watch exports/shares — does the
   creator audience pull? *(autosave + share + templates already agreed for the next pass.)*
1. **Composer visual editor** (the investment): compose/play split, click-to-edit on the
   settled preview, visual theme + aspect("where's this going?") selectors, Visual|Code
   equal-peer toggle. Build only if Phase 0 shows pull.
2. **Use-case gallery + style filter**, social-aspect export presets, hash-based community
   scene sharing.

## The gallery slate — 1 hero + 6 cards (decided)

Selected via a multi-agent workflow (5 diverse-lens generators → 20 candidates →
4-judge panel optimizing the whole set → chairman synthesis → adversarial critic →
one forced revision). All 7 scenes authored in `design/gallery-scenes/`, lint-clean,
rendered to `design/gallery-preview/clips/`, and previewed on a local mock wall
(`design/gallery-preview/index.html`).

**The discipline:** each tile must be distinct in BOTH *job* (persona) AND *visual
register* (how it looks/moves). The wall must scan as "pick your job," never "seven
terminals." Seven distinct registers: terracotta tool-log · green receipt-table · red
error dump · violet snap-reveal · chromeless loop · row-by-row verdict · light
narrated before/after.

### HERO — Watch the agent do the work `MNT·DRA·FDR`
`claude · wide · mp4 · align:top`. A coding agent takes an instruction and finishes a
real task: Thinking → Grep/Read/Edit tool calls → animated test bar → green PASS →
streamed summary. The proven wedge + the on-zeitgeist first frame; already the
rendered OG/README asset. Owns the agent register so no card repeats it.
*Moat:* a flawless 9s real take is a re-record lottery; termscene authors the ideal run.

### Card 1 — Your AI product, doing its job perfectly `FDR·DRA`
`midnight + #34d399 green · wide · mp4 · align:top`. A *non-coding* agent (support bot
issuing a refund) with a boxed two-column result table + masked-PII receipts. Neutral
base so it reads as "your product," not a branded CLI. The sharpest moat card: pitch
the half-built product as if it works. *(Revised off `gemini` by the critic — gemini
collides with the claude hero AND the shipped gemini showcase scene.)*

### Card 2 — It broke, paste the proof `MNT·DRA`
`midnight · wide · gif · chrome:plain`. An all-red error cascade ending on one
yellow diagnosis line. Issue-native (no mac dots). Screenshot-bait in a feed of green
clips. *Moat:* stage the exact minimal repro — clean paths, one annotation line a real
pytest never prints.

### Card 3 — Launch clip, vertical `DRA·FDR`
`midnight + #7c5cff violet · portrait · mp4 · marginPad gutter`. The only 9:16, wrapped
in a violet social gutter. Snap-reveal deploy → live URL. The aspect platforms want.
*Moat:* platform-native frame, a fabricated "6s" build, a clean URL, zero secret leak.

### Card 4 — Ambient loop behind your talk `DRA`
`matrix · wide · webm · chrome:none · loopOffset:35%`. Seamless mono-green b-roll;
chromeless, hypnotic, no human punchline. The most visually extreme tile. *Moat:* a true
no-seam loop is the one thing recorders structurally cannot do. (Thinnest job, but the
sharpest structural claim — earns its slot.)

### Card 5 — Benchmark bake-off: we win `DRA·FDR`
`codex · square · gif · align:center · gutter`. A results table that fills row-by-row;
competitors dim, your row streams in green and wins. Austere = credible. *Moat:* author
the exact defensible numbers and a guaranteed clean sweep. The data is the deliverable.

### Card 6 — Teach one command `EDU`
`paper · square · gif · align:center · typeSpeed:16 · gutter`. The only light card;
slow narrated typing, `#` comment narration, before/after (git rebase → straight log).
Doubles as a PNG still for slides. *Moat:* conflict-free, readable, matched-look across
every clip in a course, in light mode for print/slides.

### Coverage
- **Personas:** MNT (hero + repro), DRA (deep: launch/loop/bench/repro), FDR (the three
  pitch/launch cards), EDU (one excellent dedicated light card — not a forced second).
- **Aspects:** 4 wide, 1 portrait, 2 square. **Light vs dark:** one light card (lesson)
  against six dark — the single bright tile is the clearest "pick your job" signal.
- **Themes:** claude / midnight×3 (green, red, violet — distinct accent+chrome+motion) /
  matrix / codex / paper. Base reuse is invisible once accent + chrome + aspect + motion
  diverge.

### Style toggle (secondary axis) behavior
- **Free re-skin:** repro (C2) + benchmark (C5) — job survives any dark theme.
- **Constrained:** hero cycles brand-CLI presets; C1 locked to *neutral* bases only
  (midnight/warp/custom) or it re-collides with the hero's agent register.
- **Locked:** lesson (light = teaching), ambient (matrix/chromeless = b-roll), launch
  (keep the violet gutter). The toggle must never let a re-skin dissolve a card's identity.

> **Build note:** this is a design mock under `design/`, not the shipped gallery. The
> live gallery lives in `docs/index.html` (still the style board). Promoting this means
> rewriting that section + wiring the cards' "Make this mine" deep-links into Composer.

---
*Source: design conversation 2026-06-12; slate added 2026-06-13. Update as decisions land.*
