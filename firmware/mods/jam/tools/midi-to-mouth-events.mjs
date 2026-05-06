#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const DEFAULT_TEMPO_US_PER_QUARTER = 500000

function usage() {
  console.log(`Usage: node mods/jam/tools/midi-to-mouth-events.mjs <file.mid> [options]

Options:
  --channel <0-15>       Use only one MIDI channel.
  --track <0-based>      Use only one track for note events.
  --amount <0-1>         Fixed mouth amount. Default uses note velocity.
  --min-duration <ms>    Minimum mouth event duration. Default: 70.
  --tail <ms>            Extra close tail after note-off. Default: 40.
  --json                 Output JSON instead of TypeScript snippet.
`)
}

function readUint32(buffer, offset) {
  return buffer.readUInt32BE(offset)
}

function readUint16(buffer, offset) {
  return buffer.readUInt16BE(offset)
}

function readVar(buffer, offset) {
  let value = 0
  let cursor = offset
  while (cursor < buffer.length) {
    const byte = buffer[cursor]
    cursor += 1
    value = (value << 7) | (byte & 0x7f)
    if ((byte & 0x80) === 0) break
  }
  return { value, offset: cursor }
}

function parseArgs(argv) {
  const options = {
    channel: -1,
    track: -1,
    amount: -1,
    minDurationMs: 70,
    tailMs: 40,
    json: false,
  }
  let file = ''
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--channel') {
      options.channel = Number(argv[++index])
    } else if (arg === '--track') {
      options.track = Number(argv[++index])
    } else if (arg === '--amount') {
      options.amount = Number(argv[++index])
    } else if (arg === '--min-duration') {
      options.minDurationMs = Number(argv[++index])
    } else if (arg === '--tail') {
      options.tailMs = Number(argv[++index])
    } else if (arg === '--json') {
      options.json = true
    } else if (!file) {
      file = arg
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  if (!file) {
    usage()
    process.exit(1)
  }
  return { file, options }
}

function parseMidi(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'MThd') throw new Error('not a MIDI file')
  const headerLength = readUint32(buffer, 4)
  const format = readUint16(buffer, 8)
  const trackCount = readUint16(buffer, 10)
  const division = readUint16(buffer, 12)
  if ((division & 0x8000) !== 0) throw new Error('SMPTE time division is not supported')

  let offset = 8 + headerLength
  const tracks = []
  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    if (buffer.toString('ascii', offset, offset + 4) !== 'MTrk') throw new Error(`missing MTrk at track ${trackIndex}`)
    const length = readUint32(buffer, offset + 4)
    const start = offset + 8
    tracks.push(buffer.subarray(start, start + length))
    offset = start + length
  }

  return { format, ticksPerQuarter: division, tracks }
}

function parseTrack(track, trackIndex, options, tempos, notes) {
  let tick = 0
  let offset = 0
  let runningStatus = 0
  const openNotes = new Map()

  while (offset < track.length) {
    const delta = readVar(track, offset)
    tick += delta.value
    offset = delta.offset

    let status = track[offset]
    if (status < 0x80) {
      if (runningStatus === 0) throw new Error(`running status missing at track ${trackIndex}`)
      status = runningStatus
    } else {
      offset += 1
      if (status < 0xf0) runningStatus = status
    }

    if (status === 0xff) {
      const metaType = track[offset]
      offset += 1
      const length = readVar(track, offset)
      offset = length.offset
      if (metaType === 0x51 && length.value === 3) {
        tempos.push({
          tick,
          usPerQuarter: (track[offset] << 16) | (track[offset + 1] << 8) | track[offset + 2],
        })
      }
      offset += length.value
      continue
    }

    if (status === 0xf0 || status === 0xf7) {
      const length = readVar(track, offset)
      offset = length.offset + length.value
      continue
    }

    const eventType = status & 0xf0
    const channel = status & 0x0f
    const dataLength = eventType === 0xc0 || eventType === 0xd0 ? 1 : 2
    const data1 = track[offset]
    const data2 = dataLength > 1 ? track[offset + 1] : 0
    offset += dataLength

    if (options.track >= 0 && options.track !== trackIndex) continue
    if (options.channel >= 0 && options.channel !== channel) continue

    const key = `${channel}:${data1}`
    if (eventType === 0x90 && data2 > 0) {
      if (!openNotes.has(key)) openNotes.set(key, [])
      openNotes.get(key).push({ tick, velocity: data2, track: trackIndex, channel, note: data1 })
    } else if (eventType === 0x80 || eventType === 0x90) {
      const stack = openNotes.get(key)
      const start = stack?.shift()
      if (!start) continue
      notes.push({ ...start, endTick: tick })
    }
  }
}

function buildTempoMap(tempos) {
  const sorted = tempos
    .concat([{ tick: 0, usPerQuarter: DEFAULT_TEMPO_US_PER_QUARTER }])
    .sort((a, b) => a.tick - b.tick)
  const map = []
  let lastTick = 0
  let lastMs = 0
  let lastTempo = DEFAULT_TEMPO_US_PER_QUARTER
  for (const tempo of sorted) {
    if (tempo.tick < lastTick) continue
    lastMs += ((tempo.tick - lastTick) * lastTempo) / 1000
    map.push({ tick: tempo.tick, ms: lastMs, usPerQuarter: tempo.usPerQuarter })
    lastTick = tempo.tick
    lastTempo = tempo.usPerQuarter
  }
  return map
}

function tickToMs(tick, tempoMap, ticksPerQuarter) {
  let tempo = tempoMap[0]
  for (let index = 1; index < tempoMap.length && tempoMap[index].tick <= tick; index += 1) {
    tempo = tempoMap[index]
  }
  return tempo.ms + ((tick - tempo.tick) * tempo.usPerQuarter) / ticksPerQuarter / 1000
}

function formatEvents(events, json) {
  if (json) return `${JSON.stringify(events, null, 2)}\n`
  const lines = events.map(
    (event) =>
      `    { startMs: ${event.startMs}, durationMs: ${event.durationMs}, amount: ${event.amount.toFixed(2)} },`,
  )
  return `mouthEvents: [\n${lines.join('\n')}\n],\n`
}

const { file, options } = parseArgs(process.argv.slice(2))
const midi = parseMidi(readFileSync(file))
const tempos = []
const notes = []
for (let index = 0; index < midi.tracks.length; index += 1) {
  parseTrack(midi.tracks[index], index, options, tempos, notes)
}
const tempoMap = buildTempoMap(tempos)
const events = notes
  .map((note) => {
    const startMs = Math.round(tickToMs(note.tick, tempoMap, midi.ticksPerQuarter))
    const endMs = Math.round(tickToMs(note.endTick, tempoMap, midi.ticksPerQuarter)) + options.tailMs
    const amount = options.amount >= 0 ? options.amount : Math.max(0.25, Math.min(1, note.velocity / 127))
    return {
      startMs,
      durationMs: Math.max(options.minDurationMs, endMs - startMs),
      amount,
    }
  })
  .sort((a, b) => a.startMs - b.startMs)

process.stdout.write(formatEvents(events, options.json))
