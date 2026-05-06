import { File } from 'file'
import { traceJam } from '../support/log'
import { DEFAULT_SONG, DEFAULT_SONG_YAML } from './default-song'
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

type ParsedYaml = Record<string, unknown>

type ParsedLine = {
  indent: number
  text: string
}

type ParseResult = {
  value: unknown
  index: number
}

function stripComment(line: string): string {
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') quoted = !quoted
    if (!quoted && ch === '#') return line.slice(0, i)
  }
  return line
}

function countIndent(line: string): number {
  let indent = 0
  while (indent < line.length && line[indent] === ' ') indent += 1
  return indent
}

function prepareLines(yaml: string): ParsedLine[] {
  const lines: ParsedLine[] = []
  for (const rawLine of yaml.split('\n')) {
    const withoutComment = stripComment(rawLine).trimEnd()
    if (withoutComment.trim().length === 0) continue
    lines.push({
      indent: countIndent(withoutComment),
      text: withoutComment.trim(),
    })
  }
  return lines
}

function splitKeyValue(text: string): [string, string] {
  const colon = text.indexOf(':')
  if (colon < 0) return [text.trim(), '']
  return [text.slice(0, colon).trim(), text.slice(colon + 1).trim()]
}

function parseScalar(text: string): unknown {
  const value = text.trim()
  if (value.length === 0) return ''
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
  if (value === 'true') return true
  if (value === 'false') return false
  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim()
    if (body.length === 0) return []
    return body.split(',').map((item) => parseScalar(item.trim()))
  }
  const numberValue = Number(value)
  if (!Number.isNaN(numberValue)) return numberValue
  return value
}

function parseBlock(lines: ParsedLine[], index: number, indent: number): ParseResult {
  const line = lines[index]
  if (!line || line.indent < indent) {
    return { value: {}, index }
  }
  if (line.indent === indent && line.text.startsWith('- ')) {
    return parseList(lines, index, indent)
  }
  return parseMap(lines, index, indent)
}

function parseMap(lines: ParsedLine[], index: number, indent: number): ParseResult {
  const map: Record<string, unknown> = {}
  let cursor = index
  while (cursor < lines.length) {
    const line = lines[cursor]
    if (!line || line.indent < indent) break
    if (line.indent > indent) break
    if (line.text.startsWith('- ')) break

    const [key, rawValue] = splitKeyValue(line.text)
    if (rawValue.length > 0) {
      map[key] = parseScalar(rawValue)
      cursor += 1
      continue
    }

    const child = parseBlock(lines, cursor + 1, indent + 2)
    map[key] = child.value
    cursor = child.index
  }
  return { value: map, index: cursor }
}

