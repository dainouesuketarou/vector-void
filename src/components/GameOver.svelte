<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { PlayerId } from "../lib/game/types";

  export let winner: PlayerId | null;
  export let winnerColor: string;
  export let myPlayerId: number = 1; // Add myPlayerId to know if this player won

  const dispatch = createEventDispatcher();
  let canvas: HTMLCanvasElement;

  // Determine if this player won
  $: isVictory = winner === myPlayerId;

  onMount(() => {
    if (canvas) {
      startParticles();
    }
  });

  function startParticles() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
      size: number;

      constructor() {
        this.x = w / 2;
        this.y = h / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 100;
        this.color = isVictory ? winnerColor : "#ff3333"; // Red for defeat
        this.size = Math.random() * 4 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life--;
        this.size *= 0.96;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Explosion - reduce particles on mobile for performance
    const particleCount = window.innerWidth <= 768 ? 100 : 200;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (!ctx) return; // Additional safety check
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      if (particles.length > 0) requestAnimationFrame(animate);
    }
    animate();
  }
</script>

<div
  class="overlay"
  class:victory={isVictory}
  class:defeat={!isVictory}
  style="background: linear-gradient(135deg, 
  {isVictory
    ? winner === PlayerId.P1
      ? 'rgba(0, 243, 255, 0.15)'
      : 'rgba(255, 0, 255, 0.15)'
    : 'rgba(255, 51, 51, 0.15)'} 0%, 
  {isVictory
    ? winner === PlayerId.P1
      ? 'rgba(0, 243, 255, 0.25)'
      : 'rgba(255, 0, 255, 0.25)'
    : 'rgba(255, 51, 51, 0.25)'} 100%),
  rgba(0, 0, 0, 0.85);"
>
  <canvas bind:this={canvas}></canvas>
  <div class="content">
    <div class="trophy">{isVictory ? "🏆" : "💀"}</div>

    <div
      class="winner-badge"
      class:victory-badge={isVictory}
      class:defeat-badge={!isVictory}
      style="background: {isVictory
        ? winnerColor
        : '#666'}; box-shadow: 0 0 40px {isVictory ? winnerColor : '#ff3333'};"
    >
      {#if winner === PlayerId.P1}
        PLAYER 1
      {:else}
        PLAYER 2
      {/if}
    </div>

    <h1
      class="result-text"
      class:victory-text={isVictory}
      class:defeat-text={!isVictory}
    >
      {isVictory ? "VICTORY!" : "DEFEAT"}
    </h1>

    <div class="buttons">
      <button class="cyber-btn large" on:click={() => dispatch("restart")}
        >REMATCH</button
      >
      <button class="cyber-btn" on:click={() => dispatch("menu")}>MENU</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.5s ease-out;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .content {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 30px;
    align-items: center;
    z-index: 2;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 5rem;
    color: #fff;
    margin: 0;
    letter-spacing: 10px;
    position: relative;
  }

  .trophy {
    font-size: 6rem;
    animation:
      bounce 1s ease-in-out infinite,
      rotate-trophy 3s linear infinite;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  @keyframes rotate-trophy {
    0%,
    100% {
      transform: rotate(-5deg);
    }
    50% {
      transform: rotate(5deg);
    }
  }

  .winner-badge {
    font-family: var(--font-display);
    font-size: 4rem;
    padding: 30px 60px;
    border-radius: 20px;
    color: #000;
    font-weight: bold;
    letter-spacing: 8px;
    animation:
      slideInTop 0.5s ease-out,
      shine 2s ease-in-out infinite;
    border: 4px solid #fff;
  }

  @keyframes slideInTop {
    from {
      transform: translateY(-100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes shine {
    0%,
    100% {
      box-shadow: 0 0 30px currentColor;
    }
    50% {
      box-shadow:
        0 0 60px currentColor,
        0 0 80px currentColor;
    }
  }

  .result-text {
    font-family: var(--font-display);
    font-size: 5rem;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 15px;
    animation: scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both;
  }

  .victory-text {
    text-shadow:
      0 0 30px #ffd700,
      0 0 60px #ffd700;
    color: #ffd700;
  }

  .defeat-text {
    text-shadow:
      0 0 30px #ff3333,
      0 0 60px #ff3333;
    color: #ff3333;
    letter-spacing: 20px;
  }

  .defeat-badge {
    opacity: 0.7;
  }

  .buttons {
    display: flex;
    gap: 20px;
    margin-top: 20px;
    animation: slideUp 0.5s ease-out 0.6s both;
  }

  .cyber-btn.large {
    font-size: 1.5rem;
    padding: 15px 40px;
    border-width: 2px;
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes scaleUp {
    from {
      transform: scale(0.5);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Glitch Effect */
  .glitch::before,
  .glitch::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
  }
  .glitch::before {
    left: 2px;
    text-shadow: -1px 0 #ff00c1;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim 5s infinite linear alternate-reverse;
  }
  .glitch::after {
    left: -2px;
    text-shadow: -1px 0 #00fff9;
    clip: rect(44px, 450px, 56px, 0);
    animation: glitch-anim2 5s infinite linear alternate-reverse;
  }
  @keyframes glitch-anim {
    0% {
      clip: rect(30px, 9999px, 10px, 0);
    }
    20% {
      clip: rect(80px, 9999px, 90px, 0);
    }
    40% {
      clip: rect(10px, 9999px, 50px, 0);
    }
    60% {
      clip: rect(40px, 9999px, 20px, 0);
    }
    80% {
      clip: rect(20px, 9999px, 60px, 0);
    }
    100% {
      clip: rect(70px, 9999px, 30px, 0);
    }
  }
  @keyframes glitch-anim2 {
    0% {
      clip: rect(10px, 9999px, 80px, 0);
    }
    20% {
      clip: rect(70px, 9999px, 10px, 0);
    }
    40% {
      clip: rect(30px, 9999px, 10px, 0);
    }
    60% {
      clip: rect(80px, 9999px, 50px, 0);
    }
    80% {
      clip: rect(20px, 9999px, 60px, 0);
    }
    100% {
      clip: rect(60px, 9999px, 40px, 0);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    h1 {
      font-size: 3rem;
      letter-spacing: 6px;
    }

    .winner-text {
      font-size: 2.5rem;
    }

    .buttons {
      flex-direction: column;
      gap: 15px;
      width: 100%;
      max-width: 300px;
    }

    .cyber-btn.large {
      font-size: 1.2rem;
      padding: 12px 30px;
      width: 100%;
    }

    .cyber-btn {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 2.5rem;
      letter-spacing: 4px;
    }

    .winner-text {
      font-size: 2rem;
    }

    .cyber-btn.large {
      font-size: 1.1rem;
      padding: 10px 25px;
    }
  }
</style>
