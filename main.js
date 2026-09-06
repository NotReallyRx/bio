import yaml from "https://esm.sh/js-yaml@4.1.0";
import { commands } from "./rpc/lib.js";

const linksEl = document.getElementById("links");

async function loadConfig() {
  const res = await fetch("config.yml");
  const text = await res.text();
  return yaml.load(text) || {};
}

function renderSocials(socials = []) {
  socials.forEach(({ label, url }) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<span>${label}</span><span class="arrow">-></span>`;
    li.appendChild(a);
    linksEl.appendChild(li);
  });
}

async function loadRpcModules(config) {
  const names = config.modules || [];

  for (const name of names) {
    try {
      const mod = await import(`./rpc/${name}`);
      if (typeof mod.init === "function") {
        mod.init(config, commands);
      } else {
        console.warn(`rpc/${name} has no init() export, skipping`);
      }
    } catch (err) {
      console.error(`couldn't load rpc/${name}`, err);
    }
  }
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function initPlayer(player = {}) {
  const audioEl = document.getElementById("player-audio");
  const toggleEl = document.getElementById("player-toggle");
  const titleEl = document.getElementById("player-title");
  const trackEl = document.getElementById("player-progress-track");
  const fillEl = document.getElementById("player-progress-fill");
  const timeEl = document.getElementById("player-time");
  const iconPlay = toggleEl.querySelector(".icon-play");
  const iconPause = toggleEl.querySelector(".icon-pause");

  if (!player.src) return;

  audioEl.src = player.src;
  titleEl.textContent = player.title || "Now playing";

  toggleEl.addEventListener("click", () => {
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
    }
  });

  audioEl.addEventListener("play", () => {
    iconPlay.style.display = "none";
    iconPause.style.display = "block";
  });

  audioEl.addEventListener("pause", () => {
    iconPlay.style.display = "block";
    iconPause.style.display = "none";
  });

  audioEl.addEventListener("timeupdate", () => {
    const pct = audioEl.duration
      ? (audioEl.currentTime / audioEl.duration) * 100
      : 0;
    fillEl.style.width = `${pct}%`;
    timeEl.textContent = `${formatTime(audioEl.currentTime)} / ${formatTime(audioEl.duration)}`;
  });

  trackEl.addEventListener("click", (e) => {
    const rect = trackEl.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audioEl.duration) {
      audioEl.currentTime = pct * audioEl.duration;
    }
  });

  function tryAutoplay() {
    audioEl.play().catch(() => {
      const startOnInteraction = () => {
        audioEl.play();
        document.removeEventListener("click", startOnInteraction);
        document.removeEventListener("keydown", startOnInteraction);
        document.removeEventListener("touchstart", startOnInteraction);
      };
      document.addEventListener("click", startOnInteraction);
      document.addEventListener("keydown", startOnInteraction);
      document.addEventListener("touchstart", startOnInteraction);
    });
  }

  tryAutoplay();
}

async function main() {
  try {
    const config = await loadConfig();

    if (config.layout?.scale) {
      document.documentElement.style.setProperty(
        "--card-scale",
        config.layout.scale,
      );
    }

    initPlayer(config.player);

    renderSocials(config.socials);
    await loadRpcModules(config);
  } catch (err) {
    console.error("couldn't load config.yml", err);
  }
}

main();
