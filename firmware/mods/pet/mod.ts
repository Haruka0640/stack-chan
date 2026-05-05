import Timer from 'timer'

const STATE_UPDATE_INTERVAL_MS = 5000
const MIN_STATE_VALUE = 0
const MAX_STATE_VALUE = 100

const PetEvent = {
  NONE: 'NONE',
  PET: 'PET',
  POKE: 'POKE',
  TICKLE: 'TICKLE',
  HOLD: 'HOLD',
} as const

type PetEvent = (typeof PetEvent)[keyof typeof PetEvent]

type PetRobot = {
  setEmotion: (emotion: 'NEUTRAL') => void
}

type PetState = {
  happiness: number
  loneliness: number
  sleepiness: number
  affection: number
  lastInteractionAt: number
}

let currentPetState: PetState | undefined

function tracePet(message: string): void {
  trace(`pet: ${message}\n`)
}

function now(): number {
  return Date.now()
}

function clampStateValue(value: number): number {
  return Math.max(MIN_STATE_VALUE, Math.min(MAX_STATE_VALUE, value))
}

function createInitialPetState(): PetState {
  return {
    happiness: 50,
    loneliness: 20,
    sleepiness: 10,
    affection: 0,
    lastInteractionAt: now(),
  }
}

function updateState(
  state: PetState,
  delta: Partial<Pick<PetState, 'happiness' | 'loneliness' | 'sleepiness' | 'affection'>>,
): void {
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

function tracePetState(label: string, state: PetState): void {
  tracePet(
    `${label}: happiness=${state.happiness}, loneliness=${state.loneliness}, sleepiness=${state.sleepiness}, affection=${state.affection}, lastInteractionAt=${state.lastInteractionAt}`,
  )
}

function tracePetEvent(event: PetEvent): void {
  tracePet(`EVENT_${event}`)
}

function setSafeStartup(robot: PetRobot): void {
  robot.setEmotion('NEUTRAL')
  tracePet('emotion set to NEUTRAL')
}

function onPet(state: PetState): void {
  updateState(state, {
    happiness: 15,
    loneliness: -20,
    affection: 1,
    sleepiness: -5,
  })
  state.lastInteractionAt = now()
  tracePetState('pet reaction: happiness +15, loneliness -20, affection +1, sleepiness -5', state)
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

function dispatchPetEvent(event: PetEvent): void {
  if (event === PetEvent.NONE) {
    return
  }

  const state = currentPetState
  if (state === undefined) {
    tracePet(`EVENT_${event} ignored because state is not ready`)
    return
  }

  tracePetEvent(event)

  switch (event) {
    case PetEvent.PET:
      onPet(state)
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

function updatePetStateByTime(state: PetState): void {
  updateState(state, {
    happiness: -1,
    loneliness: 1,
    sleepiness: 1,
  })
  tracePetState('time update', state)
}

export function onRobotCreated(robot: PetRobot): void {
  tracePet('MOD started')
  setSafeStartup(robot)

  const state = createInitialPetState()
  currentPetState = state
  tracePetState('initial state', state)

  Timer.repeat(() => {
    dispatchPetEvent(PetEvent.NONE)
    updatePetStateByTime(state)
  }, STATE_UPDATE_INTERVAL_MS)
}
