import { traceJam } from '../support/log'
import { JamLoopPlayer } from './loop-player'
import { calculateSongPosition } from './timing'
import type { JamRobot, MotionPattern, MotionSection, SessionState, SongConfig, SongPosition } from './types'

const POSE_CUE_ENABLED = true
const POSE_OUTPUT_ENABLED = true
const POSE_MOVE_TIME_MS = 220
const POSE_DIAGNOSTIC_LOG_LIMIT = 32
const VERTICAL_PITCH_CENTIRAD = 15
const DIAGONAL_YAW_CENTIRAD = 12
const DIAGONAL_PITCH_CENTIRAD = 12
const TURN_YAW_CENTIRAD = 15
const MAX_YAW_CENTIRAD = 12
const MAX_PITCH_CENTIRAD = 10
const DEFAULT_MOTION: MotionSection = {
  name: 'default',
  startBar: 1,
  endBar: 1,
  pattern: 'vertical',
  pace: 'half',
}

type PoseCue = {
  yawCentirad: number
  pitchCentirad: number
  rollCentirad: number
}

export class SessionController {
  readonly state: SessionState
  #song: SongConfig
  #robot: JamRobot
  #loopPlayer: JamLoopPlayer
  #lastPoseSlot = -1
  #poseBusyUntil = 0
  #poseDiagnosticLogCount = 0
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
    this.#lastPoseSlot = -1
    this.#poseBusyUntil = 0
    this.#poseDiagnosticLogCount = 0
    this.#robot.setPosePolling?.(false)
    if (POSE_OUTPUT_ENABLED) {
      const torque = this.#robot.setTorque?.(true)
      torque?.catch((error) => traceJam(`set torque failed: ${String(error)}`))
    }
    this.#loopPlayer.play()
    traceJam('session controller started')
    this.tracePoseDiagnostic(
      `pose config output=${POSE_OUTPUT_ENABLED} hasSetPose=${this.#robot.setPose != null} sections=${this.#song.motionSections.length}`,
    )
  }

  stop(): void {
    this.state.active = false
    this.#loopPlayer.stop()
    this.#poseBusyUntil = 0
    this.applyPoseCue({ yawCentirad: 0, pitchCentirad: 0, rollCentirad: 0 }, Date.now())
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
    this.emitPoseCue(position)
  }

  private emitPoseCue(position: SongPosition): void {
    if (!POSE_CUE_ENABLED) return
    const section = this.getMotionSection(position.currentBar)
    const beatsPerCue = section.pace === 'half' ? 2 : 1
    const poseSlot = Math.floor(position.absoluteBeatIndex / beatsPerCue)
    if (poseSlot === this.#lastPoseSlot) return
    this.#lastPoseSlot = poseSlot

    const cue = this.getPoseCue(section.pattern, poseSlot)
    this.tracePoseDiagnostic(
      `pose cue section=${section.name} pattern=${section.pattern} pace=${section.pace} bar=${position.currentBar} beat=${position.currentBeat} absBeat=${position.absoluteBeatIndex} slot=${poseSlot} yaw=${cue.yawCentirad} pitch=${cue.pitchCentirad} roll=${cue.rollCentirad}`,
    )
    this.applyPoseCue(cue, this.state.startedAt + position.elapsedMs)
  }

  private getMotionSection(currentBar: number): MotionSection {
    return (
      this.#song.motionSections.find((section) => currentBar >= section.startBar && currentBar <= section.endBar) ??
      this.#song.motionSections[0] ??
      DEFAULT_MOTION
    )
  }

  private getPoseCue(pattern: MotionPattern, poseSlot: number): PoseCue {
    switch (pattern) {
      case 'vertical':
        return {
          yawCentirad: 0,
          pitchCentirad: poseSlot % 2 === 0 ? -VERTICAL_PITCH_CENTIRAD : VERTICAL_PITCH_CENTIRAD,
          rollCentirad: 0,
        }
      case 'diagonal': {
        const sequence = poseSlot % 4
        return {
          yawCentirad: sequence === 0 || sequence === 3 ? -DIAGONAL_YAW_CENTIRAD : DIAGONAL_YAW_CENTIRAD,
          pitchCentirad: sequence < 2 ? -DIAGONAL_PITCH_CENTIRAD : DIAGONAL_PITCH_CENTIRAD,
          rollCentirad: 0,
        }
      }
      case 'turn':
        return {
          yawCentirad: poseSlot % 2 === 0 ? -TURN_YAW_CENTIRAD : TURN_YAW_CENTIRAD,
          pitchCentirad: 0,
          rollCentirad: 0,
        }
    }
  }

  private applyPoseCue(cue: PoseCue, now: number): void {
    const yawCentirad = clampCentirad(cue.yawCentirad, MAX_YAW_CENTIRAD)
    const pitchCentirad = clampCentirad(cue.pitchCentirad, MAX_PITCH_CENTIRAD)
    if (!POSE_OUTPUT_ENABLED || !this.#robot.setPose) {
      this.tracePoseDiagnostic(
        `pose skipped output=${POSE_OUTPUT_ENABLED} hasSetPose=${this.#robot.setPose != null} yaw=${yawCentirad} pitch=${pitchCentirad}`,
      )
      return
    }
    if (now < this.#poseBusyUntil) {
      this.tracePoseDiagnostic(`pose busy now=${now} busyUntil=${this.#poseBusyUntil}`)
      return
    }
    if (yawCentirad !== cue.yawCentirad || pitchCentirad !== cue.pitchCentirad) {
      this.tracePoseDiagnostic(
        `pose clamped yaw=${cue.yawCentirad}->${yawCentirad} pitch=${cue.pitchCentirad}->${pitchCentirad}`,
      )
    }
    this.#pose.rotation.y = yawCentirad / 100
    this.#pose.rotation.p = pitchCentirad / 100
    this.#pose.rotation.r = cue.rollCentirad / 100
    this.#poseBusyUntil = now + POSE_MOVE_TIME_MS
    this.tracePoseDiagnostic(
      `pose apply y=${this.#pose.rotation.y} p=${this.#pose.rotation.p} r=${this.#pose.rotation.r} moveMs=${POSE_MOVE_TIME_MS}`,
    )
    this.#robot.setPose(this.#pose, POSE_MOVE_TIME_MS / 1000).catch((error) => {
      traceJam(`pose failed: ${String(error)}`)
    })
  }

  private tracePoseDiagnostic(message: string): void {
    if (this.#poseDiagnosticLogCount >= POSE_DIAGNOSTIC_LOG_LIMIT) return
    this.#poseDiagnosticLogCount += 1
    traceJam(message)
  }
}

function clampCentirad(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value))
}
