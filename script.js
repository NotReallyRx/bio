const DISCORD_ID = "1390805997144113244";

const CORS_PROXY = "https://cors.rxk.workers.dev/?url=";


async function loadSocials() {
  const linksEl = document.getElementById("links");
  try {
    const res = await fetch("socials.json");
    const socials = await res.json();

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
  } catch (err) {
    console.error("couldn't load socials.json", err);
  }
}

loadSocials();


const displayNameEl = document.getElementById("display-name");
const usernameEl = document.getElementById("username");
const avatarEl = document.getElementById("avatar");
const dot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

const DISCORD_STATUS_LABELS = {
  online: "online",
  idle: "idle",
  dnd: "do not disturb",
  offline: "offline",
};

async function loadDiscord() {
  if (DISCORD_ID === "REPLACE_WITH_YOUR_DISCORD_ID") {
    statusText.textContent = "set your discord id in script.js";
    return;
  }

  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const json = await res.json();

    if (!json.success) {
      statusText.textContent = "user not found on lanyard";
      return;
    }

    const data = json.data;
    const user = data.discord_user;

    displayNameEl.textContent = user.global_name || user.username;
    usernameEl.textContent = `@${user.username}`;

    if (user.avatar) {
      const ext = user.avatar.startsWith("a_") ? "gif" : "png";
      avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
    } else {
      const fallback = (parseInt(user.discriminator, 10) || 0) % 5;
      avatarEl.src = `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
    }
    avatarEl.alt = user.username;

    const status = data.discord_status || "offline";
    dot.className = `dot ${status}`;
    statusText.textContent = DISCORD_STATUS_LABELS[status] || status;

    await renderActivities(data.activities || [], data.spotify);
  } catch (err) {
    statusText.textContent = "couldn't reach lanyard";
    console.error(err);
  }
}


const activitiesEl = document.getElementById("activities");

const ACTIVITY_TYPE_LABELS = {
  0: "playing",
  1: "streaming",
  2: "listening to",
  3: "watching",
  5: "competing",
};

let detectableGamesPromise = null;

function loadDetectableGames() {
  if (!detectableGamesPromise) {
    detectableGamesPromise = fetch(
      `${CORS_PROXY}${encodeURIComponent("https://discord.com/api/v10/applications/detectable")}`
    )
      .then((res) => res.json())
      .then((list) => {
        const byId = new Map();
        list.forEach((app) => {
          if (app.icon_hash) byId.set(app.id, app.icon_hash);
        });
        return byId;
      })
      .catch((err) => {
        console.error("couldn't load discord detectable games list", err);
        return new Map();
      });
  }
  return detectableGamesPromise;
}

async function getActivityIcon(activity) {
  const image = activity.assets?.large_image;
  if (image) {
    if (image.startsWith("mp:external")) {
      return `https://media.discordapp.net/external/${image.split("mp:external/")[1]}`;
    }
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }

  if (activity.application_id) {
    const byId = await loadDetectableGames();
    const icon = byId.get(activity.application_id);
    if (icon) {
      return `https://cdn.discordapp.com/app-icons/${activity.application_id}/${icon}.png?size=240&keep_aspect_ratio=false`;
    }
  }

  return "";
}

async function renderActivities(activities, spotify) {
  activitiesEl.innerHTML = "";

  const real = activities.filter((a) => a.type !== 4); // skip custom status

  for (const activity of real) {
    let title = activity.name;
    let subLines = [activity.details, activity.state].filter(Boolean);
    let art = await getActivityIcon(activity);

    if (activity.type === 2 && spotify) {
      title = spotify.song;
      subLines = [spotify.artist];
      art = spotify.album_art_url;
    }

    const box = document.createElement("div");
    box.className = "activity-box";
    box.innerHTML = `
      ${art ? `<img class="activity-art" src="${art}" alt="">` : ""}
      <div class="activity-text">
        <span class="activity-type">${ACTIVITY_TYPE_LABELS[activity.type] || "activity"}</span>
        <span class="activity-title">${title}</span>
        ${subLines.map((line) => `<span class="activity-sub">${line}</span>`).join("")}
      </div>
    `;
    activitiesEl.appendChild(box);
  }
}

loadDiscord();
setInterval(loadDiscord, 15000);
