import { traceJam } from '../support/log'
import { arpIntervalToMs, getChordTone, getPattern, midiNoteToHz, selectPatternName, velocityToVolume } from './arp'
import { getCurrentChord, getCurrentEnergyRule, getCurrentSectionIndex } from './harmony'
import { calculateSongPosition, getBeatDurationMs } from './timing'
import { JamTonePlayer } from './tone-player'
import type { ArpPattern, EnergyRule, SessionState, SongConfig } from './types'

const DEBUG_TIMING = true
const DEBUG_LOG_LIMIT = 48
const FORCE_EIGHTH_NOTE_MODE = true

type ArpRuntime = {
  pattern: ArpPattern | null
  patternSequence: number
  lastPatternSlot: number
  lastStepSlot: number
  lastGridBeat: number
  lastEighthSlot: number
}

export class SessionController {
  readonly state: SessionState
  #arp: ArpRuntime
  #song: SongConfig
  #tonePlayer: JamTonePlayer
  #debugLogCount = 0

  constructor(song: SongConfig) {
    this.#song = song
    this.#tonePlayer = new JamTonePlayer()
    this.state = {
      active: false,
      startedAt: 0,
      currentBar: 1,
      currentBeat: 1,
      currentSectionIndex: 0,
      currentChordName: '',
      currentEnergy: 0,
      lastArpAt: 0,
    }
    this.#arp = {
      pattern: null,
      patternSequence: 0,
      lastPatternSlot: -1,
      lastStepSlot: -1,
      lastGridBeat: -1,
      lastEighthSlot: -1,
    }
  }

  get song(): SongConfig {
    return this.#song
  }

  start(now: number): void {
    this.state.active = true
    this.state.startedAt = now
    this.state.currentBar = 1
    this.state.currentBeat = 1
    this.state.currentSectionIndex = 0
    this.state.currentChordName = ''
    this.state.currentEnergy = 0
    this.state.lastArpAt = 0
    this.#arp.pattern = null
    this.#arp.patternSequence = 0
    this.#arp.lastPatternSlot = -1
    this.#arp.lastStepSlot = -1
    this.#arp.lastGridBeat = -1
    this.#arp.lastEighthSlot = -1
    this.#debugLogCount = 0
    traceJam('session controller started')
  }

  stop(): void {
    this.state.active = false
    this.#arp.pattern = null
    this.#tonePlayer.stop()
    traceJam('session controller stopped')
  }

  toggle(now: number): boolean {
    if (this.state.active) this.stop()
    else this.start(now)
    return this.state.active
  }

  update(now: number): void {
    if (!this.state.active) return

    const position = calculateSongPosition(this.#song, this.state.startedAt, now)
    if (position.completed) {
      this.stop()
      return
    }

    const sectionIndex = getCurrentSectionIndex(this.#song, position.currentBar)
    const section = this.#song.sections[sectionIndex] ?? this.#song.sections[0]
    const chord = getCurrentChord(this.#song, position.currentBar)

    this.state.currentBar = position.currentBar
    this.state.currentBeat = position.currentBeat
    this.state.currentSectionIndex = sectionIndex
    this.state.currentChordName = chord.name
    this.state.currentEnergy = section.energy

    const rule = getCurrentEnergyRule(this.#song, section.energy)
    const intervalMs = arpIntervalToMs(this.#song, rule.arpInterval)
    const patternSlot = Math.floor(position.elapsedMs / intervalMs)
    if (!this.#arp.pattern || patternSlot !== this.#arp.lastPatternSlot) {
      const patternName = selectPatternName(rule, this.#song.settings.randomSeed, this.#arp.patternSequence)
      this.#arp.pattern = getPattern(this.#song, patternName)
      this.#arp.patternSequence += 1
      this.#arp.lastPatternSlot = patternSlot
      this.#arp.lastStepSlot = -1
      this.state.lastArpAt = this.state.startedAt + patternSlot * intervalMs
    }

    this.debugGrid(position.absoluteBeatIndex, position.elapsedMs, rule, intervalMs)
    if (FORCE_EIGHTH_NOTE_MODE) {
      this.playEighthNote(now, position.elapsedMs)
      return
    }
    this.playCurrentStep(now, rule, position.elapsedMs)
  }

  private canDebugTiming(): boolean {
    if (!DEBUG_TIMING || this.#debugLogCount >= DEBUG_LOG_LIMIT) return false
    this.#debugLogCount += 1
    return true
  }

  private debugGrid(absoluteBeatIndex: number, elapsedMs: number, rule: EnergyRule, intervalMs: number): void {
    if (absoluteBeatIndex === this.#arp.lastGridBeat) return
    this.#arp.lastGridBeat = absoluteBeatIndex
    if (!this.canDebugTiming()) return
    trace(
      'jam:grid elapsed=',
      Math.round(elapsedMs),
      ' bar=',
      this.state.currentBar,
      ' beat=',
      this.state.currentBeat,
      ' absBeat=',
      absoluteBeatIndex,
      ' rule=',
      rule.arpInterval,
      ' interval=',
      Math.round(intervalMs),
      ' pattern=',
      this.#arp.pattern?.name ?? '',
      '\n',
    )
  }

  private playCurrentStep(now: number, rule: EnergyRule, elapsedMs: number): void {
    const pattern = this.#arp.pattern
    if (!pattern) return

    const intervalMs = arpIntervalToMs(this.#song, rule.arpInterval)
    const stepCount = Math.max(1, pattern.stepCount)
    const stepDurationMs = intervalMs / stepCount
    const patternElapsedMs = elapsedMs % intervalMs
    const stepSlot = Math.floor(patternElapsedMs / stepDurationMs)
    if (stepSlot === this.#arp.lastStepSlot) return
    const patternSlot = Math.floor(elapsedMs / intervalMs)
    const dueElapsedMs = patternSlot * intervalMs + stepSlot * stepDurationMs
    const dueAt = this.state.startedAt + dueElapsedMs
    const lateMs = now - dueAt

    const chord = getCurrentChord(this.#song, this.state.currentBar)
    const toneIndex = pattern.steps[stepSlot] ?? 0
    const note = getChordTone(chord, toneIndex)
    const hz = midiNoteToHz(note)
    const volume = velocityToVolume(this.#song.settings.defaultVelocity)
    const gateMs = Math.min(pattern.gateMs, stepDurationMs)
    if (this.canDebugTiming()) {
      trace(
        'jam:step slot=',
        patternSlot,
        ' step=',
        stepSlot,
        ' due=',
        Math.round(dueElapsedMs),
        ' now=',
        Math.round(elapsedMs),
        ' late=',
        Math.round(lateMs),
        ' note=',
        note,
        ' hz=',
        Math.round(hz),
        ' audio=',
        'on',
        ' gate=',
        Math.round(gateMs),
        ' vol=',
        Math.round(volume * 100),
        '\n',
      )
    }
    this.logToneResult(elapsedMs, this.#tonePlayer.play(now, hz, gateMs, volume))
    this.#arp.lastStepSlot = stepSlot
  }

  private playEighthNote(now: number, elapsedMs: number): void {
    const eighthDurationMs = getBeatDurationMs(this.#song.song) / 2
    const eighthSlot = Math.floor(elapsedMs / eighthDurationMs)
    if (eighthSlot === this.#arp.lastEighthSlot) return

    const dueElapsedMs = eighthSlot * eighthDurationMs
    const dueAt = this.state.startedAt + dueElapsedMs
    const lateMs = now - dueAt
    const chord = getCurrentChord(this.#song, this.state.currentBar)
    const note = chord.notes[0] ?? 60
    const hz = midiNoteToHz(note)
    const volume = velocityToVolume(this.#song.settings.defaultVelocity)
    const gateMs = Math.min(90, eighthDurationMs * 0.5)
    if (this.canDebugTiming()) {
      trace(
        'jam:eighth slot=',
        eighthSlot,
        ' due=',
        Math.round(dueElapsedMs),
        ' now=',
        Math.round(elapsedMs),
        ' late=',
        Math.round(lateMs),
        ' bar=',
        this.state.currentBar,
        ' beat=',
        this.state.currentBeat,
        ' note=',
        note,
        ' hz=',
        Math.round(hz),
        '\n',
      )
    }
    this.logToneResult(elapsedMs, this.#tonePlayer.play(now, hz, gateMs, volume))
    this.#arp.lastEighthSlot = eighthSlot
  }

  private logToneResult(elapsedMs: number, result: { played: boolean; busyUntil: number }): void {
    if (!this.canDebugTiming()) return
    trace(
      result.played ? 'jam:tone ok now=' : 'jam:tone skip now=',
      Math.round(elapsedMs),
      ' busyUntil=',
      Math.round(result.busyUntil - this.state.startedAt),
      '\n',
    )
  }
}
