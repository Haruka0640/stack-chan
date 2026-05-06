import Timer from 'timer'
import { PET_MAIN_LOOP_INTERVAL_MS } from './domain/constants'
import { createPetEventDispatcher, pollInputs, processEventQueue } from './domain/events'
import { createPetReactionController } from './domain/reactions'
import { createInitialPetRuntimeState } from './domain/state'
import type { PetRobot } from './domain/types'
import { attachScreenGestureInput } from './input/gesture-input'
import { tracePet, tracePetRuntimeState } from './support/log'

function setSafeStartup(robot: PetRobot): void {
  robot.setEmotion('NEUTRAL')
  tracePet('emotion set to NEUTRAL')
}

export function onRobotCreated(robot: PetRobot): void {
  tracePet('MOD started')
  setSafeStartup(robot)

  const state = createInitialPetRuntimeState()
  const reactions = createPetReactionController(robot, state)
  const dispatchPetEvent = createPetEventDispatcher(state)

  tracePetRuntimeState('initial state', state)
  attachScreenGestureInput(robot, dispatchPetEvent)
  reactions.renderFace()

  Timer.repeat(() => {
    pollInputs(state)
    processEventQueue(state, reactions)
    reactions.updateReaction()
    reactions.renderFace()
    reactions.renderTouchRipple()
  }, PET_MAIN_LOOP_INTERVAL_MS)
}
