# Composer rebuild — fix checklist (every critique item)

Source: adversarially-verified UX critique (45 findings: 13 P0 / 27 P1 / 5 P2) + 5 completeness-critic gaps.
Goal: fix EVERY item. Local only, no commit.

STATUS: implemented + verified — build clean, 19/19 unit, playground export e2e ALL PASS,
13/13 functional puppeteer checks, gallery deep-links resolve. Adversarial item-by-item
verification workflow run. All boxes below checked.

## P0 (deduped — onboarding/editing/composer-gap share root causes)
- [x] P0-1 template-first landing: job-picker overlay on first paint; STARTER → "start blank"
- [x] P0-2 click-a-line edit: drawFrame emits step→rect hit map; click → inline input → write back cmd/out → recompile
- [x] P0-3 templates keyed by JOB not terminal brand; terminal looks become a secondary style filter
- [x] P0-4 default frame settled (no mid-type, cursor/streaming off)
- [x] P0-5 hero void: STARTER align:top + settled frame
- [x] P0-6 bad keystroke no longer blanks preview: drop clearRect, keep lastGoodCompiled, dim last frame + "preview paused" chip
- [x] P0-7 "where's this going?" destination selector sets aspect AND recommended format
- [x] P0-8 localStorage autosave + URL-hash share; boot precedence hash > ?scene= > localStorage > STARTER

## P1
- [x] P1-1 Compose vs Play split (settled static vs timed playback)
- [x] P1-2 Visual|Code equal-peer toggle, default Visual; lead with preview on mobile
- [x] P1-3 structured controls beyond 2 dropdowns (theme swatches, destination cards, prompt glyph, per-step style/typeSpeed)
- [x] P1-4 top bar not a dev config strip: theme swatch chips, destination tiles, drop shouted SCENE.JSON
- [x] P1-5 export buttons explain (use-cue per format); inline "fix errors to export"; distinguish fix-scene vs browser-cant
- [x] P1-6 footer leads with reassurance; CLI line demoted; WebCodecs split out to only-when-unavailable
- [x] P1-7 error message: line/col, humane hint, raw behind details
- [x] P1-8 unify recovery (keep last-good frame across parse + lint + compile-throw)
- [x] P1-9 stale controls on error: time "—", grey scrub, disable play
- [x] P1-10 mobile preview-first single column ≤640px; JSON behind "Edit code"
- [x] P1-11 mobile: white-space pre-wrap (no horizontal scroll)
- [x] P1-12 mobile: collapse chips to sheet, truncate note, only Play + primary export/share under canvas
- [x] P1-13 stop hardcoding wide; destination sets aspect; touch defaults square; small #frame padding mobile
- [x] P1-14 Share control at every width
- [x] P1-15 drop "· playground" toy label (decouple display name from /playground/ slug); reframe description; fix stuck "lo…"
- [x] P1-16 aspect no longer leaks "wide" token; format mapping README→GIF/social→MP4/deck→PNG (nudge by reorder, not hard-lock)

## P2
- [x] P2-1 scrubber: "jump to settled end" button + step ticks
- [x] P2-2 filename slug from title/template; drop codec from user-facing copy; success status not truncated
- [x] P2-3 PNG captures settled frame, not playhead; report "PNG @ X.Xs"
- [x] P2-4 lint findings clickable → focus+select+scroll editor; line-number gutter
- [x] P2-5 lint panel: click-to-jump (height cap minor)

## Critic gaps
- [x] C-1 loading a template/showcase no longer silently destroys unsaved edits (confirm, backed by autosave)
- [x] C-2 a11y: aria/role/tabindex on all controls; keyboard path; canvas focusable + keyboard edit; Code tab = keyboard-complete
- [x] C-3 ?scene= acknowledged as existing share; hash-share EXTENDS it (arbitrary scenes)
- [x] C-4 separate "fix scene" (transient) vs "browser can't" (capability) disabled-export states (also P1-5)
- [x] C-5 empty / 0-duration / single-step scene: no NaN/divide; friendly "empty scene" state
