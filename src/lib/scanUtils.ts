// Utilidades para manejo de escaneo y extracción de códigos

export function extractInventoryCode(raw: string): string | null {
  // Si es una URL (QR), extraer el número de inventario
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const url = new URL(raw);
      // Buscar en pathname: /inv/{code} o /etiquetas/{code}
      const matches = url.pathname.match(/\/(inv|etiquetas)\/([A-Z0-9-]+)/i);
      if (matches && matches[2]) {
        return matches[2];
      }
      // Buscar en query params: ?inv=CODE
      const invParam = url.searchParams.get("inv");
      if (invParam) return invParam;
    }
  } catch (e) {
    // No es URL válida, asumir que es código directo
  }
  
  // Si el contenido tiene múltiples líneas, tomar solo la primera
  // (formato de QR de etiquetas: inventario\ndescripcion\nN/S: serie)
  const lines = raw.split('\n');
  if (lines.length > 1) {
    return lines[0].trim();
  }
  
  // Retornar el código tal cual (será normalizado después)
  return raw.trim();
}

// Sonidos de feedback
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playBeepOk() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error("Error playing beep:", e);
  }
}

export function playBeepWarning() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = "square";
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error("Error playing beep:", e);
  }
}

export function playBeepError() {
  try {
    const ctx = getAudioContext();
    
    // Dos tonos descendentes
    for (let i = 0; i < 2; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 400 - i * 100;
      oscillator.type = "sawtooth";
      
      const startTime = ctx.currentTime + i * 0.1;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.1);
    }
  } catch (e) {
    console.error("Error playing beep:", e);
  }
}

// ─── iOS Audio Unlock ─────────────────────────────────────────────────────────
// iOS Safari / PWA suspende el AudioContext hasta el primer gesto del usuario.
// Llamar esta función en el primer touchstart/click desbloquea el audio.
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    src.stop(0.001);
    if (ctx.state === "suspended") ctx.resume();
  } catch (_) { /* silencioso */ }
}

// ─── Notification Sounds (for toast alerts) ───────────────────────────────────

export function playNotificationSuccess() {
  try {
    const ctx = getAudioContext();
    // Two ascending tones: E5 → G5 (pleasant chime)
    [659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t); osc.stop(t + 0.25);
    });
  } catch (e) { /* no AudioContext */ }
}

export function playNotificationError() {
  try {
    const ctx = getAudioContext();
    // Two descending dissonant tones
    [380, 270].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sawtooth"; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch (e) { /* no AudioContext */ }
}

export function playNotificationWarning() {
  try {
    const ctx = getAudioContext();
    // Single tone with slight drop (attention getter)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(560, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  } catch (e) { /* no AudioContext */ }
}

export function playNotificationInfo() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = 528;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
  } catch (e) { /* no AudioContext */ }
}

export type ScanFeedback = "ok" | "warning" | "error";

export function playScanFeedback(type: ScanFeedback) {
  switch (type) {
    case "ok":
      playBeepOk();
      break;
    case "warning":
      playBeepWarning();
      break;
    case "error":
      playBeepError();
      break;
  }
}
