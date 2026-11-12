/** Sunete scurte de joc, generate cu Web Audio (fără fișiere). */
type Sfx = 'coin' | 'levelUp' | 'damage' | 'ko' | 'denied' | 'undo' | 'click';

const SEQUENCES: Record<Sfx, { notes: number[]; step: number; type: OscillatorType; volume: number }> = {
  coin: { notes: [1568, 2093], step: 0.09, type: 'triangle', volume: 0.06 },
  levelUp: { notes: [262, 330, 392, 523, 659, 784], step: 0.13, type: 'triangle', volume: 0.07 },
  damage: { notes: [110, 82, 65], step: 0.1, type: 'sawtooth', volume: 0.05 },
  ko: { notes: [196, 185, 147, 110, 73], step: 0.32, type: 'sine', volume: 0.12 },
  denied: { notes: [98, 98], step: 0.12, type: 'square', volume: 0.03 },
  undo: { notes: [523, 392], step: 0.08, type: 'sine', volume: 0.06 },
  click: { notes: [880], step: 0.04, type: 'triangle', volume: 0.03 },
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
