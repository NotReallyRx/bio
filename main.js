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

async function main() {
  try {
    const config = await loadConfig();

    if (config.layout?.scale) {
      document.documentElement.style.setProperty(
        "--card-scale",
        config.layout.scale,
      );
    }

    renderSocials(config.socials);
    await loadRpcModules(config);
  } catch (err) {
    console.error("couldn't load config.yml", err);
  }
}

main();
