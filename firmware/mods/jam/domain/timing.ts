import type { SongConfig, SongInfo, SongPosition } from './types'

export function getBeatDurationMs(song: SongInfo): number {
  const bpm = Math.max(1, song.bpm)
  const quarterNoteMs = 60000 / bpm
  return quarterNoteMs * (4 / Math.max(1, song.timeSignatureDenominator))
}

export function getBarDurationMs(song: SongInfo): number {
  return getBeatDurationMs(song) * Math.max(1, song.timeSignatureNumerator)
}

export function getTotalDurationMs(song: SongInfo): number {
  return getBarDurationMs(song) * Math.max(1, song.totalBars)
}

export function calculateSongPosition(config: SongConfig, startedAt: number, now: number): SongPosition {
  const elapsedMs = Math.max(0, now - startedAt)
  const beatDurationMs = getBeatDurationMs(config.song)
  const barDurationMs = getBarDurationMs(config.song)
  const totalDurationMs = getTotalDurationMs(config.song)
  const shouldLoop = config.settings.loop && totalDurationMs > 0
  const completed = !shouldLoop && elapsedMs >= totalDurationMs
  const songElapsedMs = shouldLoop ? elapsedMs % totalDurationMs : Math.min(elapsedMs, totalDurationMs)
  const barIndex = Math.floor(songElapsedMs / barDurationMs)
  const barProgressMs = songElapsedMs - barIndex * barDurationMs
  const beatIndex = Math.floor(barProgressMs / beatDurationMs)
  const absoluteBarIndex = Math.floor(elapsedMs / barDurationMs)
  const absoluteBeatIndex = Math.floor(elapsedMs / beatDurationMs)

  return {
    elapsedMs,
    songElapsedMs,
    currentBar: Math.min(barIndex + 1, Math.max(1, config.song.totalBars)),
    currentBeat: Math.min(beatIndex + 1, Math.max(1, config.song.timeSignatureNumerator)),
    absoluteBarIndex,
    absoluteBeatIndex,
    barProgressMs,
    beatProgressMs: barProgressMs - beatIndex * beatDurationMs,
    completed,
  }
}
