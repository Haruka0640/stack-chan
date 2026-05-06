import type { SessionState, SongConfig } from '../domain/types'

export function formatSessionStatus(song: SongConfig, state: SessionState): string {
  if (!state.active) {
    return `${song.song.title}\nStopped`
  }

  return `${song.song.title}\nPlaying`
}
