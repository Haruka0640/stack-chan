import { type PetRuntimeState, ReactionType } from './types'

export function now(): number {
  return Date.now()
}

export function createInitialPetRuntimeState(): PetRuntimeState {
  const startedAt = now()
  return {
    eventQueue: [],
    currentReaction: {
      type: ReactionType.REACTION_IDLE,
      priority: 0,
      startedAt,
      duration: 0,
    },
    lastInteractionAt: startedAt,
    idleEventFired: false,
  }
}
