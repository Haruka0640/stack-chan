import { tracePet } from '../support/log'
import {
  REACTION_IDLE_DURATION_MS,
  REACTION_IDLE_PRIORITY,
  REACTION_SLEEPY_DURATION_MS,
  REACTION_SLEEPY_PRIORITY,
  REACTION_SURPRISED_DURATION_MS,
  REACTION_SURPRISED_PRIORITY,
  SLEEPY_MOTION_PITCH,
  SLEEPY_MOTION_STEP_SECONDS,
  SURPRISED_SOUND_DURATION_MS,
  SURPRISED_SOUND_HZ,
  SURPRISED_SOUND_VOLUME,
} from './constants'
import { now } from './state'
import { type PetEmotion, type PetRobot, type PetRuntimeState, type Reaction, ReactionType } from './types'

export type PetReactionController = {
  startReaction: (type: ReactionType) => void
  updateReaction: () => void
  renderFace: () => void
  renderTouchRipple: () => void
}

export function getReactionPriority(type: ReactionType): number {
  switch (type) {
    case ReactionType.REACTION_SURPRISED:
      return REACTION_SURPRISED_PRIORITY
    case ReactionType.REACTION_SLEEPY:
      return REACTION_SLEEPY_PRIORITY
    case ReactionType.REACTION_IDLE:
      return REACTION_IDLE_PRIORITY
  }
  return REACTION_IDLE_PRIORITY
}

export function getReactionDuration(type: ReactionType): number {
  switch (type) {
    case ReactionType.REACTION_SURPRISED:
      return REACTION_SURPRISED_DURATION_MS
    case ReactionType.REACTION_SLEEPY:
      return REACTION_SLEEPY_DURATION_MS
    case ReactionType.REACTION_IDLE:
      return REACTION_IDLE_DURATION_MS
  }
  return REACTION_IDLE_DURATION_MS
}

export function makeReaction(type: ReactionType): Reaction {
  return {
    type,
    priority: getReactionPriority(type),
    startedAt: now(),
    duration: getReactionDuration(type),
  }
}

function isReactionFinished(reaction: Reaction, timestamp = now()): boolean {
  return reaction.duration > 0 && timestamp - reaction.startedAt >= reaction.duration
}

function getSleepyProgress(reaction: Reaction): number {
  if (reaction.type !== ReactionType.REACTION_SLEEPY || reaction.duration <= 0) {
    return 0
  }
  return Math.max(0, Math.min(1, (now() - reaction.startedAt) / reaction.duration))
}

function emotionForReaction(reaction: Reaction): PetEmotion {
  switch (reaction.type) {
    case ReactionType.REACTION_SURPRISED:
      return 'NEUTRAL'
    case ReactionType.REACTION_SLEEPY:
      return 'SLEEPY'
    case ReactionType.REACTION_IDLE:
      return 'NEUTRAL'
  }
  return 'NEUTRAL'
}

export function createPetReactionController(robot: PetRobot, state: PetRuntimeState): PetReactionController {
  let currentEmotion: PetEmotion | undefined
  let currentMouthOpen: number | undefined
  let sleepyMotionRunning = false

  function applyMouthOpen(value: number): void {
    if (!robot.setMouthOpen || currentMouthOpen === value) {
      return
    }
    currentMouthOpen = value
    robot.setMouthOpen(value)
  }

  function applyEmotion(emotion: PetEmotion): void {
    if (emotion === currentEmotion) {
      return
    }
    currentEmotion = emotion
    robot.setEmotion(emotion)
    tracePet(`expression set to ${emotion}`)
  }

  async function playSurprisedSound(): Promise<void> {
    if (!robot.tone) {
      tracePet('surprised sound skipped because tone is not available')
      return
    }
    try {
      await robot.tone(SURPRISED_SOUND_HZ, SURPRISED_SOUND_DURATION_MS, SURPRISED_SOUND_VOLUME)
    } catch (error) {
      tracePet(`surprised sound failed: ${String(error)}`)
    }
  }

  async function playSleepyMotion(): Promise<void> {
    if (!robot.setPose) {
      tracePet('sleepy motion skipped because setPose is not available')
      return
    }
    if (sleepyMotionRunning) {
      tracePet('sleepy motion skipped because a motion is already running')
      return
    }

    sleepyMotionRunning = true
    try {
      await robot.setPose({ rotation: { y: 0, p: SLEEPY_MOTION_PITCH, r: 0 } }, SLEEPY_MOTION_STEP_SECONDS)
      await robot.setPose({ rotation: { y: 0, p: 0, r: 0 } }, SLEEPY_MOTION_STEP_SECONDS)
    } catch (error) {
      tracePet(`sleepy motion failed: ${String(error)}`)
    } finally {
      sleepyMotionRunning = false
    }
  }

  function startReactionEffects(type: ReactionType): void {
    switch (type) {
      case ReactionType.REACTION_SURPRISED:
        void playSurprisedSound()
        break
      case ReactionType.REACTION_SLEEPY:
        void playSleepyMotion()
        break
      case ReactionType.REACTION_IDLE:
        break
    }
  }

  function startReaction(type: ReactionType): void {
    if (type === ReactionType.REACTION_IDLE) {
      state.currentReaction = makeReaction(type)
      tracePet('reaction set to REACTION_IDLE')
      return
    }

    const current = state.currentReaction
    const next = makeReaction(type)
    if (!isReactionFinished(current) && next.priority <= current.priority) {
      tracePet(`reaction ignored ${type} while ${current.type} is active`)
      return
    }

    state.currentReaction = next
    tracePet(`reaction started ${type}`)
    startReactionEffects(type)
  }

  function updateReaction(): void {
    const current = state.currentReaction
    if (current.type !== ReactionType.REACTION_IDLE && isReactionFinished(current)) {
      state.currentReaction = makeReaction(ReactionType.REACTION_IDLE)
      tracePet(`reaction finished ${current.type}`)
    }
  }

  function renderFace(): void {
    const reaction = state.currentReaction
    applyEmotion(emotionForReaction(reaction))
    if (reaction.type === ReactionType.REACTION_SURPRISED) {
      applyMouthOpen(1)
      return
    }
    if (reaction.type === ReactionType.REACTION_SLEEPY) {
      applyMouthOpen(0.15 * (1 - getSleepyProgress(reaction)))
      return
    }
    applyMouthOpen(0)
  }

  function renderTouchRipple(): void {
    // The Piu face view owns touch ripple drawing. The pet MOD keeps it independent from reactions.
  }

  return {
    startReaction,
    updateReaction,
    renderFace,
    renderTouchRipple,
  }
}
