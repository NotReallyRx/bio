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

const rawByKey = new Map();
let currentSlots = [];
let rotationOffset = 0;
let wheelLocked = false;

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
      <span class="activity-title">${title}</span>
      ${subLines.map((line) => `<span class="activity-sub">${line}</span>`).join("")}
    </div>
  `;

  if (timer && timer.start) {
    attachTimer(el, timer);
  }

  return el;
}

function rotateArray(arr, offset) {
  const n = arr.length;
  if (n === 0) return arr;
  const o = ((offset % n) + n) % n;
  return arr.slice(n - o).concat(arr.slice(0, n - o));
}

function getCombinedBoxes() {
  let combined = [];
  for (const arr of rawByKey.values()) combined = combined.concat(arr);
  return combined;
}

function renderActivities() {
  currentSlots.forEach((slot) => {
    if (slot._box && slot._box._tickInterval) {
      clearInterval(slot._box._tickInterval);
    }
    slot.remove();
  });
  currentSlots = [];

  const combined = getCombinedBoxes();
  if (combined.length === 0) return;

  const hasMore = combined.length > 3;
  const rotated = rotateArray(combined, rotationOffset);
  const visible = rotated.slice(0, 3);

  visible.forEach((params, idx) => {
    const slot = document.createElement("div");
    slot.className = "activity-slot";

    const boxEl = createBox(params);
    slot._box = boxEl;
    slot.appendChild(boxEl);

    if (hasMore && idx === 1) {
      const peek = document.createElement("div");
      peek.className = "activity-peek";
      slot.appendChild(peek);
    }

    activitiesEl.appendChild(slot);
    currentSlots.push(slot);
  });
}

activitiesEl.addEventListener(
  "wheel",
  (e) => {
    if (getCombinedBoxes().length <= 3) return;
    e.preventDefault();
    if (wheelLocked) return;

    rotationOffset += e.deltaY > 0 ? 1 : -1;
    renderActivities();

    wheelLocked = true;
    setTimeout(() => {
      wheelLocked = false;
    }, 300);
  },
  { passive: false },
);

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
    rawByKey.set(key, boxes);
    renderActivities();
  },
};
