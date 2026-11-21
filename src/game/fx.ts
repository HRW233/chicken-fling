export type BurstKind =
  | 'dust'
  | 'debris'
  | 'feather'
  | 'smoke'
  | 'spark'
  | 'flame'
  | 'hitmark'
  | 'ice'
  | 'star'
  | 'confetti';

export type SoundName =
  | 'cannon'
  | 'chargeStart'
  | 'chargeStop'
  | 'reload'
  | 'rotate'
  | 'crunchHay'
  | 'crunchWood'
  | 'crunchIce'
  | 'crunchStone'
  | 'crunchMetal'
  | 'crunchCrystal'
  | 'squawk'
  | 'abilityEgg'
  | 'abilityDash'
  | 'abilityInflate'
  | 'abilitySplit'
  | 'abilityPierce'
  | 'abilityFire'
  | 'abilityFreeze'
  | 'abilityMega'
  | 'weaselHit'
  | 'weaselKo'
  | 'boom'
  | 'balloon'
  | 'geyser'
  | 'lava'
  | 'freeze'
  | 'win'
  | 'fail'
  | 'star'
  | 'click'
  | 'unlock';

export interface BurstOpts {
  color?: string;
  count?: number;
  power?: number;
  size?: number;
}

export interface SoundOpts {
  pitch?: number;
  power?: number;
  volume?: number;
}

export interface Fx {
  burst(kind: BurstKind, x: number, y: number, opts?: BurstOpts): void;
  sound(name: SoundName, opts?: SoundOpts): void;
  shake(amount: number): void;
  slowMo(seconds: number): void;
}

export const NULL_FX: Fx = {
  burst: () => undefined,
  sound: () => undefined,
  shake: () => undefined,
  slowMo: () => undefined,
};
