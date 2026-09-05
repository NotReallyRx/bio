const STATUS_LABELS = {
  online: "online",
  idle: "idle",
  dnd: "do not disturb",
  offline: "offline",
};

const displayNameEl = document.getElementById("display-name");
const usernameEl = document.getElementById("username");
const avatarEl = document.getElementById("avatar");
const dotEl = document.getElementById("status-dot");
const statusTextEl = document.getElementById("status-text");
const activitiesEl = document.getElementById("activities");

const boxesByKey = new Map();

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function attachTimer(el, timer) {
  const row = document.createElement("div");
  row.className = "activity-progress";

  const timeEl = document.createElement("span");
  timeEl.className = "activity-progress-time";
  row.appendChild(timeEl);

  let fillEl = null;
  if (timer.end) {
    const track = document.createElement("div");
    track.className = "activity-progress-track";
    fillEl = document.createElement("div");
    fillEl.className = "activity-progress-fill";
    track.appendChild(fillEl);
    row.appendChild(track);
  }

  el.querySelector(".activity-text").appendChild(row);

  function tick() {
    const now = Date.now();
    const elapsed = now - timer.start;

    if (timer.end) {
      const total = timer.end - timer.start;
      const clampedElapsed = Math.min(Math.max(elapsed, 0), total);
      const pct = total > 0 ? (clampedElapsed / total) * 100 : 0;
      fillEl.style.width = `${pct}%`;
      timeEl.textContent = `${formatDuration(clampedElapsed)} / ${formatDuration(total)}`;

      if (elapsed >= total) {
        clearInterval(el._tickInterval);
      }
    } else {
      timeEl.textContent = `${formatDuration(Math.max(elapsed, 0))} elapsed`;
    }
  }

  tick();
  el._tickInterval = setInterval(tick, 1000);
}

function createBox({
  type,
  title,
  subLines = [],
  art = "",
  href = "",
  timer = null,
}) {
  const el = document.createElement(href ? "a" : "div");
  el.className = href ? "activity-box activity-link" : "activity-box";
  if (href) {
    el.href = href;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  }
  el.innerHTML = `
    ${art ? `<img class="activity-art" src="${art}" alt="">` : ""}
    <div class="activity-text">
      <span class="activity-type">${type}</span>
      <span class="activity-title">${title}</span>
      ${subLines.map((line) => `<span class="activity-sub">${line}</span>`).join("")}
    </div>
  `;

  if (timer && timer.start) {
    attachTimer(el, timer);
  }

  return el;
}

export const commands = {
  setProfile({ name, username, avatarUrl }) {
    displayNameEl.textContent = name;
    usernameEl.textContent = `@${username}`;
    avatarEl.src = avatarUrl;
    avatarEl.alt = username;
  },

  setStatus(status) {
    dotEl.className = `dot ${status}`;
    statusTextEl.textContent = STATUS_LABELS[status] || status;
  },

  setStatusText(text) {
    statusTextEl.textContent = text;
  },

  setActivities(key, boxes) {
    const old = boxesByKey.get(key);
    if (old) {
      old.forEach((el) => {
        if (el._tickInterval) clearInterval(el._tickInterval);
        el.remove();
      });
    }

    const els = boxes.map(createBox);
    els.forEach((el) => activitiesEl.appendChild(el));
    boxesByKey.set(key, els);
  },
};
