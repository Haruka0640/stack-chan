import type { PetRuntimeState } from '../domain/types'

export function tracePet(message: string): void {
  trace(`pet: ${message}\n`)
}

export function tracePetRuntimeState(label: string, state: PetRuntimeState): void {
  tracePet(
    `${label}: currentReaction=${state.currentReaction.type}, queue=${state.eventQueue.length}, lastInteractionAt=${state.lastInteractionAt}, idleEventFired=${state.idleEventFired}`,
  )
}
