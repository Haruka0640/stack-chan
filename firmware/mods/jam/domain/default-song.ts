import type { SongConfig } from './types'

export const DEFAULT_SONG_YAML = `song:
  title: "Loop Rap Session"
  bpm: 90
  time_signature: "4/4"
  total_bars: 24

settings:
  root_octave: 4
  default_velocity: 80
  tone_waveform: "square"
  swing: 0.0
  random_seed: 0
  loop: true

sections:
  - name: "intro"
    start_bar: 1
    end_bar: 4
    energy: 20
  - name: "verse"
    start_bar: 5
    end_bar: 12
    energy: 40
  - name: "build"
    start_bar: 13
    end_bar: 16
    energy: 65
  - name: "climax"
    start_bar: 17
    end_bar: 24
    energy: 90

chords:
  Am:
    notes: [57, 60, 64, 69]
  F:
    notes: [53, 57, 60, 65]
  C:
    notes: [60, 64, 67, 72]
  G:
    notes: [55, 59, 62, 67]

progression:
  - start_bar: 1
    length_bars: 1
    chord: "Am"
  - start_bar: 2
    length_bars: 1
    chord: "F"
  - start_bar: 3
    length_bars: 1
    chord: "C"
  - start_bar: 4
    length_bars: 1
    chord: "G"

arp_patterns:
  sparse:
    steps: [0, 2]
    note_length_ms: 180
    gate_ms: 120
  basic:
    steps: [0, 1, 2, 1]
    note_length_ms: 160
    gate_ms: 100
  up:
    steps: [0, 1, 2, 3]
    note_length_ms: 120
    gate_ms: 80
  excited:
    steps: [0, 1, 2, 3, 2, 1, 2, 3]
    note_length_ms: 90
    gate_ms: 60

energy_rules:
  - min_energy: 0
    max_energy: 29
    arp_interval: "2bars"
    patterns: ["sparse"]
  - min_energy: 30
    max_energy: 59
    arp_interval: "1bar"
    patterns: ["sparse", "basic"]
  - min_energy: 60
    max_energy: 79
    arp_interval: "2beats"
    patterns: ["basic", "up"]
  - min_energy: 80
    max_energy: 100
    arp_interval: "1beat"
    patterns: ["up", "excited"]
`

export const DEFAULT_SONG: SongConfig = {
  song: {
    title: 'Loop Rap Session',
    bpm: 90,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    totalBars: 24,
  },
  settings: {
    rootOctave: 4,
    defaultVelocity: 80,
    toneWaveform: 'square',
    swing: 0,
    randomSeed: 0,
    loop: true,
  },
  sections: [
    { name: 'intro', startBar: 1, endBar: 4, energy: 20 },
    { name: 'verse', startBar: 5, endBar: 12, energy: 40 },
    { name: 'build', startBar: 13, endBar: 16, energy: 65 },
    { name: 'climax', startBar: 17, endBar: 24, energy: 90 },
  ],
  chords: {
    Am: { name: 'Am', notes: [57, 60, 64, 69], noteCount: 4 },
    F: { name: 'F', notes: [53, 57, 60, 65], noteCount: 4 },
    C: { name: 'C', notes: [60, 64, 67, 72], noteCount: 4 },
    G: { name: 'G', notes: [55, 59, 62, 67], noteCount: 4 },
  },
  progression: [
    { startBar: 1, lengthBars: 1, chordName: 'Am' },
    { startBar: 2, lengthBars: 1, chordName: 'F' },
    { startBar: 3, lengthBars: 1, chordName: 'C' },
    { startBar: 4, lengthBars: 1, chordName: 'G' },
  ],
  arpPatterns: {
    sparse: { name: 'sparse', steps: [0, 2], stepCount: 2, noteLengthMs: 180, gateMs: 120 },
    basic: { name: 'basic', steps: [0, 1, 2, 1], stepCount: 4, noteLengthMs: 160, gateMs: 100 },
    up: { name: 'up', steps: [0, 1, 2, 3], stepCount: 4, noteLengthMs: 120, gateMs: 80 },
    excited: {
      name: 'excited',
      steps: [0, 1, 2, 3, 2, 1, 2, 3],
      stepCount: 8,
      noteLengthMs: 90,
      gateMs: 60,
    },
  },
  energyRules: [
    { minEnergy: 0, maxEnergy: 29, arpInterval: '2bars', patterns: ['sparse'] },
    { minEnergy: 30, maxEnergy: 59, arpInterval: '1bar', patterns: ['sparse', 'basic'] },
    { minEnergy: 60, maxEnergy: 79, arpInterval: '2beats', patterns: ['basic', 'up'] },
    { minEnergy: 80, maxEnergy: 100, arpInterval: '1beat', patterns: ['up', 'excited'] },
  ],
}
