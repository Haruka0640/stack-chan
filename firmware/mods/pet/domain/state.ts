import { tracePetState } from '../support/log'
import { MAX_STATE_VALUE, MIN_STATE_VALUE } from './constants'
import type { PetState } from './types'

type PetStateDelta = Partial<Pick<PetState, 'happiness' | 'loneliness' | 'sleepiness' | 'affection'>>

export function now(): number {
  return Date.now()
}

function clampStateValue(value: number): number {
  return Math.max(MIN_STATE_VALUE, Math.min(MAX_STATE_VALUE, value))
}

export function createInitialPetState(): PetState {
  return {
    happiness: 50,
    loneliness: 20,
    sleepiness: 10,
    affection: 0,
    lastInteractionAt: now(),
  }
}

export function updateState(state: PetState, delta: PetStateDelta): void {
  if (delta.happiness !== undefined) {
    state.happiness = clampStateValue(state.happiness + delta.happiness)
  }
  if (delta.loneliness !== undefined) {
    state.loneliness = clampStateValue(state.loneliness + delta.loneliness)
  }
  if (delta.sleepiness !== undefined) {
    state.sleepiness = clampStateValue(state.sleepiness + delta.sleepiness)
  }
  if (delta.affection !== undefined) {
    state.affection = clampStateValue(state.affection + delta.affection)
  }
}

export function updatePetStateByTime(state: PetState): void {
  updateState(state, {
    happiness: -1,
    loneliness: 1,
    sleepiness: 1,
  })
  tracePetState('time update', state)
}
