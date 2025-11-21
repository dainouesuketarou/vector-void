<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import BoardComponent from "./Board.svelte";
  import GameOver from "./GameOver.svelte";
  import { Game } from "../lib/game/Game";
  import { CellType, Phase, type MapConfig } from "../lib/game/types";
  import { network } from "../lib/network";

  export let mapConfig: MapConfig;
  export let onBack: () => void;
  export let isOnline: boolean = false;
  export let myPlayerId: number = 1;
  export let secretWord: string = "";
  export let seed: number = Date.now();

  let game: Game;
  let version = 0; // To force re-render
  let statusMsg = "システム起動中...";
  let destroyedPos: { r: number; c: number } | null = null;
  let timeLeft = 30;
  let timerInterval: any;

  onMount(() => {
    startNewGame();
    resetTimer();

    if (isOnline) {
      const socket = network.getSocket();
      if (socket) {
        socket.on("action", ({ type, data }) => {
          if (type === "move") {
            game.move(data.r, data.c);
            playSound("move");
            resetTimer(); // Reset timer on opponent move
          } else if (type === "shoot_target") {
            const result = game.shootTarget(data.r, data.c);
            if (result) {
              playSound("shoot");
              triggerDestruction({ r: data.r, c: data.c });
              playSound("destroy");
            }
            resetTimer(); // Reset timer on opponent shoot
          } else if (type === "time_out") {
            // Opponent timed out
            game.handleTimeout();
            updateStatus();
            clearInterval(timerInterval);
          }
          updateStatus();
          version++;
        });

        socket.on("game_reset", ({ seed: newSeed }) => {
          // Received reset from server
          console.log("Received game_reset with seed:", newSeed);
          game = new Game(mapConfig, newSeed);
          destroyedPos = null;
          resetTimer();
          updateStatus();
          version++;
        });

        socket.on("opponent_disconnected", () => {
          alert("対戦相手との接続が切断されました。メニューに戻ります。");
          onBack();
        });
      }
    }
  });

  onDestroy(() => {
    clearInterval(timerInterval);
    if (isOnline) {
      const socket = network.getSocket();
      socket?.off("action");
      socket?.off("opponent_disconnected");
    }
  });

  function startNewGame() {
    // For online mode, emit reset request to server
    if (isOnline && game) {
      network.getSocket()?.emit("reset_game", { word: secretWord });
      // Wait for server to broadcast game_reset event
      return;
    }

    // For offline mode or initial game creation
    if (game) {
      const newSeed = Math.floor(Math.random() * 1000000);
      game = new Game(mapConfig, newSeed);
    } else {
      game = new Game(mapConfig, seed);
    }

    destroyedPos = null;
    resetTimer();
    updateStatus();
    version++;
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 30;
    if (!game.gameOver) {
      timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          handleTimeout();
        }
      }, 1000);
    }
  }

  function handleTimeout() {
    game.handleTimeout();
    updateStatus();
    version++;

    if (isOnline && game.currentPlayer === myPlayerId) {
      // Notify opponent that I timed out
      network.getSocket()?.emit("action", {
        word: secretWord,
        type: "time_out",
        data: {},
      });
    }
  }

  function triggerDestruction(pos: { r: number; c: number }) {
    destroyedPos = pos;
    setTimeout(() => {
      destroyedPos = null;
    }, 1000); // 1s animation
  }

  function handleCellClick(e: CustomEvent) {
    const { r, c } = e.detail;
    console.log("[DEBUG] handleCellClick called:", {
      r,
      c,
      phase: game.phase,
      currentPlayer: game.currentPlayer,
      myPlayerId,
    });

    if (game.gameOver) return;

    // Online check: Is it my turn?
    if (isOnline && game.currentPlayer !== myPlayerId) {
      return;
    }

    let actionTaken = false;

    if (game.phase === Phase.MOVE) {
      // Handle move
      const moveResult = game.move(r, c);
      console.log("[DEBUG] Move attempt result:", moveResult);
      if (moveResult) {
        playSound("move");
        if (isOnline) {
          network.getSocket()?.emit("action", {
            word: secretWord,
            type: "move",
            data: { r, c },
          });
        }
        actionTaken = true;
      }
    } else if (game.phase === Phase.SHOOT) {
      // Handle shoot target selection
      if (game.shootTarget(r, c)) {
        playSound("shoot");
        playSound("destroy");
        triggerDestruction({ r, c });

        if (isOnline) {
          network.getSocket()?.emit("action", {
            word: secretWord,
            type: "shoot_target",
            data: { r, c },
          });
        }
        actionTaken = true;
      }
    }

    if (actionTaken) {
      updateStatus();
      version++;
      console.log("[DEBUG] Action taken, version incremented to:", version);
      resetTimer(); // Reset timer after my action
    }
  }

  function updateStatus() {
    console.log(
      "[DEBUG] updateStatus called - gameOver:",
      game.gameOver,
      "winner:",
      game.winner
    );
    if (game.gameOver) {
      statusMsg = `ゲーム終了 - プレイヤー ${game.winner} の勝利`;
      // Play victory or defeat sound based on who won
      if (game.winner === myPlayerId) {
        playSound("victory");
      } else {
        playSound("defeat");
      }
    } else {
      const phaseText = game.phase === Phase.MOVE ? "移動" : "攻撃";
      const color = game.currentPlayer === 1 ? "シアン" : "マゼンタ";
      statusMsg = `プレイヤー ${game.currentPlayer} (${color}) - ${phaseText}フェーズ`;
    }
  }

  function getWinnerColor(): string {
    if (game.winner === 1) return "#00f3ff"; // Cyan
    if (game.winner === 2) return "#ff00ff"; // Magenta
    return "#fff";
  }

  // Simple Audio (Ported)
  let audioCtx: AudioContext;
  function playSound(type: string) {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;

    if (type === "move") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "shoot") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "destroy") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "victory") {
      // Victory fanfare - triumphant melody
      const notes = [
        { freq: 523, time: 0, duration: 0.15 }, // C5
        { freq: 659, time: 0.15, duration: 0.15 }, // E5
        { freq: 784, time: 0.3, duration: 0.15 }, // G5
        { freq: 1047, time: 0.45, duration: 0.4 }, // C6 (hold)
      ];

      notes.forEach((note) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.time);
        gain.gain.setValueAtTime(0.2, now + note.time);
        gain.gain.linearRampToValueAtTime(0, now + note.time + note.duration);
        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration);
      });
    } else if (type === "defeat") {
      // Defeat sound - descending tones
      const notes = [
        { freq: 400, time: 0, duration: 0.2 },
        { freq: 300, time: 0.15, duration: 0.2 },
        { freq: 200, time: 0.3, duration: 0.3 },
      ];

      notes.forEach((note) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(note.freq, now + note.time);
        gain.gain.setValueAtTime(0.15, now + note.time);
        gain.gain.linearRampToValueAtTime(0, now + note.time + note.duration);
        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration);
      });
    }
  }
