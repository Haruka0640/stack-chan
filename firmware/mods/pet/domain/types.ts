export type PetRobot = {
  setEmotion: (emotion: 'NEUTRAL') => void
  touch?: PetTouch
  application?: PetApplication
}

export type PetTouchHandler = (x: number, y: number, ticks: number) => void
export type PetScreenTouchPhase = 'began' | 'moved' | 'ended'
export type PetScreenTouchHandler = (phase: PetScreenTouchPhase, x: number, y: number, ticks: number) => void

export type PetTouch = {
  onTouchBegan?: PetTouchHandler
  onTouchMoved?: PetTouchHandler
  onTouchEnded?: PetTouchHandler
}

export type PetApplication = {
  addScreenTouchListener?: (listener: PetScreenTouchHandler) => void
}

export type PetState = {
  happiness: number
  loneliness: number
  sleepiness: number
  affection: number
  lastInteractionAt: number
}
