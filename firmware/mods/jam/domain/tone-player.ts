import AudioOut from 'pins/audioout'

const SAMPLE_RATE = 24000
const TONE_MARGIN_MS = 20

export type TonePlayResult = {
  played: boolean
  busyUntil: number
}

export class JamTonePlayer {
  #audio: AudioOut
  #busyUntil = 0

  constructor() {
    this.#audio = new AudioOut({
      streams: 1,
      sampleRate: SAMPLE_RATE,
      bitsPerSample: 16,
    })
  }

  play(now: number, hz: number, duration: number, volume: number): TonePlayResult {
    if (now < this.#busyUntil) {
      return {
        played: false,
        busyUntil: this.#busyUntil,
      }
    }
    this.#audio.enqueue(0, AudioOut.Flush)
    this.#audio.enqueue(0, AudioOut.Volume, Math.round(Math.max(0, Math.min(1, volume)) * 256))
    this.#audio.enqueue(0, AudioOut.Tone, hz, (SAMPLE_RATE * Math.max(1, duration)) / 1000)
    this.#audio.start()
    this.#busyUntil = now + duration + TONE_MARGIN_MS
    return {
      played: true,
      busyUntil: this.#busyUntil,
    }
  }

  stop(): void {
    this.#audio.enqueue(0, AudioOut.Flush)
    this.#audio.stop()
    this.#busyUntil = 0
  }
}
