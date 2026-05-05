import { tracePet, tracePetState } from '../support/log'
import type { PetReactionController } from './reactions'
import { now, updateState } from './state'
import type { PetState } from './types'

export const PetEvent = {
  NONE: 'NONE',
  PET: 'PET',
  POKE: 'POKE',
  TICKLE: 'TICKLE',
  HOLD: 'HOLD',
} as const

export type PetEvent = (typeof PetEvent)[keyof typeof PetEvent]
export type PetEventDispatcher = (event: PetEvent) => void

function tracePetEvent(event: PetEvent): void {
  tracePet(`EVENT_${event}`)
}

function onPet(state: PetState, reactions: PetReactionController): void {
  updateState(state, {
    happiness: 15,
    loneliness: -20,
    affection: 1,
    sleepiness: -5,
  })
  state.lastInteractionAt = now()
  tracePetState('pet reaction: happiness +15, loneliness -20, affection +1, sleepiness -5', state)
  reactions.onPet()
}

function onPoke(_state: PetState): void {
  tracePet('poke reaction is not implemented yet')
}

function onTickle(_state: PetState): void {
  tracePet('tickle reaction is not implemented yet')
}

function onHold(_state: PetState): void {
  tracePet('hold reaction is not implemented yet')
}

export function createPetEventDispatcher(state: PetState, reactions: PetReactionController): PetEventDispatcher {
  return (event) => {
    if (event === PetEvent.NONE) {
      return
    }

    tracePetEvent(event)

    switch (event) {
      case PetEvent.PET:
        onPet(state, reactions)
        break
      case PetEvent.POKE:
        onPoke(state)
        break
      case PetEvent.TICKLE:
        onTickle(state)
        break
      case PetEvent.HOLD:
        onHold(state)
        break
    }
  }
}
