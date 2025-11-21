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
        // Randomly place 2 teleporters on EMPTY cells
        let placed = 0;
        this.teleporters = [];
        
        // Safety break
        let attempts = 0;
        while (placed < 2 && attempts < 100) {
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
        if (!cell || !cell.isTeleport()) return null;

        // Find the *other* teleporter
        const other = this.teleporters.find(p => p.r !== fromR || p.c !== fromC);
        
        // Check if the other teleporter still exists (wasn't destroyed)
        if (other) {
            const targetCell = this.getCell(other.r, other.c);
            if (targetCell && targetCell.isTeleport()) {
                return other;
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
