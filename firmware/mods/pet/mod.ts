import Timer from 'timer'
import { STATE_UPDATE_INTERVAL_MS } from './domain/constants'
import { createPetEventDispatcher } from './domain/events'
import { createPetReactionController } from './domain/reactions'
import { createInitialPetState, updatePetStateByTime } from './domain/state'
import type { PetRobot } from './domain/types'
import { attachScreenGestureInput } from './input/gesture-input'
import { tracePet, tracePetState } from './support/log'

function setSafeStartup(robot: PetRobot): void {
  robot.setEmotion('NEUTRAL')
  tracePet('emotion set to NEUTRAL')
}

export function onRobotCreated(robot: PetRobot): void {
  tracePet('MOD started')
  setSafeStartup(robot)

  const state = createInitialPetState()
  const reactions = createPetReactionController(robot, state)
  const dispatchPetEvent = createPetEventDispatcher(state, reactions)

  tracePetState('initial state', state)
  attachScreenGestureInput(robot, dispatchPetEvent)
  reactions.updateExpression()

  Timer.repeat(() => {
    updatePetStateByTime(state)
    reactions.updateExpression()
  }, STATE_UPDATE_INTERVAL_MS)
}
