import type { SongConfig } from './types'

export const DEFAULT_SONG: SongConfig = {
  song: {
    title: 'Loop Rap Session',
    bpm: 120,
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
    { name: 'intro', startBar: 1, endBar: 6, energy: 20 },
    { name: 'verse', startBar: 7, endBar: 13, energy: 40 },
    { name: 'build', startBar: 14, endBar: 18, energy: 65 },
    { name: 'climax', startBar: 19, endBar: 26, energy: 90 },
  ],
  chords: {
    Am: { name: 'Am', notes: [57, 60, 64, 69], noteCount: 4 },
    Dm: { name: 'Dm', notes: [50, 53, 57, 62], noteCount: 4 },
    F: { name: 'F', notes: [53, 57, 60, 65], noteCount: 4 },
    C: { name: 'C', notes: [60, 64, 67, 72], noteCount: 4 },
    G: { name: 'G', notes: [55, 59, 62, 67], noteCount: 4 },
  },
  progression: [
    { startBar: 1, lengthBars: 1, chordName: 'Am' },
    { startBar: 2, lengthBars: 1, chordName: 'Dm' },
    { startBar: 3, lengthBars: 1, chordName: 'Am' },
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
