import { loadSong } from './domain/song-loader'
import type { JamRobot } from './domain/types'
import { traceJam } from './support/log'

const DRAWER_BUTTON_KEY = 'toggleJamSession'

type JamRuntime = {
  active: boolean
}

function setDrawerState(robot: JamRobot, active: boolean): void {
  robot.application?.setDrawerButtonState?.(DRAWER_BUTTON_KEY, active)
}

function showStartupStatus(robot: JamRobot, title: string, active: boolean): void {
  robot.showBalloon?.(`${title}\n${active ? 'Playing' : 'Stopped'}`, {
    left: 12,
    right: 12,
    bottom: 10,
    minHeight: 40,
  })
}

export function onRobotCreated(robot: JamRobot): void {
  traceJam('MOD started')

  const loadedSong = loadSong()
  const runtime: JamRuntime = {
    active: false,
  }

  showStartupStatus(robot, loadedSong.config.song.title, runtime.active)

  robot.application?.addDrawerButton?.({
    key: DRAWER_BUTTON_KEY,
    label: 'Session',
    kind: 'toggle',
    initialState: runtime.active,
    callback: () => {
      runtime.active = !runtime.active
      setDrawerState(robot, runtime.active)
      showStartupStatus(robot, loadedSong.config.song.title, runtime.active)
      traceJam(`session ${runtime.active ? 'started' : 'stopped'}`)
    },
  })
}
