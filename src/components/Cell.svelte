<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { CellType, PlayerId } from "../lib/game/types";
  import type { Cell } from "../lib/game/Cell";

  export let cell: Cell;
  export let r: number;
  export let c: number;
  export let isValidMove: boolean = false;
  export let showArrows: boolean = false;
  export let validShotDirs: string[] = [];
  export let isShootableTarget: boolean = false; // NEW: for target-based shooting

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch("click", { r, c });
  }

  function handleArrowInteraction(dir: string, e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    e.preventDefault();
    dispatch("shoot", { dir });
  }

  // Only show arrows that are in the valid list
  $: visibleDirs = showArrows ? validShotDirs : [];
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="cell"
  class:hole={cell.type === CellType.HOLE}
  class:valid-move={isValidMove}
  class:shootable-target={isShootableTarget}
  on:click={handleClick}
>
  {#if cell.type === CellType.MIRROR_0}
    <div class="mirror type-0"></div>
  {:else if cell.type === CellType.MIRROR_1}
    <div class="mirror type-1"></div>
  {:else if cell.type === CellType.TELEPORT}
    <div class="teleport" class:active={cell.hasUnit()}></div>
  {/if}

  {#if cell.unit}
    <div
      class="unit"
      class:p1={cell.unit === PlayerId.P1}
      class:p2={cell.unit === PlayerId.P2}
    ></div>

    {#if showArrows}
      <div class="arrow-container">
        {#each visibleDirs as dir}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="arrow {dir}"
            role="button"
            tabindex="0"
            on:mousedown|stopPropagation={(e) => handleArrowInteraction(dir, e)}
            on:touchstart|stopPropagation|preventDefault={(e) =>
              handleArrowInteraction(dir, e)}
          ></div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .cell {
    width: 100%;
    height: 100%;
    background-color: var(--grid-color);
    border: 1px solid #2a2a2a;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
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

  .cell.shootable-target {
    background: linear-gradient(
      135deg,
      rgba(255, 51, 51, 0.3),
      rgba(255, 102, 102, 0.3)
    );
    border-color: var(--laser-color);
    box-shadow: 0 0 15px rgba(255, 51, 51, 0.5);
    animation: pulse-target 1.5s ease-in-out infinite;
  }

  .cell.shootable-target::before {
    content: "🎯";
    position: absolute;
    font-size: 1.8rem;
    z-index: 2;
    animation: float-target 2s ease-in-out infinite;
  }

  @keyframes pulse-target {
    0%,
    100% {
      box-shadow: 0 0 15px rgba(255, 51, 51, 0.5);
    }
    50% {
      box-shadow: 0 0 25px rgba(255, 51, 51, 0.8);
    }
  }

  @keyframes float-target {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }

  .unit {
    width: 60%;
    height: 60%;
    border-radius: 50%;
    border: 3px solid currentColor;
    box-shadow: inset 0 0 10px currentColor;
    z-index: 3; /* Above teleport */
    position: relative;
  }
  .p1 {
    color: var(--p1-color);
  }
  .p2 {
    color: var(--p2-color);
  }

  .mirror {
    width: 60%;
    height: 60%;
    position: relative;
    z-index: 1;
  }
  .mirror::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 4px;
    background-color: #fff;
    box-shadow: 0 0 10px #fff;
  }
  .mirror.type-0::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }
  .mirror.type-1::after {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  .teleport {
    width: 70%;
    height: 70%;
    border: 2px dashed var(--teleport-color);
    border-radius: 50%;
    animation: spin 4s linear infinite;
    position: absolute;
    z-index: 1;
  }
  .teleport.active {
    width: 90%;
    height: 90%;
    border-style: solid;
    border-width: 1px;
    box-shadow: 0 0 15px var(--teleport-color);
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

  .arrow-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }
  .arrow {
    position: absolute;
    width: 35px;
    height: 35px;
    background: linear-gradient(135deg, #ff3333, #ff6666);
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    opacity: 0.95;
    cursor: pointer;
    pointer-events: auto;
    box-shadow:
      0 0 15px rgba(255, 51, 51, 0.8),
      0 0 25px rgba(255, 51, 51, 0.4);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    animation: pulse-arrow 2s ease-in-out infinite;
  }

  .arrow:hover {
    opacity: 1;
    transform: scale(1.3);
    box-shadow:
      0 0 25px rgba(255, 51, 51, 1),
      0 0 35px rgba(255, 51, 51, 0.6);
    background: linear-gradient(135deg, #ff4444, #ff7777);
  }

  .arrow:active {
    transform: scale(1.1);
    opacity: 1;
  }

  @keyframes pulse-arrow {
    0%,
    100% {
      opacity: 0.9;
      box-shadow:
        0 0 15px rgba(255, 51, 51, 0.8),
        0 0 25px rgba(255, 51, 51, 0.4);
    }
    50% {
      opacity: 1;
      box-shadow:
        0 0 25px rgba(255, 51, 51, 1),
        0 0 35px rgba(255, 51, 51, 0.6);
    }
  }

  .arrow.n {
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
  }
  .arrow.n:hover {
    transform: translateX(-50%) scale(1.3);
  }

  .arrow.s {
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
  }
  .arrow.s:hover {
    transform: translateX(-50%) rotate(180deg) scale(1.3);
  }

  .arrow.e {
    right: -15px;
    top: 50%;
    transform: translateY(-50%) rotate(90deg);
  }
  .arrow.e:hover {
    transform: translateY(-50%) rotate(90deg) scale(1.3);
  }

  .arrow.w {
    left: -15px;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
  }
  .arrow.w:hover {
    transform: translateY(-50%) rotate(-90deg) scale(1.3);
  }

  .arrow.ne {
    top: -8px;
    right: -8px;
    transform: rotate(45deg);
  }
  .arrow.ne:hover {
    transform: rotate(45deg) scale(1.3);
  }

  .arrow.nw {
    top: -8px;
    left: -8px;
    transform: rotate(-45deg);
  }
  .arrow.nw:hover {
    transform: rotate(-45deg) scale(1.3);
  }

  .arrow.se {
    bottom: -8px;
    right: -8px;
    transform: rotate(135deg);
  }
  .arrow.se:hover {
    transform: rotate(135deg) scale(1.3);
  }

  .arrow.sw {
    bottom: -8px;
    left: -8px;
    transform: rotate(-135deg);
  }
  .arrow.sw:hover {
    transform: rotate(-135deg) scale(1.3);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .arrow {
      width: 40px;
      height: 40px;
    }
  }

  @media (max-width: 480px) {
    .arrow {
      width: 45px;
      height: 45px;
    }

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

  /* Disable hover on touch devices */
  @media (hover: none) {
    .cell:hover {
      background-color: var(--grid-color);
    }

    .arrow:hover {
      opacity: 0.6;
      transform: none;
    }
  }
</style>
