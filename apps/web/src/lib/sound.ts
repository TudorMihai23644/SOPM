/** Sunete scurte de joc, generate cu Web Audio (fără fișiere). */
type Sfx = 'coin' | 'levelUp' | 'damage' | 'ko' | 'denied' | 'undo' | 'click';

const SEQUENCES: Record<Sfx, { notes: number[]; step: number; type: OscillatorType; volume: number }> = {
  coin: { notes: [988, 1319], step: 0.07, type: 'square', volume: 0.05 },
  levelUp: { notes: [523, 659, 784, 1047, 1319], step: 0.09, type: 'square', volume: 0.06 },
  damage: { notes: [220, 165, 110], step: 0.08, type: 'sawtooth', volume: 0.06 },
  ko: { notes: [392, 330, 262, 196, 131], step: 0.14, type: 'triangle', volume: 0.08 },
  denied: { notes: [180, 180], step: 0.09, type: 'square', volume: 0.04 },
  undo: { notes: [660, 440], step: 0.06, type: 'triangle', volume: 0.05 },
  click: { notes: [1200], step: 0.03, type: 'square', volume: 0.025 },
};

let context: AudioContext | null = null;

export function playSfx(name: Sfx): void {
  try {
    context ??= new AudioContext();
    const { notes, step, type, volume } = SEQUENCES[name];
    const start = context.currentTime;
    notes.forEach((frequency, i) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      const t = start + i * step;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + step * 0.95);
      osc.connect(gain).connect(context!.destination);
      osc.start(t);
      osc.stop(t + step);
    });
  } catch {
    // Browserul nu are Web Audio sau l-a blocat: jocul merge și fără sunet.
  }
}

export type { Sfx };
