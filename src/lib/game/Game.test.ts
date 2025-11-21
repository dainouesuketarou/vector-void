import { describe, it, expect } from 'vitest';
import { Game } from './Game';
import { CellType, PlayerId, Phase } from './types';

describe('Vector Void Game Logic', () => {
    const mockMap = {
        id: 'test',
        name: 'Test Map',
        description: 'Test',
        size: 5,
        layout: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ].map(r => r.map(c => c as CellType))
    };

    it('should initialize correctly', () => {
        const game = new Game(mockMap);
        expect(game.currentPlayer).toBe(PlayerId.P1);
        expect(game.phase).toBe(Phase.MOVE);
    });

    it('should enforce Must Destroy rule (cannot shoot wall)', () => {
        const game = new Game(mockMap);
        // P1 at (0,0). North is wall.
        expect(game.simulateShot(0, 0, 'n')).toBe(false);
        // East is empty.
        expect(game.simulateShot(0, 0, 'e')).toBe(true);
    });

    it('should enforce Must Destroy rule (cannot shoot hole)', () => {
        const game = new Game(mockMap);
        // Make (0,1) a hole
        game.board.grid[0][1].type = CellType.HOLE;
        // P1 at (0,0). East shot hits hole.
        expect(game.simulateShot(0, 0, 'e')).toBe(false);
    });

    it('should return correct valid shot directions', () => {
        const game = new Game(mockMap);
        // P1 at (0,0).
        // Valid: s, e, se.
        // Invalid: n, w, nw, ne, sw (walls).
        const dirs = game.getValidShotDirs(0, 0);
        expect(dirs).toContain('s');
        expect(dirs).toContain('e');
        expect(dirs).toContain('se');
        expect(dirs).not.toContain('n');
        expect(dirs).not.toContain('w');
    });

    it('should respawn teleport when destroyed', () => {
        const game = new Game(mockMap);
        // Force place teleport at (0,1)
        game.board.grid[0][1].type = CellType.TELEPORT;
        game.board.grid[0][1].teleportId = 0;
        game.board.teleporters[0] = { r: 0, c: 1 };

        // Shoot it from (0,0)
        game.phase = Phase.SHOOT;
        game.shoot('e');

        // (0,1) should be hole
        expect(game.board.grid[0][1].type).toBe(CellType.HOLE);
        
        // Should have found a new spot for teleportId 0
        const newTeleport = game.board.grid.flat().find(c => c.isTeleport() && c.teleportId === 0);
        expect(newTeleport).toBeDefined();
    });
});
