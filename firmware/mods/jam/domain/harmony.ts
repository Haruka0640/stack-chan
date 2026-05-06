import type { ChordDef, ChordEvent, EnergyRule, SongConfig, SongSection } from './types'

function getProgressionCycleBars(config: SongConfig): number {
  let cycleBars = 0
  for (const event of config.progression) {
    cycleBars = Math.max(cycleBars, event.startBar + event.lengthBars - 1)
  }
  return Math.max(1, cycleBars)
}

function getProgressionBar(config: SongConfig, currentBar: number): number {
  const cycleBars = getProgressionCycleBars(config)
  return ((Math.max(1, currentBar) - 1) % cycleBars) + 1
}

export function getCurrentSectionIndex(config: SongConfig, currentBar: number): number {
  const index = config.sections.findIndex((section) => currentBar >= section.startBar && currentBar <= section.endBar)
  return index >= 0 ? index : 0
}

export function getCurrentSection(config: SongConfig, currentBar: number): SongSection {
  return config.sections[getCurrentSectionIndex(config, currentBar)] ?? config.sections[0]
}

export function getCurrentChordEvent(config: SongConfig, currentBar: number): ChordEvent {
  const progressionBar = getProgressionBar(config, currentBar)
  return (
    config.progression.find(
      (event) => progressionBar >= event.startBar && progressionBar < event.startBar + event.lengthBars,
    ) ?? config.progression[0]
  )
}

export function getCurrentChord(config: SongConfig, currentBar: number): ChordDef {
  const event = getCurrentChordEvent(config, currentBar)
  return config.chords[event.chordName] ?? config.chords[Object.keys(config.chords)[0]]
}

export function getCurrentEnergyRule(config: SongConfig, energy: number): EnergyRule {
  return (
    config.energyRules.find((rule) => energy >= rule.minEnergy && energy <= rule.maxEnergy) ?? config.energyRules[0]
  )
}
