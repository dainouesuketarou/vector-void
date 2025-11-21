import { Cell } from './Cell';
import { CellType, type MapConfig, type Position } from './types';
import type { RNG } from '../utils/rng';

export class Board {
    grid: Cell[][] = [];
    size: number;
    teleporters: Position[] = [];
    private rng: RNG;

    constructor(config: MapConfig, rng: RNG) {
        this.size = config.size;
        this.rng = rng;
        this.initialize(config.layout);
    }

    private initialize(layout: CellType[][]): void {
        this.grid = [];
        for (let r = 0; r < this.size; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < this.size; c++) {
                row.push(new Cell(layout[r][c]));
            }
            this.grid.push(row);
        }
        this.generateTeleporters();
    }

    private generateTeleporters(): void {
        // Determine number of teleporters based on map size
        // 5x5 -> 2 (1 pair)
        // 7x7 -> 4 (2 pairs)
        // 9x9 -> 6 (3 pairs)
        let numTeleporters = 2;
        if (this.size === 7) numTeleporters = 4;
        if (this.size === 9) numTeleporters = 6;

        let placed = 0;
        this.teleporters = [];
        
        // Safety break
        let attempts = 0;
        while (placed < numTeleporters && attempts < 200) {
            const r = this.rng.range(0, this.size);
            const c = this.rng.range(0, this.size);
            
            // Avoid start positions (corners)
            if ((r === 0 && c === 0) || (r === this.size - 1 && c === this.size - 1)) {
                attempts++;
                continue;
            }

            if (this.grid[r][c].type === CellType.EMPTY) {
                this.grid[r][c].type = CellType.TELEPORT;
                this.grid[r][c].teleportId = placed;
                this.teleporters.push({ r, c });
                placed++;
            }
            attempts++;
        }
    }

    getCell(r: number, c: number): Cell | null {
        if (r < 0 || r >= this.size || c < 0 || c >= this.size) return null;
        return this.grid[r][c];
    }

    getTeleportDestination(fromR: number, fromC: number): Position | null {
        const cell = this.getCell(fromR, fromC);
        if (!cell || !cell.isTeleport() || cell.teleportId === null) return null;

        // Find partner ID: 0<->1, 2<->3, 4<->5
        // If even, partner is id+1. If odd, partner is id-1.
        const partnerId = cell.teleportId % 2 === 0 ? cell.teleportId + 1 : cell.teleportId - 1;
        
        // Find the partner teleporter position
        // We can look it up directly in the teleporters array if indices match IDs
        if (this.teleporters[partnerId]) {
            const dest = this.teleporters[partnerId];
            const destCell = this.getCell(dest.r, dest.c);
            
            // Verify it's still a valid teleporter (wasn't destroyed)
            if (destCell && destCell.isTeleport() && destCell.teleportId === partnerId) {
                return dest;
            }
        }
        return null;
    }

    respawnTeleporter(oldId: number): void {
        // Find a new spot for the destroyed teleporter
        let attempts = 0;
        while (attempts < 100) {
            const r = this.rng.range(0, this.size);
            const c = this.rng.range(0, this.size);

            // Must be EMPTY and not have a unit
            const cell = this.grid[r][c];
            if (cell.type === CellType.EMPTY && !cell.hasUnit()) {
                cell.type = CellType.TELEPORT;
                cell.teleportId = oldId;
                
                // Update position in teleporters array
                // The array stores 2 positions. We need to replace the one that matches the oldId logic
                // But wait, `teleportId` was 0 or 1.
                // We can just update the array index corresponding to oldId.
                if (this.teleporters[oldId]) {
                    this.teleporters[oldId] = { r, c };
                }
                return;
            }
            attempts++;
        }
    }
}
