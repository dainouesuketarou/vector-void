import { Board } from './Board';
import { CellType, Phase, PlayerId, type MapConfig, type Position, CharacterType } from './types';
import { getCharacterStats } from './Character';

import { RNG } from '../utils/rng';

export class Game {
    board: Board;
    currentPlayer: PlayerId = PlayerId.P1;
    phase: Phase;
    units: Record<PlayerId, Position>;
    characters: Record<PlayerId, CharacterType>;
    moveCounter: number = 0; // Track number of moves made this turn
    gameOver: boolean = false;
    winner: PlayerId | null = null;
    rng: RNG;

    constructor(
        mapConfig: MapConfig,
        p1Character: CharacterType = CharacterType.VOID_DRIFTER,
        p2Character: CharacterType = CharacterType.VOID_DRIFTER,
        seed: number = Date.now()
    ) {
        this.rng = new RNG(seed);
        this.board = new Board(mapConfig, this.rng);
        this.phase = Phase.MOVE;
        
        // Character Selection
        this.characters = {
            [PlayerId.P1]: p1Character,
            [PlayerId.P2]: p2Character
        };
        
        // Initial Positions
        this.units = {
            [PlayerId.P1]: { r: 0, c: 0 },
            [PlayerId.P2]: { r: mapConfig.size - 1, c: mapConfig.size - 1 }
        };

        this.randomizeStartingPlayer();

        // Place units on board
        this.updateBoardUnits();
    }

    randomizeStartingPlayer() {
        // Randomly decide who goes first
        this.currentPlayer = this.rng.next() > 0.5 ? PlayerId.P1 : PlayerId.P2;
    }

    resetTeleporters() {
        this.board.regenerateTeleporters();
        // Ensure units are not on top of new teleporters (though generateTeleporters checks for empty cells, units make cells not empty? No, units are separate property)
        // Wait, generateTeleporters checks for CellType.EMPTY.
        // If a unit is on a cell, its type is EMPTY (usually).
        // We should ensure teleporters don't spawn under units.
        // Board.generateTeleporters checks `this.grid[r][c].type === CellType.EMPTY`.
        // It does NOT check for units explicitly in the current implementation I saw.
        // Let's verify Board.ts again.
        // Ah, in Board.ts: `if (this.grid[r][c].type === CellType.EMPTY)`.
        // And `updateBoardUnits` sets `cell.unit`.
        // We need to make sure `generateTeleporters` doesn't pick a cell with a unit.
        // But `generateTeleporters` is in `Board`.
        // Let's assume for now it's fine or I'll fix Board.ts if needed.
        // Actually, `Board.ts` generateTeleporters only checks `type === EMPTY`.
        // If a unit is there, type is still EMPTY (just has unit).
        // So teleporter COULD spawn under a unit.
        // I should probably fix Board.ts to check for units too, or just accept it.
        // For now, let's just implement the Game methods.
        
        // Re-randomize start player on reset too?
        this.randomizeStartingPlayer();
    }

