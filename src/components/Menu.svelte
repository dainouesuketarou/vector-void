<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { network } from "../lib/network";

  const dispatch = createEventDispatcher();

  let mode: "menu" | "online_input" | "waiting" = "menu";
  let secretWord = "";
  let errorMsg = "";
  let myRole = 1;

  function startOffline() {
    dispatch("modeSelect", { mode: "offline" });
  }

  function showOnlineInput() {
    mode = "online_input";
  }

  function joinOnline() {
    if (secretWord.length < 3) {
      errorMsg = "合言葉は3文字以上にしてください";
      return;
    }
    // Simple hiragana check (optional, but requested)
    if (!/^[\u3040-\u309F]+$/.test(secretWord)) {
      errorMsg = "ひらがなのみ使用できます";
      return;
    }

    const socket = network.connect();
    socket.emit("join_room", secretWord);

    mode = "waiting";

    socket.on("room_full", () => {
      errorMsg = "その部屋は満員です";
      network.disconnect();
      mode = "online_input";
    });

    socket.on("player_joined", ({ role }) => {
      myRole = role;
    });

    socket.on("opponent_found", () => {
      dispatch("modeSelect", { mode: "online", secretWord, role: myRole });
    });
  }

  function backToMenu() {
    mode = "menu";
    errorMsg = "";
    secretWord = "";
    network.disconnect();
  }
</script>

<div class="menu-container">
  <h1 class="title">VECTOR VOID</h1>

  {#if mode === "menu"}
    <div class="buttons">
      <button class="cyber-btn" on:click={startOffline}>OFFLINE</button>
      <button class="cyber-btn" on:click={showOnlineInput}>ONLINE</button>
    </div>
  {:else if mode === "online_input"}
    <div class="input-group">
      <p>合言葉を入力してください (ひらがな3文字以上)</p>
      <input
        type="text"
        bind:value={secretWord}
        placeholder="あいう"
        maxlength="10"
      />
      {#if errorMsg}
        <p class="error">{errorMsg}</p>
      {/if}
      <div class="buttons">
        <button class="cyber-btn" on:click={joinOnline}>接続</button>
        <button class="cyber-btn secondary" on:click={backToMenu}>戻る</button>
      </div>
    </div>
  {:else if mode === "waiting"}
    <div class="waiting">
      <p>対戦相手を待っています...</p>
      <p class="word">合言葉: {secretWord}</p>
      <div class="loader"></div>
      <button class="cyber-btn secondary" on:click={backToMenu}
        >キャンセル</button
      >
    </div>
  {/if}
</div>

<style>
  .menu-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    z-index: 20;
  }

  .title {
    font-family: var(--font-display);
    font-size: 4rem;
    color: #fff;
    text-shadow:
      0 0 20px var(--p1-color),
      0 0 40px var(--p2-color);
    letter-spacing: 8px;
    animation: glitch 3s infinite;
  }

  .buttons {
    display: flex;
    gap: 20px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    color: #fff;
  }

  input {
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid var(--p1-color);
    color: #fff;
    padding: 10px 20px;
    font-size: 1.5rem;
    border-radius: 5px;
    text-align: center;
    outline: none;
  }

  input:focus {
    box-shadow: 0 0 15px var(--p1-color);
  }

  .error {
    color: #ff4444;
    font-size: 0.9rem;
  }

  .waiting {
    text-align: center;
    color: #fff;
  }

  .word {
    font-size: 1.5rem;
    color: var(--p1-color);
    margin: 10px 0;
  }

  .loader {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-left-color: var(--p1-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes glitch {
    0%,
    100% {
      text-shadow: 0 0 20px var(--p1-color);
    }
    50% {
      text-shadow:
        -2px 0 var(--p2-color),
        2px 0 var(--p1-color);
    }
  }
</style>
