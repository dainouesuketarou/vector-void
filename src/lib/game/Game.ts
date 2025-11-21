import { Board } from './Board';
import { CellType, Phase, PlayerId, type MapConfig, type Position } from './types';

import { RNG } from '../utils/rng';

export class Game {
    board: Board;
    currentPlayer: PlayerId;
    phase: Phase;
    units: Record<PlayerId, Position>;
    gameOver: boolean = false;
    winner: PlayerId | null = null;
    rng: RNG;

    constructor(mapConfig: MapConfig, seed: number = Date.now()) {
        this.rng = new RNG(seed);
        this.board = new Board(mapConfig, this.rng);
        this.currentPlayer = PlayerId.P1;
        this.phase = Phase.MOVE;
        
        // Initial Positions
        this.units = {
            [PlayerId.P1]: { r: 0, c: 0 },
            [PlayerId.P2]: { r: mapConfig.size - 1, c: mapConfig.size - 1 }
        };

        // Place units on board
        this.updateBoardUnits();
    }

    private updateBoardUnits() {
        // Clear old units
        for (let r = 0; r < this.board.size; r++) {
            for (let c = 0; c < this.board.size; c++) {
                const cell = this.board.getCell(r, c);
                if (cell) cell.unit = null;
            }
        }
        // Place new
        const p1 = this.units[PlayerId.P1];
        const p2 = this.units[PlayerId.P2];
        
        const c1 = this.board.getCell(p1.r, p1.c);
        if (c1) c1.unit = PlayerId.P1;
        
        const c2 = this.board.getCell(p2.r, p2.c);
        if (c2) c2.unit = PlayerId.P2;
    }

    move(toR: number, toC: number): boolean {
        if (this.gameOver || this.phase !== Phase.MOVE) return false;
        if (!this.isValidMove(this.currentPlayer, toR, toC)) return false;

        // Execute Move
        this.units[this.currentPlayer] = { r: toR, c: toC };
        
        // Check Teleport
        const destCell = this.board.getCell(toR, toC);
        if (destCell && destCell.isTeleport()) {
            const teleDest = this.board.getTeleportDestination(toR, toC);
            if (teleDest) {
                // Teleport!
                const opponent = this.currentPlayer === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
                const oppPos = this.units[opponent];
                if (teleDest.r !== oppPos.r || teleDest.c !== oppPos.c) {
                     this.units[this.currentPlayer] = teleDest;
                }
            }
        }

        this.updateBoardUnits();
        this.phase = Phase.SHOOT;
        return true;
    }

    isValidMove(player: PlayerId, r: number, c: number): boolean {
        const unit = this.units[player];
        const dr = Math.abs(r - unit.r);
        const dc = Math.abs(c - unit.c);

        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return false;
        
        const cell = this.board.getCell(r, c);
        if (!cell) return false; 

        if (cell.isHole() || cell.isMirror()) return false;
        if (cell.hasUnit()) return false;

        if (!this.canShootFrom(r, c)) return false;

        return true;
    }

    canShootFrom(r: number, c: number): boolean {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        for (const dir of dirs) {
            if (this.simulateShot(r, c, dir)) return true;
        }
        return false;
    }

    getValidShotDirs(r: number, c: number): string[] {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        return dirs.filter(dir => this.simulateShot(r, c, dir));
    }

    simulateShot(startR: number, startC: number, dirStr: string): boolean {
        let { dr, dc } = this.parseDir(dirStr);
        let currR = startR + dr;
        let currC = startC + dc;

        while (true) {
            const cell = this.board.getCell(currR, currC);
            if (!cell) return false; 

            if (cell.hasUnit()) return true; // Valid to shoot units now
            if (cell.isHole()) return false;

            if (cell.isTeleport()) return true;
            if (cell.type === CellType.EMPTY) return true;

            return false;
        }
    }

    // Get all shootable target positions from a given position
    getShootableTargets(fromR: number, fromC: number): Position[] {
        const targets: Position[] = [];
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        
        for (const dir of dirs) {
            const target = this.getShootTarget(fromR, fromC, dir);
            if (target) {
                // Avoid duplicates
                if (!targets.some(t => t.r === target.r && t.c === target.c)) {
                    targets.push(target);
                }
            }
        }
        
        return targets;
    }

