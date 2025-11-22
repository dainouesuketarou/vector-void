<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { CellType, type MapConfig } from "../lib/game/types";
  import { network } from "../lib/network";

  export let isOnline: boolean = false;
  export let secretWord: string = "";
  export let onBack: () => void;

  const dispatch = createEventDispatcher();
  let waitingForOpponent = false;

  import { MAPS } from "../lib/game/Maps";

  let hoveredMap: MapConfig | null = null;

  onMount(() => {
    waitingForOpponent = false; // Reset state
    if (isOnline) {
      const socket = network.getSocket();
      if (socket) {
        console.log("StageSelect: Registering stage_selected listener");
        // Remove any existing listeners to avoid duplicates
        socket.off("stage_selected");
        socket.on("stage_selected", ({ mapId, seed }) => {
          console.log("StageSelect: Received stage_selected", { mapId, seed });
          const map = MAPS.find((m) => m.id === mapId);
          if (map) {
            dispatch("select", { map, seed });
          }
        });
      }
    }
  });

  onDestroy(() => {
    if (isOnline) {
      const socket = network.getSocket();
      if (socket) {
        console.log("StageSelect: Cleaning up stage_selected listener");
        socket.off("stage_selected");
      }
    }
  });

  function selectMap(map: MapConfig) {
    if (isOnline) {
      // waitingForOpponent = true; // Don't wait for opponent, go to character select immediately
      const socket = network.getSocket();
      socket?.emit("stage_vote", { word: secretWord, mapId: map.id });
      // Proceed immediately
      dispatch("select", { map, seed: Date.now() }); // Seed doesn't matter here for online, will be synced later
    } else {
      dispatch("select", { map, seed: Date.now() });
    }
  }
</script>

<!-- Background Preview / Animation -->
<div class="bg-layer">
  {#if hoveredMap}
    <div
      class="preview-grid"
      style="
                grid-template-columns: repeat({hoveredMap.size}, 1fr);
                grid-template-rows: repeat({hoveredMap.size}, 1fr);
            "
    >
      {#each hoveredMap.layout as row, r}
        {#each row as type, c}
          <div
            class="preview-cell"
            class:hole={type === CellType.HOLE}
            class:mirror={type === CellType.MIRROR_0 ||
              type === CellType.MIRROR_1}
          ></div>
        {/each}
      {/each}
    </div>
  {:else}
    <div class="grid-animation"></div>
  {/if}
</div>

<div class="stage-select">
  <h1 class="main-title">VECTOR VOID</h1>
  <h2>SELECT BATTLEFIELD</h2>
  <div class="grid">
    {#each MAPS as map}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="card"
        on:click={() => selectMap(map)}
        on:mouseenter={() => (hoveredMap = map)}
        on:mouseleave={() => (hoveredMap = null)}
      >
        <h3>{map.name}</h3>
        <p>{map.description}</p>
      </div>
    {/each}
  </div>

  <button class="cyber-btn back-btn" on:click={onBack}>戻る</button>

  {#if waitingForOpponent}
    <div class="waiting-overlay">
      <p>対戦相手の選択を待っています...</p>
      <div class="loader"></div>
    </div>
  {/if}
</div>

<style>
  .stage-select {
    text-align: center;
    z-index: 20;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .main-title {
    font-family: var(--font-display);
    font-size: 5rem;
    color: #fff;
    text-shadow:
      0 0 20px var(--p1-color),
      0 0 40px var(--p2-color);
    margin-bottom: 10px;
    letter-spacing: 10px;
    animation: glitch 2s infinite;
  }
  h2 {
    font-family: var(--font-display);
    color: #888;
    letter-spacing: 5px;
    margin-bottom: 40px;
  }
  .grid {
    display: flex;
    gap: 20px;
    justify-content: center;
  }
  .card {
    background: rgba(17, 17, 17, 0.9);
    border: 2px solid #333;
    padding: 20px;
    width: 240px;
    cursor: pointer;
    transition: all 0.3s;
    backdrop-filter: blur(5px);
  }
  .card:hover {
    border-color: var(--p1-color);
    transform: translateY(-5px);
    box-shadow: 0 0 20px var(--p1-glow);
  }
  h3 {
    font-family: var(--font-display);
    color: var(--p1-color);
    margin-bottom: 10px;
    font-size: 1.2rem;
  }
  p {
    color: #ccc;
    font-size: 0.9rem;
  }

  /* Background Layer */
  .bg-layer {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%);
  }
  .preview-grid {
    display: grid;
    gap: 10px;
    width: 80vmin;
    height: 80vmin;
    transform: perspective(1000px) rotateX(20deg) scale(1.2);
    opacity: 0.3;
  }
  .preview-cell {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .preview-cell.hole {
    background: #000;
  }
  .preview-cell.mirror {
    background: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }

  .grid-animation {
    width: 200%;
    height: 200%;
    background-image: linear-gradient(
        rgba(0, 255, 255, 0.1) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 50px 50px;
    transform: perspective(500px) rotateX(60deg);
    animation: moveGrid 10s linear infinite;
    opacity: 0.5;
  }

  @keyframes moveGrid {
    0% {
      transform: perspective(500px) rotateX(60deg) translateY(0);
    }
    100% {
      transform: perspective(500px) rotateX(60deg) translateY(50px);
    }
  }
  @keyframes glitch {
    0% {
      text-shadow: 0 0 20px var(--p1-color);
    }
    20% {
      text-shadow:
        -2px 0 var(--p2-color),
        2px 0 var(--p1-color);
    }
    40% {
      text-shadow: 0 0 20px var(--p1-color);
    }
    100% {
      text-shadow: 0 0 20px var(--p1-color);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .main-title {
      font-size: 3rem;
      letter-spacing: 5px;
      margin-bottom: 15px;
    }

    h2 {
      font-size: 1rem;
      letter-spacing: 3px;
      margin-bottom: 20px;
    }

    .grid {
      flex-direction: column;
      gap: 15px;
      width: 100%;
      max-width: 350px;
      padding: 0 10px;
    }

    .card {
      width: 100%;
      max-width: 100%;
      padding: 18px;
    }

    .preview-grid {
      width: 70vmin;
      height: 70vmin;
    }
  }

  @media (max-width: 480px) {
    .main-title {
      font-size: 2.2rem;
      letter-spacing: 3px;
    }

    h2 {
      font-size: 0.9rem;
      letter-spacing: 2px;
    }

    .card {
      padding: 15px;
    }

    h3 {
      font-size: 1rem;
    }

    p {
      font-size: 0.85rem;
    }

    .preview-grid {
      width: 60vmin;
      height: 60vmin;
    }
  }

  .back-btn {
    margin-top: 40px;
  }

  .waiting-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 100;
    color: #fff;
    font-size: 1.5rem;
  }

  .loader {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-left-color: var(--p1-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-top: 20px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
