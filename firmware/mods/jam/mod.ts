import Timer from 'timer'
import { SessionController } from './domain/session-controller'
import { loadSong } from './domain/song-loader'
import { getBeatDurationMs } from './domain/timing'
import type { JamRobot } from './domain/types'
import { traceJam } from './support/log'
import { formatSessionStatus } from './ui/session-display'

const DRAWER_BUTTON_KEY = 'toggleJamSession'
const SESSION_UPDATE_INTERVAL_MS = 16
const COUNT_IN_LABELS = ['1', '2', '3', '4'] as const

function setDrawerState(robot: JamRobot, active: boolean): void {
  robot.application?.setDrawerButtonState?.(DRAWER_BUTTON_KEY, active)
}

function closeDrawer(robot: JamRobot): void {
  robot.application?.closeDrawer?.()
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
  const session = new SessionController(loadedSong.config, robot)
  let lastDisplayText = ''
  let countInTimer: ReturnType<typeof Timer.set> | undefined
  let countInIndex = 0

  const updateDisplay = (force = false) => {
    const text = formatSessionStatus(session.song, session.state)
    if (!force && text === lastDisplayText) return
    lastDisplayText = text
    showStatus(robot, text)
  }

  updateDisplay(true)

  const clearCountIn = () => {
    if (countInTimer !== undefined) {
      Timer.clear(countInTimer)
      countInTimer = undefined
    }
    countInIndex = 0
  }

  const startSession = () => {
    clearCountIn()
    session.start(Date.now())
    setDrawerState(robot, true)
    updateDisplay(true)
    traceJam('session started')
  }

  const stepCountIn = () => {
    countInTimer = undefined
    if (countInIndex >= COUNT_IN_LABELS.length) {
      startSession()
      return
    }

    const label = COUNT_IN_LABELS[countInIndex]
    countInIndex += 1
    showStatus(robot, `${session.song.song.title}\n${label}`)
    countInTimer = Timer.set(stepCountIn, Math.round(getBeatDurationMs(session.song.song)))
  }

  const startCountIn = () => {
    if (session.state.active || countInTimer !== undefined) return
    countInIndex = 0
    setDrawerState(robot, true)
    closeDrawer(robot)
    traceJam('count-in started')
    stepCountIn()
  }

  const stopSession = () => {
    const wasCounting = countInTimer !== undefined
    clearCountIn()
    if (session.state.active) {
      session.stop()
      traceJam('session stopped')
    } else if (wasCounting) {
      traceJam('count-in stopped')
    }
    setDrawerState(robot, false)
    updateDisplay(true)
  }

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
    initialState: session.state.active || countInTimer !== undefined,
    callback: () => {
      if (session.state.active || countInTimer !== undefined) {
        stopSession()
        return
      }
      startCountIn()
    },
  })
}
