export type PetEmotion = 'NEUTRAL' | 'HAPPY' | 'SAD' | 'SLEEPY'

export type PetRobot = {
  setEmotion: (emotion: PetEmotion) => void
  tone?: (hz: number, duration: number, volume?: number) => Promise<void>
  setPose?: (pose: { rotation: { y: number; p: number; r: number } }, time?: number) => Promise<void>
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
