export interface WorldDef {
  id: 1 | 2 | 3 | 4 | 5;
  name: string;
  blurb: string;
  gimmick: string;
  skyTop: string;
  skyBottom: string;
  mid: string;
  accent: string;
  far: string;
  ground: string;
  groundDark: string;
  groundLight: string;
  ambient: 'pollen' | 'spark' | 'snow' | 'ember' | 'petal';
  music: 'marimba' | 'bell' | 'musicbox' | 'drone' | 'chime';
  gravity: number;
}

export const WORLDS: WorldDef[] = [
  {
    id: 1,
    name: 'Barnyard Basics',
    blurb: 'Hay bales, wooden crates and a lot of very smug weasels.',
    gimmick: 'Fundamentals: aim, power and a sturdy hay wall.',
    skyTop: '#8ED9F2',
    skyBottom: '#C9EFFB',
    mid: '#7BC950',
    accent: '#F4E4B2',
    far: '#B9E6F7',
    ground: '#7BC950',
    groundDark: '#4E8C31',
    groundLight: '#9EDD6B',
    ambient: 'pollen',
    music: 'marimba',
    gravity: 2200,
  },
  {
    id: 2,
    name: 'Rusty Ranch',
    blurb: 'Conveyors, magnets and metal that would rather bounce you.',
    gimmick: 'Metal braces, moving machinery and Puff’s soft bounce.',
    skyTop: '#F3C98B',
    skyBottom: '#FBE9C8',
    mid: '#6B7280',
    accent: '#C2410C',
    far: '#B08D6A',
    ground: '#8A6A45',
    groundDark: '#5C452B',
    groundLight: '#B08C5C',
    ambient: 'spark',
    music: 'drone',
    gravity: 2200,
  },
  {
    id: 3,
    name: 'Frostbite Farm',
    blurb: 'Glass-brittle ice, avalanches and a chill in the air.',
    gimmick: 'Slippery ice, brittle supports and Snowbell’s freeze.',
    skyTop: '#1E3A8A',
    skyBottom: '#6EA3D8',
    mid: '#93C5FD',
    accent: '#DBEAFE',
    far: '#2E4C8F',
    ground: '#DCEBF7',
    groundDark: '#9BB9D3',
    groundLight: '#F4FBFF',
    ambient: 'snow',
    music: 'musicbox',
    gravity: 2200,
  },
  {
    id: 4,
    name: 'Volcano Roost',
    blurb: 'Lava, geysers and hay that catches rather too easily.',
    gimmick: 'Lava kill zones, spreading fire and Pepper’s burst.',
    skyTop: '#3F1414',
    skyBottom: '#8A3220',
    mid: '#44403C',
    accent: '#F97316',
    far: '#5C241B',
    ground: '#4A3730',
    groundDark: '#2B1F1B',
    groundLight: '#6E5348',
    ambient: 'ember',
    music: 'drone',
    gravity: 2200,
  },
  {
    id: 5,
    name: 'Sky Fortress',
    blurb: 'Floating islands, crystal chains and a great deal of wind.',
    gimmick: 'Low gravity, strong gusts and crystal chain reactions.',
    skyTop: '#0EA5E9',
    skyBottom: '#BAE6FD',
    mid: '#A78BFA',
    accent: '#F0ABFC',
    far: '#7DA8D8',
    ground: '#7DA8D8',
    groundDark: '#4C7099',
    groundLight: '#A8C8E4',
    ambient: 'petal',
    music: 'chime',
    gravity: 1500,
  },
];

export function worldDef(id: number): WorldDef {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
