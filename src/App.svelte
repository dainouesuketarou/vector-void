<script lang="ts">
  import Menu from "./components/Menu.svelte";
  import StageSelect from "./components/StageSelect.svelte";
  import CharacterSelect from "./components/CharacterSelect.svelte";
  import GameView from "./components/GameView.svelte";
  import type { MapConfig } from "./lib/game/types";
  import { CharacterType } from "./lib/game/Character";
  import { network } from "./lib/network";
  import "./assets/global.css";

  let appState:
    | "menu"
    | "stage_select"
    | "character_select" // Online: both players see this
    | "character_select_p1" // Offline only
    | "character_select_p2" // Offline only
    | "game" = "menu";
  let currentMap: MapConfig | null = null;
  let isOnline = false;
  let secretWord = "";
  let myPlayerId = 1;
  let seed = 0;
  let p1Character: CharacterType = CharacterType.VOID_DRIFTER;
  let p2Character: CharacterType = CharacterType.VOID_DRIFTER;

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

    if (isOnline) {
      // Online: go directly to character select (both players)
      appState = "character_select";
    } else {
      // Offline: go to P1 select first
      appState = "character_select_p1";
    }
  }

  function handleP1CharacterSelect(e: CustomEvent) {
    p1Character = e.detail.character;
    // Online mode: only one player selects their own character
    if (isOnline) {
      if (myPlayerId === 1) {
        // I am P1, my character is selected
        // Wait for P2 or start game if I'm P2
        appState = "character_select_p2"; // Actually we need to sync this
      } else {
        // I am P2, go directly to P2 select
        appState = "character_select_p2";
      }
    } else {
      // Offline mode: go to P2 select
      appState = "character_select_p2";
    }
  }

  function handleP2CharacterSelect(e: CustomEvent) {
    p2Character = e.detail.character;
    appState = "game";
  }

  function handleCharacterSelectBack() {
    // Return to stage select
    appState = "stage_select";
    p1Character = CharacterType.VOID_DRIFTER;
    p2Character = CharacterType.VOID_DRIFTER;
  }

  function handleGameStart(e: CustomEvent) {
    // Online mode: server sends both characters
    p1Character = e.detail.p1Character;
    p2Character = e.detail.p2Character;
    appState = "game";
  }

  function handleBack() {
    appState = "menu";
    currentMap = null;
    isOnline = false;
    p1Character = CharacterType.VOID_DRIFTER;
    p2Character = CharacterType.VOID_DRIFTER;
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
  {:else if appState === "character_select"}
    <CharacterSelect
      playerId={myPlayerId}
      playerLabel={`Player ${myPlayerId}`}
      {isOnline}
      {secretWord}
      {myPlayerId}
      on:gameStart={handleGameStart}
      on:back={handleCharacterSelectBack}
    />
  {:else if appState === "character_select_p1"}
    <CharacterSelect
      playerId={1}
      playerLabel="Player 1"
      on:select={handleP1CharacterSelect}
      on:back={handleCharacterSelectBack}
    />
  {:else if appState === "character_select_p2"}
    <CharacterSelect
      playerId={2}
      playerLabel="Player 2"
      on:select={handleP2CharacterSelect}
      on:back={handleCharacterSelectBack}
    />
  {:else if appState === "game" && currentMap}
    <GameView
      mapConfig={currentMap}
      {isOnline}
      {myPlayerId}
      {secretWord}
      {seed}
      {p1Character}
      {p2Character}
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
