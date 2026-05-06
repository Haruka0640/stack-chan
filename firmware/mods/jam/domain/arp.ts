import { getBarDurationMs, getBeatDurationMs } from './timing'
import type { ArpPattern, ChordDef, EnergyRule, SongConfig } from './types'

export function midiNoteToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

export function velocityToVolume(velocity: number): number {
  return Math.max(0, Math.min(1, velocity / 127))
}

export function arpIntervalToMs(config: SongConfig, interval: string): number {
  const beatMs = getBeatDurationMs(config.song)
  const barMs = getBarDurationMs(config.song)
  const match = interval.match(/^(\d+)(beat|beats|bar|bars)$/)
  if (!match) return barMs
  const amount = Number(match[1])
  const unit = match[2]
  return Math.max(1, amount) * (unit === 'beat' || unit === 'beats' ? beatMs : barMs)
}

export function selectPatternName(rule: EnergyRule, seed: number, sequence: number): string {
  if (rule.patterns.length === 0) return ''
  const value = (seed + sequence * 1103515245 + 12345) & 0x7fffffff
  return rule.patterns[value % rule.patterns.length]
}

export function getPattern(config: SongConfig, name: string): ArpPattern {
  return config.arpPatterns[name] ?? config.arpPatterns[Object.keys(config.arpPatterns)[0]]
}

export function getChordTone(chord: ChordDef, toneIndex: number): number {
  const noteCount = Math.max(1, chord.noteCount)
  const wrappedIndex = ((toneIndex % noteCount) + noteCount) % noteCount
  return chord.notes[wrappedIndex] ?? chord.notes[0]
}