    // Calculate where a shot in a given direction will land
    private getShootTarget(startR: number, startC: number, dirStr: string): Position | null {
        let { dr, dc } = this.parseDir(dirStr);
        let currR = startR + dr;
        let currC = startC + dc;

        while (true) {
            const cell = this.board.getCell(currR, currC);
            if (!cell) return null;
            
            if (cell.hasUnit()) return { r: currR, c: currC }; // Unit is a target
            if (cell.isHole()) return null;

            // Return landing position
            if (cell.isTeleport() || cell.type === CellType.EMPTY) {
                return { r: currR, c: currC };
            }

            return null;
        }
    }

    // Find direction from current position to target
    private findDirectionToTarget(from: Position, target: Position): string | null {
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        
        for (const dir of dirs) {
            const calcTarget = this.getShootTarget(from.r, from.c, dir);
            if (calcTarget && calcTarget.r === target.r && calcTarget.c === target.c) {
                return dir;
            }
        }
        
        return null;
    }

    // Shoot at a specific target position
    shootTarget(targetR: number, targetC: number): boolean {
        if (this.gameOver || this.phase !== Phase.SHOOT) return false;
        
        const currentPos = this.units[this.currentPlayer];
        const targets = this.getShootableTargets(currentPos.r, currentPos.c);
        
        // Check if target is valid
        const isValid = targets.some(t => t.r === targetR && t.c === targetC);
        if (!isValid) return false;
        
        // Find the direction to shoot
        const dirStr = this.findDirectionToTarget(currentPos, { r: targetR, c: targetC });
        
        if (dirStr) {
            this.shoot(dirStr);
            return true;
        }
        
        return false;
    }

    shoot(dirStr: string): { path: Position[], destroyed: Position | null } {
        if (this.gameOver || this.phase !== Phase.SHOOT) return { path: [], destroyed: null };

        const start = this.units[this.currentPlayer];
        let { dr, dc } = this.parseDir(dirStr);
        let currR = start.r + dr;
        let currC = start.c + dc;
        const path: Position[] = [];

        while (true) {
            path.push({ r: currR, c: currC });
            const cell = this.board.getCell(currR, currC);

            // Check for Unit Hit
            if (cell?.hasUnit()) {
                this.gameOver = true;
                // If I hit opponent, I win. If I hit myself, I lose (opponent wins).
                if (cell.unit === this.currentPlayer) {
                    this.winner = this.currentPlayer === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
                } else {
                    this.winner = this.currentPlayer;
                }
                return { path, destroyed: { r: currR, c: currC } };
            }

            if (cell?.type === CellType.EMPTY || cell?.type === CellType.TELEPORT) {
                const wasTeleport = cell.isTeleport();
                const teleportId = cell.teleportId;

                cell.destroy();
                
                if (wasTeleport && teleportId !== null) {
                    this.board.respawnTeleporter(teleportId);
                }

                this.endTurn();
                return { path, destroyed: { r: currR, c: currC } };
            }
            
            break; 
        }
        return { path, destroyed: null };
    }

    private endTurn() {
        this.currentPlayer = this.currentPlayer === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
        this.phase = Phase.MOVE;
        
        if (!this.canMove(this.currentPlayer)) {
            this.gameOver = true;
            this.winner = this.currentPlayer === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
        }
    }

    canMove(player: PlayerId): boolean {
        const unit = this.units[player];
        for (let r = unit.r - 1; r <= unit.r + 1; r++) {
            for (let c = unit.c - 1; c <= unit.c + 1; c++) {
                if (this.isValidMove(player, r, c)) return true;
            }
        }
        return false;
    }

    private parseDir(dir: string): { dr: number, dc: number } {
        let dr = 0, dc = 0;
        if (dir.includes('n')) dr = -1;
        if (dir.includes('s')) dr = 1;
        if (dir.includes('e')) dc = 1;
        if (dir.includes('w')) dc = -1;
        return { dr, dc };
    }
}
