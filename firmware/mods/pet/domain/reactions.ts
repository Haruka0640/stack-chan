import Timer from 'timer'
import { tracePet } from '../support/log'
import {
  HAPPY_EXPRESSION_MIN,
  HAPPY_MOTION_STEP_SECONDS,
  HAPPY_MOTION_YAW,
  HAPPY_SOUND_DURATION_MS,
  HAPPY_SOUND_FIRST_HZ,
  HAPPY_SOUND_SECOND_HZ,
  HAPPY_SOUND_VOLUME,
  LONELY_EXPRESSION_MIN,
  PET_REACTION_DURATION_MS,
  SLEEPY_EXPRESSION_MIN,
} from './constants'
import { now } from './state'
import type { PetEmotion, PetRobot, PetState } from './types'

export type PetReactionController = {
  onPet: () => void
  updateExpression: () => void
}

export function createPetReactionController(robot: PetRobot, state: PetState): PetReactionController {
  let reactionUntil = 0
  let currentEmotion: PetEmotion | undefined
  let reactionTimer: Timer | undefined
  let happyMotionRunning = false

  function selectExpression(): PetEmotion {
    if (now() < reactionUntil) {
      return 'HAPPY'
    }
    if (state.sleepiness >= SLEEPY_EXPRESSION_MIN) {
      return 'SLEEPY'
    }
    if (state.loneliness >= LONELY_EXPRESSION_MIN) {
      return 'SAD'
    }
    if (state.happiness >= HAPPY_EXPRESSION_MIN) {
      return 'HAPPY'
    }
    return 'NEUTRAL'
  }

  function applyExpression(): void {
    const nextEmotion = selectExpression()
    if (nextEmotion === currentEmotion) {
      return
    }
    currentEmotion = nextEmotion
    robot.setEmotion(nextEmotion)
    tracePet(`expression set to ${nextEmotion}`)
  }

  function scheduleReactionEnd(): void {
    Timer.clear(reactionTimer)
    reactionTimer = Timer.set(() => {
      reactionTimer = undefined
      applyExpression()
    }, PET_REACTION_DURATION_MS)
  }

  async function playHappySound(): Promise<void> {
    if (!robot.tone) {
      tracePet('happy sound skipped because tone is not available')
      return
    }
    try {
      await robot.tone(HAPPY_SOUND_FIRST_HZ, HAPPY_SOUND_DURATION_MS, HAPPY_SOUND_VOLUME)
      await robot.tone(HAPPY_SOUND_SECOND_HZ, HAPPY_SOUND_DURATION_MS, HAPPY_SOUND_VOLUME)
    } catch (error) {
      tracePet(`happy sound failed: ${String(error)}`)
    }
  }

  async function playHappyMotion(): Promise<void> {
    if (!robot.setPose || happyMotionRunning) {
      if (!robot.setPose) {
        tracePet('happy motion skipped because setPose is not available')
      }
      return
    }

    happyMotionRunning = true
    try {
      await robot.setPose({ rotation: { y: HAPPY_MOTION_YAW, p: 0, r: 0 } }, HAPPY_MOTION_STEP_SECONDS)
      await robot.setPose({ rotation: { y: -HAPPY_MOTION_YAW, p: 0, r: 0 } }, HAPPY_MOTION_STEP_SECONDS)
      await robot.setPose({ rotation: { y: 0, p: 0, r: 0 } }, HAPPY_MOTION_STEP_SECONDS)
    } catch (error) {
      tracePet(`happy motion failed: ${String(error)}`)
    } finally {
      happyMotionRunning = false
    }
  }

  function onPet(): void {
    reactionUntil = now() + PET_REACTION_DURATION_MS
    applyExpression()
    scheduleReactionEnd()
    void playHappySound()
    void playHappyMotion()
  }

  return {
    onPet,
    updateExpression: applyExpression,
  }
}
