export const EventType = Object.freeze({
  EVENT_NONE: 'EVENT_NONE',
  EVENT_TAP: 'EVENT_TAP',
  EVENT_SWIPE: 'EVENT_SWIPE',
  EVENT_LONG_PRESS: 'EVENT_LONG_PRESS',
  EVENT_LOUD_SOUND: 'EVENT_LOUD_SOUND',
  EVENT_IDLE_TIMEOUT: 'EVENT_IDLE_TIMEOUT',
})

export type EventType = (typeof EventType)[keyof typeof EventType]

export const ReactionType = Object.freeze({
  REACTION_IDLE: 'REACTION_IDLE',
  REACTION_SURPRISED: 'REACTION_SURPRISED',
  REACTION_SLEEPY: 'REACTION_SLEEPY',
})

export type ReactionType = (typeof ReactionType)[keyof typeof ReactionType]

export type Event = {
  type: EventType
  timestamp: number
}

export type Reaction = {
  type: ReactionType
  priority: number
  startedAt: number
  duration: number
}

export type PetRuntimeState = {
  eventQueue: Event[]
  currentReaction: Reaction
  lastInteractionAt: number
  idleEventFired: boolean
}

export type PetEmotion = 'NEUTRAL' | 'HAPPY' | 'SAD' | 'SLEEPY' | 'DOUBTFUL'

export type PetRobot = {
  setEmotion: (emotion: PetEmotion) => void
  setMouthOpen?: (value: number) => void
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
