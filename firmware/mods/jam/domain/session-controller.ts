import { traceJam } from '../support/log'
import { JamLoopPlayer } from './loop-player'
import { calculateSongPosition } from './timing'
import type { JamRobot, SessionState, SongConfig } from './types'

const POSE_CUE_ENABLED = true
const POSE_OUTPUT_ENABLED = true
const POSE_MOVE_TIME_MS = 220

export class SessionController {
  readonly state: SessionState
  #song: SongConfig
  #robot: JamRobot
  #loopPlayer: JamLoopPlayer
  #lastPoseBeat = -1
  #poseBusyUntil = 0
  #pose = {
    rotation: {
      y: 0,
      p: 0,
      r: 0,
    },
  }

  constructor(song: SongConfig, robot: JamRobot) {
    this.#song = song
    this.#robot = robot
    this.#loopPlayer = new JamLoopPlayer()
    this.state = {
      active: false,
      startedAt: 0,
      currentBar: 1,
      currentBeat: 1,
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
    this.#lastPoseBeat = -1
    this.#poseBusyUntil = 0
    this.#robot.setPosePolling?.(false)
    if (POSE_OUTPUT_ENABLED) {
      const torque = this.#robot.setTorque?.(true)
      torque?.catch((error) => traceJam(`set torque failed: ${String(error)}`))
    }
    this.#loopPlayer.play()
    traceJam('session controller started')
  }

  stop(): void {
    this.state.active = false
    this.#loopPlayer.stop()
    this.#poseBusyUntil = 0
    this.applyPoseCue(0, Date.now())
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

    this.state.currentBar = position.currentBar
    this.state.currentBeat = position.currentBeat
    this.emitPoseCue(position.absoluteBeatIndex, position.elapsedMs)
  }

  private emitPoseCue(absoluteBeatIndex: number, elapsedMs: number): void {
    if (!POSE_CUE_ENABLED || absoluteBeatIndex === this.#lastPoseBeat) return
    this.#lastPoseBeat = absoluteBeatIndex
    const beatInBar = absoluteBeatIndex % Math.max(1, this.#song.song.timeSignatureNumerator)
    const yawCentirad = beatInBar === 0 ? -8 : beatInBar === 2 ? 8 : 0
    this.applyPoseCue(yawCentirad, this.state.startedAt + elapsedMs)
  }

  private applyPoseCue(yawCentirad: number, now: number): void {
    if (!POSE_OUTPUT_ENABLED || !this.#robot.setPose || now < this.#poseBusyUntil) return
    this.#pose.rotation.y = yawCentirad / 100
    this.#pose.rotation.p = 0
    this.#pose.rotation.r = 0
    this.#poseBusyUntil = now + POSE_MOVE_TIME_MS
    this.#robot.setPose(this.#pose, POSE_MOVE_TIME_MS / 1000).catch((error) => {
      traceJam(`pose failed: ${String(error)}`)
    })
  }
}
