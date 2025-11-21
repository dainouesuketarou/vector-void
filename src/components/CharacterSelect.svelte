<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { CharacterType, CHARACTERS } from "../lib/game/Character";
  import { network } from "../lib/network";

  export let playerId: number = 1;
  export let playerLabel: string = "Player 1";
  export let isOnline: boolean = false;
  export let secretWord: string = "";
  export let myPlayerId: number = 1;

  const dispatch = createEventDispatcher();

  let selectedCharacter: CharacterType = CharacterType.VOID_DRIFTER;
  let waitingForOpponent = false;

  onMount(() => {
    if (isOnline) {
      const socket = network.getSocket();
      if (socket) {
        socket.on("game_start", ({ p1Character, p2Character, mapId, seed }) => {
          // Dispatch to App.svelte with both characters
          dispatch("gameStart", { p1Character, p2Character });
        });
      }
    }
  });

  function selectCharacter(type: CharacterType) {
    selectedCharacter = type;
  }

  function confirmSelection() {
    if (isOnline) {
      waitingForOpponent = true;
      const socket = network.getSocket();
      socket?.emit("character_vote", {
        word: secretWord,
        character: selectedCharacter,
        playerId: myPlayerId,
      });
    } else {
      dispatch("select", { character: selectedCharacter });
    }
  }

  function goBack() {
    dispatch("back");
  }

  const characters = [
    CharacterType.VOID_DRIFTER,
    CharacterType.SWIFT_SHADOW,
    CharacterType.HEAVY_GUARDIAN,
  ];
</script>

<div class="bg-layer">
  <div class="grid-animation"></div>
</div>

<div class="character-select-container">
  <h1 class="title">キャラクター選択</h1>
  <h2 class="player-label">{playerLabel}</h2>

  <div class="characters-grid">
    {#each characters as charType}
      {@const stats = CHARACTERS[charType]}
      <button
        class="character-card cyber-card"
        class:selected={selectedCharacter === charType}
        on:click={() => selectCharacter(charType)}
      >
        <div class="character-visual {stats.visualShape} p{playerId}"></div>
        <h3>{stats.name}</h3>
        <p class="description">{stats.description}</p>
        <div class="stats">
          <div class="stat">
            <span class="label">移動:</span>
            <span class="value"
              >{stats.moveCount}回 x {stats.moveRange}マス</span
            >
          </div>
          <div class="stat">
            <span class="label">射程:</span>
            <span class="value"
              >{stats.shootRange === -1
                ? "無限"
                : `${stats.shootRange}マス`}</span
            >
          </div>
          <div class="stat">
            <span class="label">射向:</span>
            <span class="value"
              >{stats.shootPattern === "all" ? "8方向" : "4方向"}</span
            >
          </div>
        </div>
      </button>
    {/each}
  </div>

  <div class="button-group">
    <button class="cyber-btn back-btn" on:click={goBack}> ← 戻る </button>
    <button class="cyber-btn confirm-btn" on:click={confirmSelection}>
      決定
    </button>
  </div>

  {#if waitingForOpponent}
    <div class="waiting-overlay">
      <p>対戦相手の選択を待っています...</p>
      <div class="loader"></div>
    </div>
  {/if}
</div>

<style>
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

  .character-select-container {
    text-align: center;
    z-index: 20;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    max-height: 100vh;
    overflow-y: auto;
    width: 100%;
    gap: 20px; /* Re-added gap as it was likely intended to be kept */
    justify-content: center; /* Re-added justify-content as it was likely intended to be kept */
  }

  .title {
    font-family: var(--font-display);
    font-size: 3rem;
    color: #fff;
    text-shadow:
      0 0 20px var(--p1-color),
      0 0 40px var(--p2-color);
    letter-spacing: 8px;
    margin: 0;
  }

  .player-label {
    font-size: 1.5rem;
    color: var(--p1-color);
    margin: 0;
    text-shadow: 0 0 10px var(--p1-color);
  }

  .characters-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1000px;
    width: 100%;
  }

  .cyber-card {
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid var(--p1-color);
    border-radius: 10px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    position: relative;
    overflow: hidden;
  }

  .cyber-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 255, 255, 0.1),
      transparent
    );
    transition: left 0.5s;
  }

  .cyber-card:hover::before {
    left: 100%;
  }

  .cyber-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 0 20px var(--p1-color);
    border-color: var(--p2-color);
  }

  .cyber-card.selected {
    border-color: var(--highlight-color);
    box-shadow: 0 0 30px var(--highlight-glow);
    background: rgba(0, 255, 255, 0.1);
  }

  .character-visual {
    width: 80px;
    height: 80px;
    border: 3px solid;
    box-shadow: inset 0 0 15px currentColor;
    transition: all 0.3s ease;
  }

  .character-visual.circle {
    border-radius: 50%;
  }

  .character-visual.triangle {
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    border: none;
    background: currentColor;
  }

  .character-visual.square {
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

  .character-visual.p1 {
    color: var(--p1-color);
  }

  .character-visual.p2 {
    color: var(--p2-color);
  }

  .cyber-card.selected .character-visual {
    transform: scale(1.15);
    filter: drop-shadow(0 0 20px currentColor);
  }

  h3 {
    font-size: 1.3rem;
    margin: 0;
    color: white;
    font-family: var(--font-display);
  }

  .description {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    margin: 0;
    min-height: 3em;
    line-height: 1.4;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    background: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 5px;
    border: 1px solid rgba(0, 255, 255, 0.2);
  }

  .stat {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
  }

  .stat .label {
    color: rgba(255, 255, 255, 0.6);
  }

  .stat .value {
    color: var(--highlight-color);
    font-weight: bold;
  }

  .button-group {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .back-btn {
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .back-btn:hover {
    border-color: var(--p1-color);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .characters-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .character-select-container {
      padding: 10px;
      justify-content: flex-start;
    }

    .title {
      font-size: 2rem;
      letter-spacing: 4px;
      margin-top: 10px;
    }

    .player-label {
      font-size: 1.2rem;
    }

    .characters-grid {
      grid-template-columns: 1fr;
      max-width: 350px;
    }

    .character-visual {
      width: 60px;
      height: 60px;
    }

    h3 {
      font-size: 1.1rem;
    }

    .description {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .title {
      font-size: 1.5rem;
    }

    .character-visual {
      width: 50px;
      height: 50px;
    }
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
