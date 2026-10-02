let ctx: AudioContext | null = null

function tone(freq: number, durationMs: number, gain: number) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000)
    osc.connect(g).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + durationMs / 1000 + 0.02)
  } catch {
    // 音が出せない環境では何もしない
  }
}

/** 正解：控えめで短い高音 */
export function playCorrect() {
  tone(1320, 90, 0.06)
}

/** 誤答：低く短い音 */
export function playWrong() {
  tone(196, 180, 0.08)
}