function parseList(lines: ParsedLine[], index: number, indent: number): ParseResult {
  const list: unknown[] = []
  let cursor = index
  while (cursor < lines.length) {
    const line = lines[cursor]
    if (!line || line.indent < indent) break
    if (line.indent > indent) break
    if (!line.text.startsWith('- ')) break

    const itemText = line.text.slice(2).trim()
    if (itemText.length === 0) {
      const child = parseBlock(lines, cursor + 1, indent + 2)
      list.push(child.value)
      cursor = child.index
      continue
    }

    const [key, rawValue] = splitKeyValue(itemText)
    if (itemText.includes(':')) {
      const item: Record<string, unknown> = {
        [key]: rawValue.length > 0 ? parseScalar(rawValue) : {},
      }
      const child = parseMap(lines, cursor + 1, indent + 2)
      Object.assign(item, child.value)
      list.push(item)
      cursor = child.index
      continue
    }

    list.push(parseScalar(itemText))
    cursor += 1
  }
  return { value: list, index: cursor }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumberList(value: unknown): number[] {
  return asList(value).filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function asStringList(value: unknown): string[] {
  return asList(value).filter((item): item is string => typeof item === 'string')
}

function parseTimeSignature(value: unknown): { numerator: number; denominator: number } {
  const text = asString(
    value,
    `${DEFAULT_SONG.song.timeSignatureNumerator}/${DEFAULT_SONG.song.timeSignatureDenominator}`,
  )
  const slash = text.indexOf('/')
  if (slash < 0) {
    return {
      numerator: DEFAULT_SONG.song.timeSignatureNumerator,
      denominator: DEFAULT_SONG.song.timeSignatureDenominator,
    }
  }
  return {
    numerator: asNumber(Number(text.slice(0, slash)), DEFAULT_SONG.song.timeSignatureNumerator),
    denominator: asNumber(Number(text.slice(slash + 1)), DEFAULT_SONG.song.timeSignatureDenominator),
  }
}

export function parseYaml(yaml: string): ParsedYaml {
  const lines = prepareLines(yaml)
  const result = parseBlock(lines, 0, 0)
  return asRecord(result.value)
}

export function normalizeSongConfig(parsed: ParsedYaml): SongConfig {
  const song = asRecord(parsed.song)
  const settings = asRecord(parsed.settings)
  const timeSignature = parseTimeSignature(song.time_signature)
  const sections = asList(parsed.sections).map((sectionValue) => {
    const section = asRecord(sectionValue)
    return {
      name: asString(section.name, 'section'),
      startBar: asNumber(section.start_bar, 1),
      endBar: asNumber(section.end_bar, 1),
      energy: asNumber(section.energy, 0),
    }
  })

  const chords: SongConfig['chords'] = {}
  for (const name in asRecord(parsed.chords)) {
    const chord = asRecord(asRecord(parsed.chords)[name])
    const notes = asNumberList(chord.notes)
    chords[name] = {
      name,
      notes,
      noteCount: notes.length,
    }
  }

  const arpPatterns: SongConfig['arpPatterns'] = {}
  for (const name in asRecord(parsed.arp_patterns)) {
    const pattern = asRecord(asRecord(parsed.arp_patterns)[name])
    const steps = asNumberList(pattern.steps)
    arpPatterns[name] = {
      name,
      steps,
      stepCount: steps.length,
      noteLengthMs: asNumber(pattern.note_length_ms, 120),
      gateMs: asNumber(pattern.gate_ms, 80),
    }
  }

  const progression = asList(parsed.progression).map((eventValue) => {
    const event = asRecord(eventValue)
    return {
      startBar: asNumber(event.start_bar, 1),
      lengthBars: asNumber(event.length_bars, 1),
      chordName: asString(event.chord, ''),
    }
  })
  const energyRules = asList(parsed.energy_rules).map((ruleValue) => {
    const rule = asRecord(ruleValue)
    return {
      minEnergy: asNumber(rule.min_energy, 0),
      maxEnergy: asNumber(rule.max_energy, 100),
      arpInterval: asString(rule.arp_interval, '1bar'),
      patterns: asStringList(rule.patterns),
    }
  })
  const config: SongConfig = {
    song: {
      title: asString(song.title, DEFAULT_SONG.song.title),
      bpm: asNumber(song.bpm, DEFAULT_SONG.song.bpm),
      timeSignatureNumerator: timeSignature.numerator,
      timeSignatureDenominator: timeSignature.denominator,
      totalBars: asNumber(song.total_bars, DEFAULT_SONG.song.totalBars),
    },
    settings: {
      rootOctave: asNumber(settings.root_octave, DEFAULT_SONG.settings.rootOctave),
      defaultVelocity: asNumber(settings.default_velocity, DEFAULT_SONG.settings.defaultVelocity),
      toneWaveform: asString(settings.tone_waveform, DEFAULT_SONG.settings.toneWaveform),
      swing: asNumber(settings.swing, DEFAULT_SONG.settings.swing),
      randomSeed: asNumber(settings.random_seed, DEFAULT_SONG.settings.randomSeed),
      loop: asBoolean(settings.loop, DEFAULT_SONG.settings.loop),
    },
    sections: sections.length > 0 ? sections : DEFAULT_SONG.sections,
    chords: Object.keys(chords).length > 0 ? chords : DEFAULT_SONG.chords,
    progression: progression.length > 0 ? progression : DEFAULT_SONG.progression,
    arpPatterns: Object.keys(arpPatterns).length > 0 ? arpPatterns : DEFAULT_SONG.arpPatterns,
    energyRules: energyRules.length > 0 ? energyRules : DEFAULT_SONG.energyRules,
  }
  validateSongConfig(config)
  return config
}

function validateSongConfig(config: SongConfig): void {
  for (const event of config.progression) {
    if (!config.chords[event.chordName]) {
      traceJam(`unknown chord in progression: ${event.chordName}`)
    }
  }
  for (const name in config.chords) {
    if (config.chords[name].noteCount === 0) {
      traceJam(`chord has no notes: ${name}`)
    }
  }
  for (const rule of config.energyRules) {
    for (const patternName of rule.patterns) {
      if (!config.arpPatterns[patternName]) {
        traceJam(`unknown arp pattern in energy rule: ${patternName}`)
      }
    }
  }
}

export function parseSongYaml(yaml: string): SongConfig {
  return normalizeSongConfig(parseYaml(yaml))
}

function readTextFile(path: string): string {
  const file = new File(path)
  try {
    const data = file.read(ArrayBuffer, file.length)
    return String.fromArrayBuffer(data)
  } finally {
    file.close()
  }
}

export function loadSongYaml(path = DEFAULT_SONG_PATH): SongYamlSource {
  try {
    const yaml = readTextFile(path)
    traceJam(`loaded song yaml from ${path}`)
    return {
      path,
      yaml,
      fromFallback: false,
    }
  } catch (error) {
    traceJam(`failed to load ${path}; using default song: ${String(error)}`)
    return {
      path,
      yaml: DEFAULT_SONG_YAML,
      fromFallback: true,
    }
  }
}

export function loadSong(path = DEFAULT_SONG_PATH): LoadedSong {
  const source = loadSongYaml(path)
  let config = DEFAULT_SONG
  try {
    config = parseSongYaml(source.yaml)
  } catch (error) {
    traceJam(`failed to parse song yaml; using default song: ${String(error)}`)
  }
  return {
    config,
    source,
  }
}
