import { CellType, PlayerId } from './types';

export class Cell {
    type: CellType;
    unit: PlayerId | null = null;
    teleportId: number | null = null; // To link teleporters

    constructor(type: CellType = CellType.EMPTY) {
        this.type = type;
    }

    isEmpty(): boolean {
        return this.type === CellType.EMPTY && this.unit === null;
    }

    isHole(): boolean {
        return this.type === CellType.HOLE;
    }

    isMirror(): boolean {
        return this.type === CellType.MIRROR_0 || this.type === CellType.MIRROR_1;
    }

    isTeleport(): boolean {
        return this.type === CellType.TELEPORT;
    }

    hasUnit(): boolean {
        return this.unit !== null;
    }

    destroy(): void {
        if (this.type !== CellType.HOLE) {
            this.type = CellType.HOLE;
            this.unit = null; // Should not happen if logic is correct, but safety
            this.teleportId = null;
        }
    }
}
