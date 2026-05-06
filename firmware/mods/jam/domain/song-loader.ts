import { traceJam } from '../support/log'
import { DEFAULT_SONG } from './default-song'
import type { SongConfig } from './types'

export const DEFAULT_SONG_PATH = '/session/song.yaml'

export type SongYamlSource = {
  path: string
  yaml: string
  fromFallback: boolean
}

export type LoadedSong = {
  config: SongConfig
  source: SongYamlSource
}

export function loadSong(path = DEFAULT_SONG_PATH): LoadedSong {
  traceJam(`external song file disabled for MVP: ${path}`)
  return {
    config: DEFAULT_SONG,
    source: {
      path,
      yaml: '',
      fromFallback: true,
    },
  }
}
