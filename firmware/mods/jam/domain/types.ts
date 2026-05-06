export type SongInfo = {
  title: string
  bpm: number
  timeSignatureNumerator: number
  timeSignatureDenominator: number
  totalBars: number
}

export type SongSettings = {
  rootOctave: number
  defaultVelocity: number
  toneWaveform: string
  swing: number
  randomSeed: number
  loop: boolean
}

export type SongSection = {
  name: string
  startBar: number
  endBar: number
  energy: number
}

export type ChordDef = {
  name: string
  notes: number[]
  noteCount: number
}

export type ChordEvent = {
  startBar: number
  lengthBars: number
  chordName: string
}

export type ArpPattern = {
  name: string
  steps: number[]
  stepCount: number
  noteLengthMs: number
  gateMs: number
}

export type EnergyRule = {
  minEnergy: number
  maxEnergy: number
  arpInterval: string
  patterns: string[]
}

export type SongConfig = {
  song: SongInfo
  settings: SongSettings
  sections: SongSection[]
  chords: Record<string, ChordDef>
  progression: ChordEvent[]
  arpPatterns: Record<string, ArpPattern>
  energyRules: EnergyRule[]
}

export type SessionState = {
  active: boolean
  startedAt: number
  currentBar: number
  currentBeat: number
  currentSectionIndex: number
  currentChordName: string
  currentEnergy: number
  lastArpAt: number
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
}
