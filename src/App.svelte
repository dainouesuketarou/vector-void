<script lang="ts">
  import Menu from "./components/Menu.svelte";
  import StageSelect from "./components/StageSelect.svelte";
  import GameView from "./components/GameView.svelte";
  import type { MapConfig } from "./lib/game/types";
  import { network } from "./lib/network";
  import "./assets/global.css";

  let appState: "menu" | "stage_select" | "game" = "menu";
  let currentMap: MapConfig | null = null;
  let isOnline = false;
  let secretWord = "";
  let myPlayerId = 1;
  let seed = 0;

  function handleModeSelect(e: CustomEvent) {
    const { mode, secretWord: word, role } = e.detail;
    if (mode === "online") {
      isOnline = true;
      secretWord = word;
      myPlayerId = role;
    } else {
      isOnline = false;
      myPlayerId = 1;
    }
    appState = "stage_select";
  }

  // Temporary fix: We need to capture the role in Menu and pass it.
  // For now let's assume P1 if we created the room? No, that's not guaranteed.
  // Let's just update Menu.svelte to dispatch the role.

  function handleStageSelect(e: CustomEvent) {
    currentMap = e.detail.map;
    seed = e.detail.seed;
    appState = "game";
  }

  function handleBack() {
    appState = "menu";
    currentMap = null;
    isOnline = false;
    network.disconnect();
  }
</script>

<main>
  {#if appState === "menu"}
    <Menu on:modeSelect={handleModeSelect} />
  {:else if appState === "stage_select"}
    <StageSelect
      {isOnline}
      {secretWord}
      on:select={handleStageSelect}
      onBack={handleBack}
    />
  {:else if appState === "game" && currentMap}
    <GameView
      mapConfig={currentMap}
      {isOnline}
      {myPlayerId}
      {secretWord}
      {seed}
      onBack={handleBack}
    />
  {/if}
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
