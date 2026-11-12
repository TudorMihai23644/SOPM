/** Sprite-uri pixel art desenate din hărți de caractere, fără fișiere de imagine. */

const PALETTE: Record<string, string> = {
  H: '#22e3f5', // cască
  h: '#0e8fa0',
  S: '#ffcfa3', // piele
  E: '#07071a', // ochi
  N: '#6b6f9c', // pleoape obosite
  M: '#b4415a', // gură
  K: '#ff4d6d', // ochi KO
  W: '#7cc7ff', // picătură de transpirație
  B: '#ff4fd8', // armură
  b: '#b0309a',
  L: '#9b7bff', // picioare
  X: '#ffd23f', // sabie
  R: '#ff4d6d', // monstru
  r: '#a3213b',
  P: '#9b7bff', // boss
  p: '#5b3fc0',
  Y: '#ffd23f',
  G: '#a8ff3e',
};

function PixelArt({ map, scale, label }: { map: string[]; scale: number; label: string }) {
  const width = map[0].length;
  return (
    <svg
      viewBox={`0 0 ${width} ${map.length}`}
      width={width * scale}
      height={map.length * scale}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      {map.flatMap((row, y) =>
        [...row].map((cell, x) =>
          PALETTE[cell] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[cell]} /> : null,
        ),
      )}
    </svg>
  );
}

const HERO_TOP = ['...HHHHHH...', '..HHHHHHHH..', '..HhSSSShH..'];
const HERO_BOTTOM = [
  '...SSSSSS...',
  '..BBBBBBBB.X',
  '.BBBbBBbBBXX',
  '.SBBBBBBBBSX',
  '..BBBBBBBB.X',
  '..LLL..LLL..',
  '..LLL..LLL..',
  '.LLLL..LLLL.',
];

const FACES = {
  happy: ['..SEESSEES..', '..SMSSSSMS..', '..SSMMMMSS..'],
  normal: ['..SEESSEES..', '..SSSSSSSS..', '..SSMMMMSS..'],
  tired: ['..SNNSSNNSW.', '..SEESSEESW.', '..SSSMMSSS..'],
  ko: ['..SKSKKSKS..', '..SSKSSKSS..', '..SSMMMMSS..'],
};

export type HeroMood = keyof typeof FACES;

/** Starea eroului după HP, ca în Specificații: energic, obișnuit, obosit, KO. */
export function moodForHp(hp: number): HeroMood {
  if (hp <= 0) return 'ko';
  if (hp < 30) return 'tired';
  if (hp < 70) return 'normal';
  return 'happy';
}

const MOOD_LABEL: Record<HeroMood, string> = {
  happy: 'Eroul tău e plin de energie',
  normal: 'Eroul tău e în formă',
  tired: 'Eroul tău e obosit',
  ko: 'Eroul tău e K.O.',
};

export function HeroSprite({ mood, scale = 5 }: { mood: HeroMood; scale?: number }) {
  return <PixelArt map={[...HERO_TOP, ...FACES[mood], ...HERO_BOTTOM]} scale={scale} label={MOOD_LABEL[mood]} />;
}

const MONSTER = [
  '..R....R..',
  '...R..R...',
  '..RRRRRR..',
  '.RRYRRYRR.',
  'RRRRRRRRRR',
  'RrRrRRrRrR',
  'RRRRRRRRRR',
  '.R.R..R.R.',
];

const BOSS = [
  'P.P......P.P',
  'PPP......PPP',
  '.PPPPPPPPPP.',
  'PPPGGPPGGPPP',
  'PPPGGPPGGPPP',
  'PPPPPPPPPPPP',
  'PpYpYpYpYpPP',
  'PPPPPPPPPPPP',
  '.PP.PP.PP.P.',
];

export function MonsterSprite({ boss = false, scale = 4 }: { boss?: boolean; scale?: number }) {
  return <PixelArt map={boss ? BOSS : MONSTER} scale={scale} label={boss ? 'Boss' : 'Monstru'} />;
}
