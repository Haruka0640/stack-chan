import Timer from 'timer'
import { SessionController } from './domain/session-controller'
import { loadSong } from './domain/song-loader'
import type { JamRobot } from './domain/types'
import { traceJam } from './support/log'
import { formatSessionStatus } from './ui/session-display'

const DRAWER_BUTTON_KEY = 'toggleJamSession'
const SESSION_UPDATE_INTERVAL_MS = 16

function setDrawerState(robot: JamRobot, active: boolean): void {
  robot.application?.setDrawerButtonState?.(DRAWER_BUTTON_KEY, active)
}

function showStatus(robot: JamRobot, text: string): void {
  robot.showBalloon?.(text, {
    left: 12,
    right: 12,
    bottom: 10,
    minHeight: 58,
  })
}

export function onRobotCreated(robot: JamRobot): void {
  traceJam('MOD started')

  const loadedSong = loadSong()
  const session = new SessionController(loadedSong.config)
  let lastDisplayText = ''

  const updateDisplay = (force = false) => {
    const text = formatSessionStatus(session.song, session.state)
    if (!force && text === lastDisplayText) return
    lastDisplayText = text
    showStatus(robot, text)
  }

  updateDisplay(true)

  Timer.repeat(() => {
    const now = Date.now()
    const wasActive = session.state.active
    session.update(now)
    if (wasActive !== session.state.active) {
      setDrawerState(robot, session.state.active)
      updateDisplay(true)
    }
  }, SESSION_UPDATE_INTERVAL_MS)

  robot.application?.addDrawerButton?.({
    key: DRAWER_BUTTON_KEY,
    label: 'Session',
    kind: 'toggle',
    initialState: session.state.active,
    callback: () => {
      const active = session.toggle(Date.now())
      setDrawerState(robot, active)
      updateDisplay(true)
      traceJam(`session ${active ? 'started' : 'stopped'}`)
    },
  })
}
