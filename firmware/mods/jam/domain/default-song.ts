import type { SongConfig } from './types'

export const DEFAULT_SONG: SongConfig = {
  song: {
    title: 'Loop Rap Session',
    bpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    totalBars: 8,
  },
  settings: {
    loop: true,
  },
  motionSections: [
    { name: 'quiet', startBar: 1, endBar: 4, pattern: 'vertical', pace: 'half' },
    { name: 'build', startBar: 5, endBar: 8, pattern: 'diagonal', pace: 'quarter' },
  ],
}
