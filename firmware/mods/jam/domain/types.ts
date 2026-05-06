export type SongInfo = {
  title: string
  bpm: number
  timeSignatureNumerator: number
  timeSignatureDenominator: number
  totalBars: number
}

export type SongSettings = {
  loop: boolean
}

export type SongConfig = {
  song: SongInfo
  settings: SongSettings
}

export type SessionState = {
  active: boolean
  startedAt: number
  currentBar: number
  currentBeat: number
}

export type SongPosition = {
  elapsedMs: number
  songElapsedMs: number
  currentBar: number
  currentBeat: number
  absoluteBarIndex: number
  absoluteBeatIndex: number
  barProgressMs: number
  beatProgressMs: number
  completed: boolean
}

export type DrawerButtonRegistration = {
  key: string
  label: string
  callback: (robot: JamRobot) => unknown
  kind?: 'action' | 'toggle'
  initialState?: boolean
}

export type JamApplication = {
  addDrawerButton?: (button: DrawerButtonRegistration) => void
  removeDrawerButton?: (key: string) => void
  setDrawerButtonState?: (key: string, active: boolean) => void
  closeDrawer?: () => void
}

export type JamRobot = {
  application?: JamApplication
  showBalloon?: (
    text: string,
    option?: {
      left?: number
      right?: number
      top?: number
      bottom?: number
      width?: number
      height?: number
      minHeight?: number
    },
  ) => void
  hideBalloon?: () => void
  tone?: (hz: number, duration: number, volume?: number) => Promise<void>
  setPosePolling?: (enabled: boolean) => void
  setTorque?: (torque: boolean) => Promise<void>
  setPose?: (
    pose: {
      rotation: {
        y: number
        p: number
        r: number
      }
    },
    time?: number,
  ) => Promise<void>
}
