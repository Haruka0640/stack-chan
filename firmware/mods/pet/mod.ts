import Timer from 'timer'

const STATE_UPDATE_INTERVAL_MS = 5000
const MIN_STATE_VALUE = 0
const MAX_STATE_VALUE = 100
const PET_SWIPE_MIN_DISTANCE_Y = 60
const PET_SWIPE_MAX_DRIFT_X = 45
const PET_SWIPE_MIN_VERTICAL_DOMINANCE = 1.5
const PET_SWIPE_MAX_DURATION_TICKS = 1500
const PET_SWIPE_START_MAX_Y = 140

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
  touch?: PetTouch
  application?: PetApplication
}

type PetTouchHandler = (x: number, y: number, ticks: number) => void
type PetScreenTouchPhase = 'began' | 'moved' | 'ended'
type PetScreenTouchHandler = (phase: PetScreenTouchPhase, x: number, y: number, ticks: number) => void

type PetTouch = {
  onTouchBegan?: PetTouchHandler
  onTouchMoved?: PetTouchHandler
  onTouchEnded?: PetTouchHandler
}

type PetApplication = {
  addScreenTouchListener?: (listener: PetScreenTouchHandler) => void
}

type PetState = {
  happiness: number
  loneliness: number
  sleepiness: number
  affection: number
  lastInteractionAt: number
}

let currentPetState: PetState | undefined

type GestureState = {
  tracking: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
  startTicks: number
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

function createGestureState(): GestureState {
  return {
    tracking: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTicks: 0,
  }
}

function isPetSwipe(gesture: GestureState, endX: number, endY: number, endTicks: number): boolean {
  const dx = endX - gesture.startX
  const dy = endY - gesture.startY
  const absDx = Math.abs(dx)
  const duration = endTicks - gesture.startTicks
  return (
    gesture.startY <= PET_SWIPE_START_MAX_Y &&
    dy >= PET_SWIPE_MIN_DISTANCE_Y &&
    absDx <= PET_SWIPE_MAX_DRIFT_X &&
    dy >= absDx * PET_SWIPE_MIN_VERTICAL_DOMINANCE &&
    duration <= PET_SWIPE_MAX_DURATION_TICKS
  )
}

function handleGestureBegan(gesture: GestureState, x: number, y: number, ticks: number): void {
  gesture.tracking = true
  gesture.startX = x
  gesture.startY = y
  gesture.lastX = x
  gesture.lastY = y
  gesture.startTicks = ticks
  tracePet(`touch began x=${x} y=${y}`)
}

function handleGestureMoved(gesture: GestureState, x: number, y: number): void {
  if (!gesture.tracking) {
    return
  }
  gesture.lastX = x
  gesture.lastY = y
}

function handleGestureEnded(gesture: GestureState, x: number, y: number, ticks: number): void {
  if (!gesture.tracking) {
    return
  }

  gesture.tracking = false
  const endX = Number.isFinite(x) ? x : gesture.lastX
  const endY = Number.isFinite(y) ? y : gesture.lastY
  if (isPetSwipe(gesture, endX, endY, ticks)) {
    tracePet(`pet swipe x=${gesture.startX}->${endX} y=${gesture.startY}->${endY}`)
    dispatchPetEvent(PetEvent.PET)
  } else {
    tracePet(`touch ignored x=${gesture.startX}->${endX} y=${gesture.startY}->${endY}`)
  }
}

function attachScreenGestureInput(robot: PetRobot): void {
  const gesture = createGestureState()
  if (robot.application?.addScreenTouchListener) {
    robot.application.addScreenTouchListener((phase, x, y, ticks) => {
      switch (phase) {
        case 'began':
          handleGestureBegan(gesture, x, y, ticks)
          break
        case 'moved':
          handleGestureMoved(gesture, x, y)
          break
        case 'ended':
          handleGestureEnded(gesture, x, y, ticks)
          break
      }
    })
    tracePet(
      `screen gesture input attached: pet swipe dy>=${PET_SWIPE_MIN_DISTANCE_Y}, abs(dx)<=${PET_SWIPE_MAX_DRIFT_X}`,
    )
    return
  }

  const touch = robot.touch
  if (!touch) {
    tracePet('touch input is not available')
    return
  }

  const previousOnTouchBegan = touch.onTouchBegan
  const previousOnTouchMoved = touch.onTouchMoved
  const previousOnTouchEnded = touch.onTouchEnded

  touch.onTouchBegan = (x, y, ticks) => {
    previousOnTouchBegan?.(x, y, ticks)
    handleGestureBegan(gesture, x, y, ticks)
  }

  touch.onTouchMoved = (x, y, ticks) => {
    previousOnTouchMoved?.(x, y, ticks)
    handleGestureMoved(gesture, x, y)
  }

  touch.onTouchEnded = (x, y, ticks) => {
    previousOnTouchEnded?.(x, y, ticks)
    handleGestureEnded(gesture, x, y, ticks)
  }

  tracePet(
    `screen gesture input attached: pet swipe dy>=${PET_SWIPE_MIN_DISTANCE_Y}, abs(dx)<=${PET_SWIPE_MAX_DRIFT_X}`,
  )
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
  attachScreenGestureInput(robot)

  Timer.repeat(() => {
    dispatchPetEvent(PetEvent.NONE)
    updatePetStateByTime(state)
  }, STATE_UPDATE_INTERVAL_MS)
}