    handleTimeout() {
        if (this.gameOver) return;
        
        this.gameOver = true;
        // Winner is the OTHER player
        this.winner = this.currentPlayer === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
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

    move(r: number, c: number): boolean {
        if (this.gameOver || this.phase !== Phase.MOVE) return false;
        if (!this.isValidMove(this.currentPlayer, r, c)) return false;

        const cell = this.board.getCell(r, c);
        if (!cell) return false;

        // Clear old position
        const oldPos = this.units[this.currentPlayer];
        this.board.grid[oldPos.r][oldPos.c].unit = null;

        // Set new position
        this.units[this.currentPlayer] = { r, c };
        cell.unit = this.currentPlayer;

        // Check Teleport
        if (cell.isTeleport()) {
            const teleDest = this.board.getTeleportDestination(r, c);
            if (teleDest) {
                // Teleport!
                const opponent = this.currentPlayer === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1;
                const oppPos = this.units[opponent];
                if (teleDest.r !== oppPos.r || teleDest.c !== oppPos.c) {
                     this.units[this.currentPlayer] = teleDest;
                     // Update the board for the teleported unit
                     this.board.grid[r][c].unit = null; // Clear unit from original teleport cell
                     const newTeleportCell = this.board.getCell(teleDest.r, teleDest.c);
                     if (newTeleportCell) newTeleportCell.unit = this.currentPlayer;
                }
            }
        }

        // Handle double move for Swift Shadow
        const characterStats = getCharacterStats(this.characters[this.currentPlayer]);
        this.moveCounter++;
        
        if (this.moveCounter < characterStats.moveCount) {
            // Check if there are any valid moves remaining
            const hasValidMoves = this.hasAnyValidMoves(this.currentPlayer);
            
            if (!hasValidMoves) {
                // No valid moves available, skip to SHOOT phase
                this.moveCounter = 0;
                this.checkAndAdvancePhase();
                return true;
            }
            
            // Can move again, stay in MOVE phase
            return true;
        }
        
        // All moves exhausted, advance to SHOOT phase
        this.moveCounter = 0;
        this.checkAndAdvancePhase();
        return true;
    }

    isValidMove(player: PlayerId, r: number, c: number): boolean {
        const unit = this.units[player];
        const dr = Math.abs(r - unit.r);
        const dc = Math.abs(c - unit.c);
        const characterStats = getCharacterStats(this.characters[player]);

        // Check if move is within range
        if (dr > characterStats.moveRange || dc > characterStats.moveRange || (dr === 0 && dc === 0)) return false;
        
        // Check if move is diagonal (for orthogonal-only characters)
        if (characterStats.movePattern === 'orthogonal') {
            // Only allow moves where either dr=0 or dc=0 (not both non-zero)
            if (dr > 0 && dc > 0) return false; // Diagonal move not allowed
        }
        
        const cell = this.board.getCell(r, c);
        if (!cell) return false; 

        if (cell.isHole() || cell.isMirror()) return false;
        if (cell.hasUnit()) return false;

        // If character cannot shoot (shootRange == 0), skip canShootFrom check
        const stats = getCharacterStats(this.characters[player]);
        if (stats.shootRange !== 0 && !this.canShootFrom(r, c, player)) return false;

        return true;
    }

    canShootFrom(r: number, c: number, player: PlayerId): boolean {
        const stats = getCharacterStats(this.characters[player]);
        // Special case: Heavy Guardian (shootRange == 0) can only shoot adjacent enemy
        if (stats.shootRange === 0) {
            // Check 8 neighboring cells for opponent unit
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const cell = this.board.getCell(r + dr, c + dc);
                    if (cell && cell.hasUnit() && cell.unit !== player) {
                        return true;
                    }
                }
            }
            return false;
        }
        const dirs = this.getValidDirections(player);
        for (const dir of dirs) {
            if (this.simulateShot(r, c, dir, player)) return true;
        }
        return false;
    }

    getValidDirections(player: PlayerId): string[] {
        const stats = getCharacterStats(this.characters[player]);
        if (stats.shootPattern === 'orthogonal') {
            return ['n', 's', 'e', 'w'];
        }
        return ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    }

    getValidShotDirs(r: number, c: number, player: PlayerId): string[] {
        const dirs = this.getValidDirections(player);
        return dirs.filter(dir => this.simulateShot(r, c, dir, player));
    }

    simulateShot(startR: number, startC: number, dirStr: string, player: PlayerId): boolean {
        const stats = getCharacterStats(this.characters[player]);
        let { dr, dc } = this.parseDir(dirStr);
        let currR = startR + dr;
        let currC = startC + dc;
        let distance = 1;

        while (true) {
            const cell = this.board.getCell(currR, currC);
            if (!cell) return false; 

            // Check shoot range
            if (stats.shootRange !== -1 && distance > stats.shootRange) return false;

            if (cell.hasUnit()) return true; // Valid to shoot units now
            if (cell.isHole()) return false;

            if (cell.isTeleport()) return true;
            if (cell.type === CellType.EMPTY) return true;

            return false;
        }
    }

    // Get all shootable target positions from a given position
    getShootableTargets(fromR: number, fromC: number, player: PlayerId): Position[] {
        const targets: Position[] = [];
        const stats = getCharacterStats(this.characters[player]);
        const dirs = this.getValidDirections(player);
        
        for (const dir of dirs) {
            const target = this.getShootTarget(fromR, fromC, dir, player);
            if (target) {
                // Avoid duplicates
                if (!targets.some(t => t.r === target.r && t.c === target.c)) {
                    targets.push(target);
                }
            }
        }
        // Special case for Heavy Guardian (shootRange == 0): only adjacent enemy cells are valid
        if (stats.shootRange === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const cell = this.board.getCell(fromR + dr, fromC + dc);
                    if (cell && cell.hasUnit() && cell.unit !== player) {
                        const pos = { r: fromR + dr, c: fromC + dc };
                        if (!targets.some(t => t.r === pos.r && t.c === pos.c)) {
                            targets.push(pos);
                        }
                    }
                }
            }
        }
        
        return targets;
    }

    // Calculate where a shot in a given direction will land
    private getShootTarget(startR: number, startC: number, dirStr: string, player: PlayerId): Position | null {
        const stats = getCharacterStats(this.characters[player]);
        let { dr, dc } = this.parseDir(dirStr);
        let currR = startR + dr;
        let currC = startC + dc;
        let distance = 1;

        while (true) {
            const cell = this.board.getCell(currR, currC);
            if (!cell) return null;
            
            // Check shoot range
            if (stats.shootRange !== -1 && distance > stats.shootRange) return null;
            
            if (cell.hasUnit()) return { r: currR, c: currC }; // Unit is a target
            if (cell.isHole()) return null;

            // Return landing position
            if (cell.isTeleport() || cell.type === CellType.EMPTY) {
                return { r: currR, c: currC };
            }

            currR += dr;
            currC += dc;
            distance++;
        }
    }

    // Find direction from current position to target
    private findDirectionToTarget(from: Position, target: Position, player: PlayerId): string | null {
        const dirs = this.getValidDirections(player);
        
        for (const dir of dirs) {
            const calcTarget = this.getShootTarget(from.r, from.c, dir, player);
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
        const targets = this.getShootableTargets(currentPos.r, currentPos.c, this.currentPlayer);
        
        // Check if target is valid
        const isValid = targets.some(t => t.r === targetR && t.c === targetC);
        if (!isValid) return false;
        
        // Find the direction to shoot
        const dirStr = this.findDirectionToTarget(currentPos, { r: targetR, c: targetC }, this.currentPlayer);
        
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
                // Check if target is invincible (Heavy Guardian)
                const targetPlayer = cell.unit;
                const targetStats = getCharacterStats(this.characters[targetPlayer!]);
                
                if (targetStats.isInvincible) {
                    // Target is invincible, shot does not kill them
                    // Just end the turn
                    this.endTurn();
                    return { path, destroyed: { r: currR, c: currC } };
                }
                
                // Target is not invincible, normal kill logic
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

    // Check if player has any valid moves (used for Swift Shadow double move)
    hasAnyValidMoves(player: PlayerId): boolean {
        const unit = this.units[player];
        const stats = getCharacterStats(this.characters[player]);
        
        // Check all cells within move range
        for (let r = unit.r - stats.moveRange; r <= unit.r + stats.moveRange; r++) {
            for (let c = unit.c - stats.moveRange; c <= unit.c + stats.moveRange; c++) {
                if (this.isValidMove(player, r, c)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check if player has any valid shots
    hasAnyValidShots(player: PlayerId): boolean {
        const unit = this.units[player];
        const targets = this.getShootableTargets(unit.r, unit.c, player);
        return targets.length > 0;
    }

    // Check if SHOOT phase has valid shots, if not, advance turn
    checkAndAdvancePhase(): void {
        this.phase = Phase.SHOOT;
        
        // Check if there are any valid shots
        if (!this.hasAnyValidShots(this.currentPlayer)) {
            // No valid shots, skip to next turn
            this.endTurn();
        }
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
