const STORAGE_KEY = 'jj-signature-inventory-sounds-enabled'
let audioContext: AudioContext | null = null
let lastPlayedAt = 0

export function isInventorySoundEnabled() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
}

export function setInventorySoundEnabled(enabled: boolean) {
  try { localStorage.setItem(STORAGE_KEY, String(enabled)) } catch { /* preference storage is optional */ }
}

export async function unlockInventoryAlertSound() {
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) return
    audioContext = new AudioContextConstructor()
  }
  if (audioContext.state === 'suspended') await audioContext.resume()
}

export async function playInventoryAlertSound(type: 'LOW_STOCK' | 'OUT_OF_STOCK') {
  if (!isInventorySoundEnabled() || Date.now() - lastPlayedAt < 1800) return
  try {
    await unlockInventoryAlertSound()
    if (!audioContext) return
    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(type === 'OUT_OF_STOCK' ? 520 : 660, now)
    oscillator.frequency.exponentialRampToValueAtTime(type === 'OUT_OF_STOCK' ? 360 : 480, now + 0.18)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(type === 'OUT_OF_STOCK' ? 0.12 : 0.08, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.24)
    lastPlayedAt = Date.now()
  } catch {
    // Browser autoplay policy or unavailable audio must never affect billing.
  }
}
