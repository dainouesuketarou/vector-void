import { PlayerId } from './types';

export enum CharacterType {
    VOID_DRIFTER = 'void_drifter',
    SWIFT_SHADOW = 'swift_shadow',
    HEAVY_GUARDIAN = 'heavy_guardian'
}

export interface CharacterStats {
    name: string;
    description: string;
    moveRange: number; // Max tiles to move per action. 1 = adjacent only.
    moveCount: number; // Number of moves per turn. Default 1, Swift Shadow = 2
    movePattern: 'all' | 'orthogonal'; // Movement directions
    shootRange: number; // Max tiles to shoot. -1 = infinite.
    shootPattern: 'all' | 'orthogonal'; // 'all' = 8 directions, 'orthogonal' = 4 directions (N, S, E, W)
    isInvincible: boolean; // If true, cannot be killed by shots
    visualShape: 'circle' | 'triangle' | 'square';
}

export const CHARACTERS: Record<CharacterType, CharacterStats> = {
    [CharacterType.VOID_DRIFTER]: {
        name: 'Void Drifter',
        description: 'バランス型。1マス射程で全方向に攻撃可能。',
        moveRange: 1,
        moveCount: 1,
        movePattern: 'all',
        shootRange: 1, // 1 tile
        shootPattern: 'all',
        isInvincible: false,
        visualShape: 'circle'
    },
    [CharacterType.SWIFT_SHADOW]: {
        name: 'Swift Shadow',
        description: '高機動型。1ターンに2回移動できるが、射程は1マス・4方向のみ。',
        moveRange: 1,
        moveCount: 2, // Can move twice!
        movePattern: 'all',
        shootRange: 1, // Only 1 tile
        shootPattern: 'orthogonal', // Only 4 directions
        isInvincible: false,
        visualShape: 'triangle'
    },
    [CharacterType.HEAVY_GUARDIAN]: {
        name: 'Heavy Guardian',
        description: '不死身の要塞。shootで死なない。8方向に移動可能だが射撃不可。',
        moveRange: 1,
        moveCount: 1,
        movePattern: 'all', // 8 directions
        shootRange: 0, // Cannot shoot
        shootPattern: 'all', // 8 directions (doesn't matter since shootRange is 0)
        isInvincible: true, // Cannot be killed!
        visualShape: 'square'
    }
};

export function getCharacterStats(type: CharacterType): CharacterStats {
    return CHARACTERS[type];
}
