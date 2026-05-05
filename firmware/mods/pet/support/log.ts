import type { PetState } from '../domain/types'

export function tracePet(message: string): void {
  trace(`pet: ${message}\n`)
}

export function tracePetState(label: string, state: PetState): void {
  tracePet(
    `${label}: happiness=${state.happiness}, loneliness=${state.loneliness}, sleepiness=${state.sleepiness}, affection=${state.affection}, lastInteractionAt=${state.lastInteractionAt}`,
  )
}
