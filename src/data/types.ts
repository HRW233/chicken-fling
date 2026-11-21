export interface Vec2 {
  x: number;
  y: number;
}

export type Material = 'hay' | 'wood' | 'ice' | 'stone' | 'metal' | 'crystal' | 'terrain';

export type BlockShape = 'box' | 'circle' | 'polygon';

export interface Block {
  id: string;
  shape: BlockShape;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  points?: Vec2[];
  angle?: number;
  material: Material;
  static?: boolean;
  isGround?: boolean;
  explosive?: boolean;
  chain?: string;
  tags?: string[];
}

export type WeaselType = 'grunt' | 'helmet' | 'brute' | 'king' | 'boss';

export interface Weasel {
  id: string;
  x: number;
  y: number;
  type: WeaselType;
  facing?: 1 | -1;
  patrol?: { axis: 'x' | 'y'; range: number; speed: number };
}

export type Mechanism =
  | { kind: 'conveyor'; x: number; y: number; w: number; speed: number }
  | { kind: 'magnet'; x: number; y: number; radius: number; strength: number }
  | { kind: 'piston'; x: number; y: number; axis: 'x' | 'y'; travel: number; periodS: number }
  | { kind: 'geyser'; x: number; y: number; radius: number; force: number; periodS: number; phaseS: number }
  | { kind: 'balloon'; x: number; y: number; blockId: string; lift: number }
  | { kind: 'lava'; x: number; y: number; w: number; h: number }
  | { kind: 'windZone'; x: number; y: number; w: number; h: number; wind: Vec2 };

export type ChickenId =
  | 'cluck'
  | 'speckle'
  | 'drumstick'
  | 'puff'
  | 'nugget'
  | 'bantam'
  | 'pepper'
  | 'snowbell'
  | 'mother';

export interface Pickup {
  type: 'goldenEgg';
  x: number;
  y: number;
}

export interface Level {
  id: string;
  world: 1 | 2 | 3 | 4 | 5;
  index: number;
  name: string;
  difficulty: number;
  parTimeSec: number;
  starScore: [number, number, number];
  wind: Vec2;
  gravity?: Vec2;
  worldWidth?: number;
  cannon: { x: number; y: number; minAngleDeg: number; maxAngleDeg: number };
  queue: ChickenId[];
  blocks: Block[];
  weasels: Weasel[];
  pickups: Pickup[];
  mechanisms: Mechanism[];
  groundY: number;
}
