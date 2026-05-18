import SCServo from 'scservo'
import type Timer from 'timer'
import type { Maybe, Rotation } from 'stackchan-util'

type SCServoDriverProps = {
  panId: number
  tiltId: number
  readPosition?: boolean
}

export class SCServoDriver {
  _pan: SCServo
  _tilt: SCServo
  _handler: ReturnType<typeof Timer.repeat>
  _readPosition: boolean
  _rotation: Rotation
  constructor(param: SCServoDriverProps) {
    this._pan = new SCServo({ id: param.panId })
    this._tilt = new SCServo({ id: param.tiltId })
    this._readPosition = param.readPosition ?? false
    this._rotation = {
      y: 0,
      p: 0,
      r: 0,
    }
  }

  async setTorque(torque: boolean): Promise<void> {
    await Promise.all([this._pan.setTorque(torque), this._tilt.setTorque(torque)])
  }

  async applyRotation(ori: Rotation, time = 0.5): Promise<void> {
    const panAngle = 100 - (ori.y * 180) / Math.PI
    const tiltAngle = 100 - Math.min(Math.max((ori.p * 180) / Math.PI, -25), 10)
    trace(`applying (${ori.y}, ${ori.p}) => (${panAngle}, ${tiltAngle})\n`)
    this._rotation = { ...ori }
    if (time === 0) {
      await Promise.all([this._pan.setAngle(panAngle), this._tilt.setAngle(tiltAngle)])
    } else {
      await Promise.all([
        this._pan.setAngleInTime(panAngle, time * 1000),
        this._tilt.setAngleInTime(tiltAngle, time * 1000),
      ])
    }
  }
  async getRotation(): Promise<Maybe<Rotation>> {
    if (!this._readPosition) {
      return {
        success: true,
        value: this._rotation,
      }
    }
    const [p1, p2] = await Promise.allSettled([this._pan.readStatus(), this._tilt.readStatus()])
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
}
