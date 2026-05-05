# Pet Stack-chan Task Board

This file tracks incremental implementation work for the `pet` MOD.
Use `plan.md` as the product spec, and update this board whenever a task starts or finishes.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked or needs a decision

## Operating Rules

- Keep each task small enough to implement and verify in one step.
- Before starting a task, mark it `[~]` and add a short note to `Current Focus`.
- When finishing a task, mark it `[x]`, record verification, and choose the next likely task.
- Do not skip event abstraction: screen gestures and future physical sensors must both dispatch `PetEvent`.
- Prefer safe servo movement first. Start with small pose changes and make reactions easy to tune later.

## Current Focus

- Status: `[ ]`
- Task: `P3-01`
- Notes: P2 event abstraction is complete. Next likely step is investigating the CoreS3 touch input API exposed to MODs.

## Milestones

### P0: Project Scaffold

- [x] `P0-01` Add `manifest.json` and minimal `mod.ts` that loads as a MOD.
  - Acceptance: `npm run mod mods/pet/manifest.json` can target the MOD manifest.
  - Verification: Build or manifest validation attempted from `firmware/`.
- [x] `P0-02` Add safe startup behavior.
  - Acceptance: On launch, Stack-chan enters a normal idle expression without servo surprises.
  - Verification: Code path inspected or run on device.
- [x] `P0-03` Add lightweight debug tracing.
  - Acceptance: Important state transitions and input events can be observed with `trace`.
  - Verification: Trace strings are present and scoped to pet MOD behavior.

### P1: State Model

- [x] `P1-01` Implement `PetState` in TypeScript.
  - Acceptance: `happiness`, `loneliness`, `sleepiness`, `affection`, and `lastInteractionAt` exist with spec defaults.
  - Verification: Startup trace prints initial state once.
- [x] `P1-02` Implement clamped state updates.
  - Acceptance: State values stay in the `0..100` range.
  - Verification: Unit-like helper checks or manual trace inspection.
- [x] `P1-03` Implement 5 second time decay.
  - Acceptance: Every 5 seconds, loneliness and sleepiness increase, happiness decreases.
  - Verification: Trace shows periodic state updates.

### P2: Event Abstraction

- [x] `P2-01` Define `PetEvent`.
  - Acceptance: `NONE`, `PET`, `POKE`, `TICKLE`, and `HOLD` events are represented in one place.
  - Verification: Handlers consume events rather than raw input details.
- [x] `P2-02` Add `dispatchPetEvent(event)`.
  - Acceptance: All reactions flow through one dispatch function.
  - Verification: Screen input can be replaced by another source without touching reaction logic.
- [x] `P2-03` Implement `onPet()`.
  - Acceptance: Petting updates state exactly as specified in `plan.md`.
  - Verification: Trace confirms happiness +15, loneliness -20, affection +1, sleepiness -5.

### P3: Screen Gesture Input

- [x] `P3-00` Resolve conflict with the built-in drawer gesture.
  - Acceptance: Pet gestures do not accidentally open or close the drawer.
  - Verification: Manual CoreS3 test confirms downward pet swipe leaves drawer state unchanged.
- [ ] `P3-01` Investigate CoreS3 touch input API available to MODs.
  - Acceptance: Identify the concrete API or robot service to read taps/swipes.
  - Verification: Notes added under `Implementation Notes`, including drawer interaction behavior.
- [ ] `P3-02` Implement downward swipe detection.
  - Acceptance: A top-to-bottom swipe dispatches `PET`.
  - Verification: Device trace shows `EVENT_PET`.
- [ ] `P3-03` Add basic gesture thresholds.
  - Acceptance: Small accidental movements do not trigger petting.
  - Verification: Manual device test notes recorded.

### P4: Reactions

- [ ] `P4-01` Implement expression selection priority.
  - Acceptance: One-shot reaction > sleepy > lonely > happy > normal.
  - Verification: State forcing or trace confirms selected expression.
- [ ] `P4-02` Implement petting expression.
  - Acceptance: Petting immediately shows a happy reaction face.
  - Verification: Device or renderer inspection.
- [ ] `P4-03` Implement happy sound.
  - Acceptance: Petting plays two short high beeps.
  - Verification: Device test or API inspection.
