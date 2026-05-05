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
- Task: None selected yet
- Notes: Start with `P0-01` unless the next instruction says otherwise.

## Milestones

### P0: Project Scaffold

- [ ] `P0-01` Add `manifest.json` and minimal `mod.js` that loads as a MOD.
  - Acceptance: `npm run mod mods/pet/manifest.json` can target the MOD manifest.
  - Verification: Build or manifest validation attempted from `firmware/`.
- [ ] `P0-02` Add safe startup behavior.
  - Acceptance: On launch, Stack-chan enters a normal idle expression without servo surprises.
  - Verification: Code path inspected or run on device.
- [ ] `P0-03` Add lightweight debug tracing.
  - Acceptance: Important state transitions and input events can be observed with `trace`.
  - Verification: Trace strings are present and scoped to pet MOD behavior.

### P1: State Model

- [ ] `P1-01` Implement `PetState` in JavaScript.
  - Acceptance: `happiness`, `loneliness`, `sleepiness`, `affection`, and `lastInteractionAt` exist with spec defaults.
  - Verification: Startup trace prints initial state once.
- [ ] `P1-02` Implement clamped state updates.
  - Acceptance: State values stay in the `0..100` range.
  - Verification: Unit-like helper checks or manual trace inspection.
- [ ] `P1-03` Implement 5 second time decay.
  - Acceptance: Every 5 seconds, loneliness and sleepiness increase, happiness decreases.
  - Verification: Trace shows periodic state updates.

### P2: Event Abstraction

- [ ] `P2-01` Define `PetEvent`.
  - Acceptance: `NONE`, `PET`, `POKE`, `TICKLE`, and `HOLD` events are represented in one place.
  - Verification: Handlers consume events rather than raw input details.
- [ ] `P2-02` Add `dispatchPetEvent(event)`.
  - Acceptance: All reactions flow through one dispatch function.
  - Verification: Screen input can be replaced by another source without touching reaction logic.
- [ ] `P2-03` Implement `onPet()`.
  - Acceptance: Petting updates state exactly as specified in `plan.md`.
  - Verification: Trace confirms happiness +15, loneliness -20, affection +1, sleepiness -5.

### P3: Screen Gesture Input

- [ ] `P3-01` Investigate CoreS3 touch input API available to MODs.
  - Acceptance: Identify the concrete API or robot service to read taps/swipes.
  - Verification: Notes added under `Implementation Notes`.
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

- Keep implementation in JavaScript because existing MODs use `mod.js`.
- Run commands from `firmware/`.
- Use `mods/pet/manifest.json` as the MOD manifest path.
- Touch input API is not confirmed yet. Start `P3-01` by checking existing CoreS3 or renderer/input code.

## Verification Log

Record completed checks here with date, task ID, command or device action, and result.

- 2026-05-05: Task board created from `plan.md`. No firmware behavior changed.
