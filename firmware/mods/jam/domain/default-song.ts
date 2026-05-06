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
}
