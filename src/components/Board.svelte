<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import CellComponent from "./Cell.svelte";
  import { Phase } from "../lib/game/types";
  import type { Game } from "../lib/game/Game";

  export let game: Game;
  export let version: number;

  const dispatch = createEventDispatcher();

  // Responsive cell size calculation
  let windowWidth = typeof window !== "undefined" ? window.innerWidth : 1280;

  function handleResize() {
    windowWidth = window.innerWidth;
  }

  onMount(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      handleResize(); // Initial call
    }
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", handleResize);
    }
  });

  $: grid = version >= 0 ? game.board.grid : [];
  $: gridSize = game.board.size;

  $: cellSize = (() => {
    const baseSize = gridSize === 9 ? 50 : gridSize === 7 ? 60 : 70;

    // Mobile
    if (windowWidth <= 480) {
      const availableWidth = Math.min(windowWidth - 40, 400);
      return Math.floor(availableWidth / gridSize) - 4;
    }
    // Tablet
    else if (windowWidth <= 768) {
      return Math.floor(baseSize * 0.85);
    }
    // Desktop
    return baseSize;
  })();

  function checkMove(r: number, c: number, v: number): boolean {
    if (game.phase !== Phase.MOVE) return false;
    return game.isValidMove(game.currentPlayer, r, c);
  }

  function checkArrows(r: number, c: number, v: number): boolean {
    if (game.phase !== Phase.SHOOT) return false;
    const unit = game.units[game.currentPlayer];
    return unit.r === r && unit.c === c;
  }

  // Calculate shootable targets for SHOOT phase
  $: shootableTargets = (() => {
    if (game.phase !== Phase.SHOOT || version < 0) return [];
    const unit = game.units[game.currentPlayer];
    return game.getShootableTargets(unit.r, unit.c);
  })();

  function isShootableTarget(r: number, c: number, v: number): boolean {
    if (game.phase !== Phase.SHOOT || version < 0) return false;
    return shootableTargets.some((t) => t.r === r && t.c === c);
  }

  // New: Get valid shot directions for the current player
  function getValidDirs(r: number, c: number, v: number): string[] {
    if (game.phase !== Phase.SHOOT) return [];
    const unit = game.units[game.currentPlayer];
    if (unit.r === r && unit.c === c) {
      return game.getValidShotDirs(r, c);
    }
    return [];
  }
</script>

<div
  class="board"
  style="
        grid-template-columns: repeat({gridSize}, {cellSize}px);
        grid-template-rows: repeat({gridSize}, {cellSize}px);
    "
>
  {#each grid as row, r}
    {#each row as cell, c}
      <CellComponent
        {cell}
        {r}
        {c}
        isValidMove={checkMove(r, c, version)}
        isShootableTarget={isShootableTarget(r, c, version)}
        showArrows={checkArrows(r, c, version)}
        validShotDirs={getValidDirs(r, c, version)}
        on:click
        on:shoot
      />
    {/each}
  {/each}
</div>

<style>
  .board {
    display: grid;
    gap: 4px;
    padding: 10px;
    border: 2px solid #333;
    border-radius: 5px;
    background: #0a0a0a;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
    z-index: 2;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .board {
      gap: 3px;
      padding: 8px;
      border-width: 1px;
    }
  }

  @media (max-width: 480px) {
    .board {
      gap: 2px;
      padding: 5px;
      margin: 0 auto;
    }
  }
</style>
