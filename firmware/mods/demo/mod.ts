import Timer from 'timer'

type DemoRobot = {
  lookAt(position: [number, number, number]): void
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function onRobotCreated(robot: DemoRobot): void {
  trace('[demo] onRobotCreated\n')

  const lookAround = () => {
    const x = randomBetween(0.4, 1.0)
    const y = randomBetween(-0.5, 0.5)
    const z = randomBetween(-0.05, 0.25)
    trace(`looking at: [${x}, ${y}, ${z}]\n`)
    robot.lookAt([x, y, z])
  }

  lookAround()
  Timer.repeat(lookAround, 2000)
}
