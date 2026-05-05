import {
  PET_SWIPE_MAX_DRIFT_X,
  PET_SWIPE_MAX_DURATION_TICKS,
  PET_SWIPE_MIN_DISTANCE_Y,
  PET_SWIPE_MIN_VERTICAL_DOMINANCE,
  PET_SWIPE_START_MAX_Y,
} from '../domain/constants'
import { PetEvent, type PetEventDispatcher } from '../domain/events'
import type { PetRobot } from '../domain/types'
import { tracePet } from '../support/log'

type GestureState = {
  tracking: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
  startTicks: number
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

function handleGestureEnded(
  gesture: GestureState,
  dispatchPetEvent: PetEventDispatcher,
  x: number,
  y: number,
  ticks: number,
): void {
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

function traceGestureAttached(): void {
  tracePet(
    `screen gesture input attached: pet swipe dy>=${PET_SWIPE_MIN_DISTANCE_Y}, abs(dx)<=${PET_SWIPE_MAX_DRIFT_X}`,
  )
}

export function attachScreenGestureInput(robot: PetRobot, dispatchPetEvent: PetEventDispatcher): void {
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
          handleGestureEnded(gesture, dispatchPetEvent, x, y, ticks)
          break
      }
    })
    traceGestureAttached()
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
    handleGestureEnded(gesture, dispatchPetEvent, x, y, ticks)
  }

  traceGestureAttached()
}
