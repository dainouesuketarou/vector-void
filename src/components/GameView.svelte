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

  onMount(() => {
    startNewGame();

    if (isOnline) {
      const socket = network.getSocket();
      if (socket) {
        socket.on("action", ({ type, data }) => {
          if (type === "move") {
            game.move(data.r, data.c);
            playSound("move");
          } else if (type === "shoot_target") {
            const result = game.shootTarget(data.r, data.c);
            if (result) {
              playSound("shoot");
              // We need to know WHERE the shot landed to show animation.
              // game.shootTarget returns boolean, but internally calls shoot.
              // We need to reconstruct the hit for animation or modify game.shootTarget to return details.
              // For now, let's just use the target coordinates provided in data.
              // Wait, if it hit a unit, we want to show explosion there.
              // If it hit a wall/teleport, show there.
              // Since we just updated the game state, we can check the cell at data.r, data.c?
              // No, the cell might be destroyed/empty now.
              // Let's trigger animation at the target.
              triggerDestruction({ r: data.r, c: data.c });
              playSound("destroy");
            }
          }
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

  // ... (onDestroy)

  function startNewGame() {
    game = new Game(mapConfig, seed);
    destroyedPos = null;
    updateStatus();
    version++;
  }

  function triggerDestruction(pos: { r: number; c: number }) {
    destroyedPos = pos;
    setTimeout(() => {
      destroyedPos = null;
    }, 1000); // 1s animation
  }

  function handleCellClick(e: CustomEvent) {
    const { r, c } = e.detail;

    // Online check: Is it my turn?
    if (isOnline && game.currentPlayer !== myPlayerId) {
      return;
    }

    if (game.phase === Phase.MOVE) {
      // Handle move
      if (game.move(r, c)) {
        playSound("move");
        if (isOnline) {
          network.getSocket()?.emit("action", {
            word: secretWord,
            type: "move",
            data: { r, c },
          });
        }
        updateStatus();
        version++;
      }
    } else if (game.phase === Phase.SHOOT) {
      // Handle shoot target selection
      // We need to capture the result to know if something was destroyed
      // game.shootTarget returns boolean.
      // Let's modify Game.ts later if needed, but for now we know (r,c) is the target.
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
        updateStatus();
        version++;
      }
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
      playSound("win");
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

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === "move") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
    } else if (type === "shoot") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
    } else if (type === "destroy") {
      osc.type = "square";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
    } else if (type === "win") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(800, now + 1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 2);
    }

    osc.start(now);
    osc.stop(now + 0.3); // Safety stop
  }
</script>

<div class="game-view">
  <header>
    <h1>VECTOR VOID</h1>
    <div
      class="status"
      class:p1={game?.currentPlayer === 1}
      class:p2={game?.currentPlayer === 2}
    >
      {statusMsg}
    </div>
  </header>

  {#if game}
    <BoardComponent
      {game}
      {version}
      {destroyedPos}
      on:click={handleCellClick}
    />

    {#if game.gameOver}
      <GameOver
        winner={game.winner}
        winnerColor={getWinnerColor()}
        on:restart={startNewGame}
        on:menu={onBack}
      />
    {/if}
  {/if}

  <div class="controls">
    <button class="cyber-btn" on:click={startNewGame}>リセット</button>
    <button class="cyber-btn" on:click={onBack}>メニュー</button>
  </div>
</div>

<style>
  .game-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    z-index: 10;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 2.5rem;
    background: linear-gradient(90deg, var(--p1-color), #fff, var(--p2-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin: 0;
  }
  .status {
    font-family: var(--font-display);
    color: #fff;
    margin-top: 10px;
    font-size: 1.2rem;
    text-shadow: 0 0 5px currentColor;
  }
  .status.p1 {
    color: var(--p1-color);
  }
  .status.p2 {
    color: var(--p2-color);
  }

  .controls {
    display: flex;
    gap: 20px;
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

    .status {
      font-size: 1rem;
      margin-top: 5px;
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

    .status {
      font-size: 0.9rem;
    }

    .controls {
      gap: 10px;
    }
  }
</style>