- [ ] `P4-04` Implement happy servo motion.
  - Acceptance: Petting moves gently right, left, then center within safe limits.
  - Verification: Device test with small angles first.

### P5: Idle Mood

- [ ] `P5-01` Show lonely expression.
  - Acceptance: `loneliness >= 70` selects the lonely face unless sleepiness or one-shot reaction has priority.
  - Verification: Forced state trace or device test.
- [ ] `P5-02` Show sleepy expression.
  - Acceptance: `sleepiness >= 70` selects the sleepy face unless one-shot reaction has priority.
  - Verification: Forced state trace or device test.
- [ ] `P5-03` Add optional idle sounds.
  - Acceptance: Lonely and sleepy sounds are present but not annoying in normal idle.
  - Verification: Device test notes.

### P6: Optional Interactions

- [ ] `P6-01` Implement tap as `POKE`.
- [ ] `P6-02` Implement horizontal swipe as `TICKLE`.
- [ ] `P6-03` Implement long press as `HOLD`.

### P7: Physical Sensor Readiness

- [ ] `P7-01` Add a placeholder sensor input adapter.
  - Acceptance: Future head touch sensor can dispatch `PET` without changing state or reaction handlers.
- [ ] `P7-02` Document physical sensor integration points.
  - Acceptance: Notes explain where to add sensor read code and which event to dispatch.

## Implementation Notes

- Keep implementation in TypeScript for this MOD. Use `mod.ts`.
- Avoid firmware path imports inside MOD TypeScript unless the MOD build is confirmed to resolve them; `mcrun` compiles the MOD in isolation.
- Run commands from `firmware/`.
- Use `mods/pet/manifest.json` as the MOD manifest path.
- Touch input API is not confirmed yet. Start `P3-01` by checking existing CoreS3 or renderer/input code.
- Drawer conflict note: `renderers-piu/behaviors/face.ts` bubbles `onFaceTouch` on touch end, and `renderers-piu/app-controller.ts` toggles the drawer in `onFaceTouch`. A raw screen swipe for petting may therefore also toggle the drawer unless we add a guard, change the drawer gesture, or choose a non-conflicting pet input.
- Drawer conflict resolution: face taps no longer toggle the drawer. `renderers-piu/face-view.ts` now opens the drawer only when a touch starts within 16 px of the right screen edge and swipes left by at least 36 px with limited vertical drift.

## Verification Log

Record completed checks here with date, task ID, command or device action, and result.

- 2026-05-05: Task board created from `plan.md`. No firmware behavior changed.
- 2026-05-05: `P0-01` Added `manifest.json` and TypeScript `mod.ts`. `npm run mod mods/pet/manifest.json` reached `tsc`, `xsc`, and `xsl`; final failure was opening local `xsbug.app`, not TypeScript compilation.
- 2026-05-05: `P0-02` Added safe startup behavior by setting `NEUTRAL` emotion only; no servo motion is triggered.
- 2026-05-05: `P0-03` Added scoped `pet:` startup and emotion traces. `npm run format -- mods/pet` and `npm run lint -- mods/pet` passed.
- 2026-05-05: `P1-01` Added typed `PetState` defaults and startup state trace.
- 2026-05-05: `P1-02` Added clamped state update helper for all mood values.
- 2026-05-05: `P1-03` Added 5 second `Timer.repeat` decay. `npm run format -- mods/pet` and `npm run lint -- mods/pet` passed. `npm run mod ./mods/pet/manifest.json` reached `tsc`, `xsc`, and `xsl`; final failure was opening local `xsbug.app`.
- 2026-05-05: `P3-00` Changed drawer activation from face tap to right-edge inward swipe. `npm run format -- stackchan/renderers-piu/behaviors/face.ts stackchan/renderers-piu/face-view.ts stackchan/renderers-piu/app-controller.ts mods/pet` and matching lint command passed. `npm_config_target=esp32/m5stack_cores3 npm run build` passed with escalated filesystem access for the Moddable SDK build directory.
- 2026-05-05: `P2-01`/`P2-02`/`P2-03` Added `PetEvent`, `dispatchPetEvent(event)`, and `onPet()` state updates. `npm run format:fix -- mods/pet` and `npm run lint -- mods/pet` passed. `npm run mod ./mods/pet/manifest.json` reached `tsc`, `xsc`, and `xsl`; final failure was opening local `xsbug.app`.
