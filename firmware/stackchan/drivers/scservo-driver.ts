import SCServo from 'scservo'
import type { Maybe, Rotation } from 'stackchan-util'
import type Timer from 'timer'

type SCServoDriverProps = {
  panId: number
  tiltId: number
  enablePan?: boolean
  enableTilt?: boolean
  traceMotion?: boolean
  waitForAck?: boolean
}

const MOTION_DIAGNOSTIC_LOG_LIMIT = 48

export class SCServoDriver {
  _pan: SCServo
  _tilt: SCServo
  _handler: ReturnType<typeof Timer.repeat>
  #enablePan: boolean
  #enableTilt: boolean
  #traceMotion: boolean
  #waitForAck: boolean
  #motionDiagnosticLogCount = 0

  constructor(param: SCServoDriverProps) {
    this._pan = new SCServo({ id: param.panId })
    this._tilt = new SCServo({ id: param.tiltId })
    this.#enablePan = param.enablePan ?? true
    this.#enableTilt = param.enableTilt ?? true
    this.#traceMotion = param.traceMotion ?? true
    this.#waitForAck = param.waitForAck ?? true
    this.traceMotionDiagnostic(
      `scservo config panId=${param.panId} tiltId=${param.tiltId} enablePan=${this.#enablePan} enableTilt=${this.#enableTilt} waitForAck=${this.#waitForAck} traceMotion=${this.#traceMotion}`,
    )
  }

  async setTorque(torque: boolean): Promise<void> {
    this.traceMotionDiagnostic(
      `scservo torque=${torque} enablePan=${this.#enablePan} enableTilt=${this.#enableTilt} waitForAck=${this.#waitForAck}`,
    )
    if (!this.#waitForAck) {
      if (this.#enablePan) this._pan.setTorqueNoWait(torque)
      if (this.#enableTilt) this._tilt.setTorqueNoWait(torque)
      return
    }
    const commands: Promise<unknown>[] = []
    if (this.#enablePan) commands.push(this._pan.setTorque(torque))
    if (this.#enableTilt) commands.push(this._tilt.setTorque(torque))
    await Promise.all(commands)
  }

  async applyRotation(ori: Rotation, time = 0.5): Promise<void> {
    const panAngle = 100 - (ori.y * 180) / Math.PI
    const tiltAngle = 100 - Math.min(Math.max((ori.p * 180) / Math.PI, -25), 10)
    if (this.#traceMotion) {
      trace(`applying (${ori.y}, ${ori.p}) => (${panAngle}, ${tiltAngle})\n`)
    }
    this.traceMotionDiagnostic(
      `scservo apply y=${ori.y} p=${ori.p} timeMs=${time * 1000} panAngle=${panAngle} tiltAngle=${tiltAngle} enablePan=${this.#enablePan} enableTilt=${this.#enableTilt} waitForAck=${this.#waitForAck}`,
    )
    if (!this.#waitForAck) {
      if (time === 0) {
        if (this.#enablePan) this._pan.setAngleNoWait(panAngle)
        if (this.#enableTilt) this._tilt.setAngleNoWait(tiltAngle)
      } else {
        if (this.#enablePan) this._pan.setAngleInTimeNoWait(panAngle, time * 1000)
        if (this.#enableTilt) this._tilt.setAngleInTimeNoWait(tiltAngle, time * 1000)
      }
      return
    }
    const commands: Promise<unknown>[] = []
    if (time === 0) {
      if (this.#enablePan) commands.push(this._pan.setAngle(panAngle))
      if (this.#enableTilt) commands.push(this._tilt.setAngle(tiltAngle))
    } else {
      if (this.#enablePan) commands.push(this._pan.setAngleInTime(panAngle, time * 1000))
      if (this.#enableTilt) commands.push(this._tilt.setAngleInTime(tiltAngle, time * 1000))
    }
    await Promise.all(commands)
  }
  async getRotation(): Promise<Maybe<Rotation>> {
    const [p1, p2] = await Promise.allSettled([
      this.#enablePan ? this._pan.readStatus() : Promise.resolve({ success: true, value: { angle: 100 } } as const),
      this.#enableTilt ? this._tilt.readStatus() : Promise.resolve({ success: true, value: { angle: 100 } } as const),
    ])
    if (p1.status !== 'fulfilled' || p2.status !== 'fulfilled') {
      return
    }
    if (!p1.value.success || !p2.value.success) {
      return {
        success: false,
      }
    }
    const y = (-Math.PI * (p1.value.value.angle - 90)) / 180
    const p = (-Math.PI * (p2.value.value.angle - 90)) / 180
    return {
      success: true,
      value: {
        y,
        p,
        r: 0.0,
      },
    }
  }

  private traceMotionDiagnostic(message: string): void {
    if (this.#motionDiagnosticLogCount >= MOTION_DIAGNOSTIC_LOG_LIMIT) return
    this.#motionDiagnosticLogCount += 1
    trace(`${message}\n`)
  }
}
