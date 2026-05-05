import Timer from 'timer'

const STATE_UPDATE_INTERVAL_MS = 5000
const MIN_STATE_VALUE = 0
const MAX_STATE_VALUE = 100

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

function setSafeStartup(robot: PetRobot): void {
  robot.setEmotion('NEUTRAL')
  tracePet('emotion set to NEUTRAL')
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
  tracePetState('initial state', state)

  Timer.repeat(() => {
    updatePetStateByTime(state)
  }, STATE_UPDATE_INTERVAL_MS)
}
