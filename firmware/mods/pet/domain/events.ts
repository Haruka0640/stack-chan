import { tracePet } from '../support/log'
import { IDLE_TIMEOUT_MS } from './constants'
import type { PetReactionController } from './reactions'
import { now } from './state'
import { EventType, type PetRuntimeState, ReactionType } from './types'

export type PetEventDispatcher = (type: EventType) => void

export function isUserStimulus(type: EventType): boolean {
  switch (type) {
    case EventType.EVENT_TAP:
    case EventType.EVENT_SWIPE:
    case EventType.EVENT_LONG_PRESS:
    case EventType.EVENT_LOUD_SOUND:
      return true
    case EventType.EVENT_NONE:
    case EventType.EVENT_IDLE_TIMEOUT:
      return false
  }
  return false
}

export function pushEvent(state: PetRuntimeState, type: EventType): void {
  if (type === EventType.EVENT_NONE) {
    return
  }
  state.eventQueue.push({ type, timestamp: now() })
  tracePet(`event queued ${type}`)
}

export function pollInputs(state: PetRuntimeState): void {
  if (state.idleEventFired) {
    return
  }
  if (now() - state.lastInteractionAt < IDLE_TIMEOUT_MS) {
    return
  }
  pushEvent(state, EventType.EVENT_IDLE_TIMEOUT)
  state.idleEventFired = true
}

function reactionTypeForEvent(type: EventType): ReactionType | undefined {
  switch (type) {
    case EventType.EVENT_TAP:
    case EventType.EVENT_LOUD_SOUND:
      return ReactionType.REACTION_SURPRISED
    case EventType.EVENT_SWIPE:
    case EventType.EVENT_IDLE_TIMEOUT:
      return ReactionType.REACTION_SLEEPY
    case EventType.EVENT_NONE:
    case EventType.EVENT_LONG_PRESS:
      return undefined
  }
  return undefined
}

export function processEventQueue(state: PetRuntimeState, reactions: PetReactionController): void {
  while (state.eventQueue.length > 0) {
    const event = state.eventQueue.shift()
    if (!event) {
      return
    }

    tracePet(`event processing ${event.type}`)
    if (isUserStimulus(event.type)) {
      state.lastInteractionAt = event.timestamp
      state.idleEventFired = false
    }

    const reactionType = reactionTypeForEvent(event.type)
    if (reactionType) {
      reactions.startReaction(reactionType)
    }
  }
}

export function createPetEventDispatcher(state: PetRuntimeState): PetEventDispatcher {
  return (type) => pushEvent(state, type)
}
