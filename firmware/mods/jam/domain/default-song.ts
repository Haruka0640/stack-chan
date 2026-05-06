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
    loop: true,
  },
  motionSections: [
    { name: 'quiet', startBar: 1, endBar: 8, pattern: 'vertical', pace: 'half' },
    { name: 'build', startBar: 9, endBar: 16, pattern: 'diagonal', pace: 'quarter' },
    { name: 'outro', startBar: 17, endBar: 24, pattern: 'turn', pace: 'half' },
  ],
}
