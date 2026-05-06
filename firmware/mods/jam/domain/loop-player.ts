import Resource from 'Resource'
import AudioOut from 'pins/audioout'

const LOOP_RESOURCE = 'loop1.maud'
const SAMPLE_RATE = 24000

export class JamLoopPlayer {
  #audio: AudioOut

  constructor() {
    this.#audio = new AudioOut({
      streams: 1,
      sampleRate: SAMPLE_RATE,
      bitsPerSample: 16,
    })
  }

  play(): void {
    this.#audio.stop()
    this.#audio.enqueue(0, AudioOut.Flush)
    this.#audio.enqueue(0, AudioOut.Volume, 256)
    this.#audio.enqueue(0, AudioOut.Samples, new Resource(LOOP_RESOURCE), Infinity)
    this.#audio.start()
  }

  stop(): void {
    this.#audio.enqueue(0, AudioOut.Flush)
    this.#audio.stop()
  }
}
