const CORS_PROXY = "https://cors.rxk.workers.dev/?url=";

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
      `${CORS_PROXY}${encodeURIComponent("https://discord.com/api/v10/applications/detectable")}`,
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

function avatarUrlFor(user) {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  const fallback = (parseInt(user.discriminator, 10) || 0) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

function timerFor(timestamps) {
  if (!timestamps?.start) return null;
  return { start: timestamps.start, end: timestamps.end || null };
}

async function refresh(discordId, commands) {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
    const json = await res.json();

    if (!json.success) {
      commands.setStatusText("user not found on lanyard");
      return;
    }

    const data = json.data;
    const user = data.discord_user;

    commands.setProfile({
      name: user.global_name || user.username,
      username: user.username,
      avatarUrl: avatarUrlFor(user),
    });

    commands.setStatus(data.discord_status || "offline");

    const spotify = data.spotify;
    const activities = (data.activities || []).filter((a) => a.type !== 4);

    const boxes = [];
    for (const activity of activities) {
      let title = activity.name;
      let subLines = [activity.details, activity.state].filter(Boolean);
      let art = await getActivityIcon(activity);
      let timer = timerFor(activity.timestamps);

      if (activity.type === 2 && spotify) {
        title = spotify.song;
        subLines = [spotify.artist];
        art = spotify.album_art_url;
        timer = timerFor(spotify.timestamps) || timer;
      }

      boxes.push({
        type: ACTIVITY_TYPE_LABELS[activity.type] || "activity",
        title,
        subLines,
        art,
        timer,
      });
    }

    commands.setActivities("discord", boxes);
  } catch (err) {
    commands.setStatusText("couldn't reach lanyard");
    console.error(err);
  }
}

export function init(config, commands) {
  const { id, refreshMs = 5000 } = config.discord;
  refresh(id, commands);
  setInterval(() => refresh(id, commands), refreshMs);
}
