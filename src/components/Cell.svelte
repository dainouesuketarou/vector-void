<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { CellType, PlayerId } from "../lib/game/types";
  import type { Cell } from "../lib/game/Cell";

  export let cell: Cell;
  export let r: number;
  export let c: number;
  export let canMove: boolean = false;
  export let isShootable: boolean = false;
  export let teleportPairId: number | null = null;
  export let isDestroyed: boolean = false;
  export let myPlayerId: number = 1;
  export let isMyUnit: boolean = false;
  export let p1CharacterShape: string = "circle";
  export let p2CharacterShape: string = "circle";

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch("click", { r, c });
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="cell"
  class:hole={cell.type === CellType.HOLE}
  class:valid-move={canMove}
  class:shootable-target={isShootable}
  class:destroyed={isDestroyed}
  class:my-unit={isMyUnit}
  role="button"
  tabindex="0"
  on:click={handleClick}
  on:keydown={(e) => e.key === "Enter" && handleClick()}
>
  {#if cell.type === CellType.TELEPORT}
    <div
      class="teleport"
      class:active={cell.hasUnit()}
      class:pair-0={teleportPairId === 0}
      class:pair-1={teleportPairId === 1}
      class:pair-2={teleportPairId === 2}
    ></div>
  {/if}

  {#if cell.unit}
    {@const shape =
      cell.unit === PlayerId.P1 ? p1CharacterShape : p2CharacterShape}
    <div
      class="unit {shape}"
      class:p1={cell.unit === PlayerId.P1}
      class:p2={cell.unit === PlayerId.P2}
    ></div>
  {/if}

  {#if isDestroyed}
    <div class="explosion"></div>
  {/if}
</div>

<style>
  .cell {
    aspect-ratio: 1;
    position: relative;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .cell.my-unit {
    box-shadow:
      0 0 15px rgba(255, 255, 255, 0.6),
      inset 0 0 15px rgba(255, 255, 255, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.8);
    animation: my-unit-pulse 2s ease-in-out infinite;
  }

  @keyframes my-unit-pulse {
    0%,
    100% {
      box-shadow:
        0 0 15px rgba(255, 255, 255, 0.6),
        inset 0 0 15px rgba(255, 255, 255, 0.3);
    }
    50% {
      box-shadow:
        0 0 25px rgba(255, 255, 255, 0.8),
        inset 0 0 20px rgba(255, 255, 255, 0.5);
    }
  }

  .cell:hover {
    background-color: #252525;
  }

  .cell.hole {
    background-color: var(--void-color);
    border-color: #000;
    box-shadow: inset 0 0 15px #000;
    cursor: default;
  }

  .cell.valid-move::after {
    content: "";
    width: 10px;
    height: 10px;
    background-color: var(--highlight-color);
    border-radius: 50%;
    box-shadow: 0 0 5px var(--highlight-glow);
    opacity: 0.7;
  }

  /* Shootable Target Styling (Cooler) */
  .cell.shootable-target {
    background: rgba(255, 51, 51, 0.1);
    box-shadow: inset 0 0 20px rgba(255, 51, 51, 0.3);
    border: 1px solid rgba(255, 51, 51, 0.5);
  }

  .cell.shootable-target::before {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    background:
      linear-gradient(to right, rgba(255, 51, 51, 0.8) 2px, transparent 2px) 0 0,
      linear-gradient(to right, rgba(255, 51, 51, 0.8) 2px, transparent 2px)
        100% 0,
      linear-gradient(to bottom, rgba(255, 51, 51, 0.8) 2px, transparent 2px) 0
        0,
      linear-gradient(to bottom, rgba(255, 51, 51, 0.8) 2px, transparent 2px) 0
        100%;
    background-size: 10px 10px;
    background-repeat: no-repeat;
    animation: target-lock 1s infinite alternate;
  }

  .cell.shootable-target::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 6px;
    background-color: rgba(255, 51, 51, 0.8);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255, 51, 51, 1);
  }

  @keyframes target-lock {
    0% {
      transform: scale(0.9);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .unit {
    width: 60%;
    height: 60%;
    border-radius: 50%;
    border: 3px solid currentColor;
    box-shadow: inset 0 0 10px currentColor;
    z-index: 3;
    position: relative;
  }

  .unit.triangle {
    border-radius: 0;
    border: none;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    background: currentColor;
    box-shadow: 0 0 10px currentColor;
  }

  .unit.square {
    border-radius: 8px;
    clip-path: polygon(
      30% 0%,
      70% 0%,
      100% 30%,
      100% 70%,
      70% 100%,
      30% 100%,
      0% 70%,
      0% 30%
    );
  }

  .p1 {
    color: var(--p1-color);
  }
  .p2 {
    color: var(--p2-color);
  }

  /* Teleporter Styles */
  .teleport {
    width: 70%;
    height: 70%;
    border: 2px dashed;
    border-radius: 50%;
    animation: spin 4s linear infinite;
    position: absolute;
    z-index: 1;
  }

  .teleport.pair-0 {
    border-color: #00ff00;
    box-shadow: 0 0 5px #00ff00;
  } /* Green */
  .teleport.pair-1 {
    border-color: #ffff00;
    box-shadow: 0 0 5px #ffff00;
  } /* Yellow */
  .teleport.pair-2 {
    border-color: #ff00ff;
    box-shadow: 0 0 5px #ff00ff;
  } /* Magenta (reuse but distinct context) */

  .teleport.active {
    width: 90%;
    height: 90%;
    border-style: solid;
    border-width: 1px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }
  @keyframes pulse {
    0% {
      transform: scale(0.9);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.05);
      opacity: 1;
    }
    100% {
      transform: scale(0.9);
      opacity: 0.7;
    }
  }

  /* Destruction Animation */
  .explosion {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle,
      rgba(255, 200, 0, 1) 0%,
      rgba(255, 50, 0, 0.8) 40%,
      transparent 70%
    );
    z-index: 10;
    animation: explode 0.8s ease-out forwards;
    pointer-events: none;
  }

  @keyframes explode {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0;
    }
  }

  /* Responsive Design */
  @media (max-width: 480px) {
    .cell.valid-move::after {
      width: 8px;
      height: 8px;
    }
    .unit {
      width: 65%;
      height: 65%;
      border-width: 2px;
    }
    .mirror {
      width: 55%;
      height: 55%;
    }
  }

  @media (hover: none) {
    .cell:hover {
      background-color: var(--grid-color);
    }
  }
</style>
