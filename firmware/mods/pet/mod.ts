type PetRobot = {
  setEmotion: (emotion: 'NEUTRAL') => void
}

function tracePet(message: string): void {
  trace(`pet: ${message}\n`)
}

function setSafeStartup(robot: PetRobot): void {
  robot.setEmotion('NEUTRAL')
  tracePet('emotion set to NEUTRAL')
}

export function onRobotCreated(robot: PetRobot): void {
  tracePet('MOD started')
  setSafeStartup(robot)
}
