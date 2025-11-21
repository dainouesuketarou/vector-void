export enum CellType {
    EMPTY = 0,
    HOLE = 1,
    MIRROR_0 = 2, // /
    MIRROR_1 = 3, // \
    TELEPORT = 4
}

export enum PlayerId {
    P1 = 1,
    P2 = 2
}

export enum Phase {
    MOVE = 'move',
    SHOOT = 'shoot'
}

export interface Position {
    r: number;
    c: number;
}

export interface MapConfig {
    id: string;
    name: string;
    description: string;
    size: number;
    layout: CellType[][];
}