</script>

<div class="game-view">
  <header>
    <h1>VECTOR VOID</h1>
  </header>

  {#if game}
    <div class="status-bar">
      {#if isOnline}
        <div class="player-info">
          <span class="you-label">YOU:</span>
          <span
            class="player-color"
            class:p1={myPlayerId === 1}
            class:p2={myPlayerId === 2}
          >
            PLAYER {myPlayerId}
          </span>
        </div>
      {/if}

      <div class="turn-info">
        {#if game.gameOver}
          <span class="game-over">GAME OVER</span>
        {:else}
          <div
            class="player-badge"
            class:p1={game.currentPlayer === 1}
            class:p2={game.currentPlayer === 2}
          >
            {game.currentPlayer === 1 ? "PLAYER 1" : "PLAYER 2"}
          </div>
          <div class="phase-badge">
            {game.phase === Phase.MOVE ? "MOVE" : "SHOOT"}
          </div>
          {#if isOnline}
            <div
              class="turn-badge"
              class:your-turn={game.currentPlayer === myPlayerId}
              class:opponent-turn={game.currentPlayer !== myPlayerId}
            >
              {game.currentPlayer === myPlayerId
                ? "YOUR TURN"
                : "OPPONENT'S TURN"}
            </div>
          {/if}
        {/if}
      </div>

      {#if !game.gameOver}
        <div class="timer-container" class:warning={timeLeft <= 10}>
          <div class="timer-bar">
            <div
              class="timer-fill"
              style="width: {(timeLeft / 30) *
                100}%; background-color: {game.currentPlayer === 1
                ? 'var(--p1-color)'
                : 'var(--p2-color)'}"
            ></div>
          </div>
          <div class="timer-text">
            {timeLeft}<span class="unit">s</span>
          </div>
        </div>
      {/if}

      <div class="message">{statusMsg}</div>
    </div>
    <BoardComponent
      {game}
      {version}
      {destroyedPos}
      {myPlayerId}
      on:click={handleCellClick}
    />

    {#if game.gameOver}
      <GameOver
        winner={game.winner}
        winnerColor={getWinnerColor()}
        {myPlayerId}
        on:restart={startNewGame}
        on:menu={onBack}
      />
    {/if}
  {/if}

  <div class="controls">
    {#if game && game.gameOver}
      <button class="cyber-btn" on:click={startNewGame}>リセット</button>
    {/if}
    <button class="cyber-btn" on:click={onBack}>メニュー</button>
  </div>
</div>

<style>
  .game-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    z-index: 10;
    min-height: 100vh;
    padding: 10px 0;
    box-sizing: border-box;
    overflow-y: auto;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    background: linear-gradient(90deg, var(--p1-color), #fff, var(--p2-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0;
    padding: 5px 0;
  }
  .controls {
    display: flex;
    gap: 15px;
    margin-top: 10px;
  }

  .status-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin-bottom: 10px;
    padding: 10px;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid #333;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .you-label {
    font-family: var(--font-display);
    font-size: 0.9rem;
    color: #888;
    letter-spacing: 2px;
  }

  .player-color {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: bold;
    text-shadow: 0 0 10px currentColor;
  }

  .player-color.p1 {
    color: var(--p1-color);
  }

  .player-color.p2 {
    color: var(--p2-color);
  }

  .turn-info {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-bottom: 10px;
    width: 100%;
    flex-wrap: wrap;
  }

  .turn-badge {
    font-family: var(--font-display);
    font-size: 1rem;
    padding: 6px 16px;
    border-radius: 4px;
    font-weight: bold;
    letter-spacing: 2px;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .turn-badge.your-turn {
    background: rgba(0, 255, 0, 0.2);
    color: #0f0;
    border: 1px solid #0f0;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  }

  .turn-badge.opponent-turn {
    background: rgba(255, 255, 255, 0.05);
    color: #888;
    border: 1px solid #444;
  }

  @keyframes pulse-glow {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .player-badge {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: bold;
    padding: 5px 20px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    text-shadow: 0 0 10px currentColor;
    transition: all 0.3s ease;
  }

  .player-badge.p1 {
    color: var(--p1-color);
    border-color: var(--p1-color);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
  }

  .player-badge.p2 {
    color: var(--p2-color);
    border-color: var(--p2-color);
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
  }

  .phase-badge {
    font-family: monospace;
    font-size: 1rem;
    color: #fff;
    padding: 4px 12px;
    background: #222;
    border-radius: 4px;
    border: 1px solid #444;
    letter-spacing: 1px;
  }

  .timer-container {
    position: relative;
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111;
    border-radius: 20px;
    border: 1px solid #333;
    overflow: hidden;
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.8);
  }

  .timer-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.05);
  }

  .timer-fill {
    height: 100%;
    transition:
      width 1s linear,
      background-color 0.3s ease;
    box-shadow: 0 0 20px currentColor;
  }

  .timer-text {
    position: relative;
    z-index: 2;
    font-family: var(--font-display);
    font-size: 1.8rem;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  }

  .unit {
    font-size: 1rem;
    margin-left: 2px;
    opacity: 0.7;
  }

  .timer-container.warning {
    border-color: #ff3333;
    animation: pulse-border 1s infinite;
  }

  .timer-container.warning .timer-text {
    color: #ff3333;
    text-shadow: 0 0 10px #ff3333;
  }

  .timer-container.warning .timer-fill {
    background-color: #ff3333 !important;
    box-shadow: 0 0 30px #ff3333;
  }

  @keyframes pulse-border {
    0% {
      box-shadow: 0 0 5px #ff3333;
    }
    50% {
      box-shadow: 0 0 20px #ff3333;
    }
    100% {
      box-shadow: 0 0 5px #ff3333;
    }
  }

  .message {
    margin-top: 10px;
    color: #888;
    font-size: 0.9rem;
    font-family: monospace;
  }

  .game-over {
    font-family: var(--font-display);
    font-size: 2rem;
    color: #ff3333;
    text-shadow: 0 0 20px #ff3333;
    animation: glitch 1s infinite;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .game-view {
      gap: 15px;
      padding: 0;
    }

    h1 {
      font-size: 1.8rem;
    }

    .controls {
      gap: 15px;
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 1.5rem;
    }

    .controls {
      gap: 10px;
    }
  }
</style>
