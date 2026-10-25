(() => {
  const body = document.body;
  const stage = document.getElementById('stage');
  const track = document.getElementById('track');
  const views = {
    bio: document.getElementById('view-bio'),
    ports: document.getElementById('view-ports'),
    projects: document.getElementById('view-projects'),
    polymods: document.getElementById('view-polymods'),
  };
  const tabs = [...document.querySelectorAll('.edge-tab')];

  const viewer = document.getElementById('viewer');
  const frameWrap = document.querySelector('.frame-wrap');
  const title = document.getElementById('viewer-title');
  const note = document.getElementById('viewer-note');
  let currentUrl = '';

  // A fresh iframe per load keeps the game's own navigation out of the page's
  // history, so Back/Escape reliably close the viewer.
  function loadFrame(url) {
    const f = document.createElement('iframe');
    f.id = 'site-frame';
    f.title = 'Selected game website';
    f.setAttribute('allowfullscreen', '');
    f.referrerPolicy = 'no-referrer';
    f.src = url;
    frameWrap.replaceChildren(f);
  }

  function setView(name) {
    body.dataset.view = name;
    track.classList.toggle('show-ports', name === 'ports');
    track.classList.toggle('show-projects', name === 'projects');
    stage.classList.toggle('show-polymods', name === 'polymods');
    for (const [key, el] of Object.entries(views)) {
      el.inert = key !== name;
      el.setAttribute('aria-hidden', String(key !== name));
    }
    tabs.forEach((tab) => {
      const on = tab.dataset.on === name;
      tab.inert = !on;
      tab.classList.toggle('visible', on);
    });
  }

  function setViewer(on) {
    viewer.classList.toggle('open', on);
    viewer.setAttribute('aria-hidden', String(!on));
    if (!on) {
      loadFrame('about:blank');
      currentUrl = '';
      note.textContent = '';
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }

  function viewFromHash(h) {
    if (h === '#ports' || h === '#viewer') return 'ports';
    if (h === '#projects') return 'projects';
    if (h === '#polymods') return 'polymods';
    return 'bio';
  }

  // #ports / #projects / #polymods = those pages, #viewer = a game open on top
  // of ports, anything else = bio
  function applyRoute() {
    const h = location.hash;
    if (h === '#viewer' && !currentUrl) {
      history.replaceState(null, '', '#ports');
      return applyRoute();
    }
    setView(viewFromHash(h));
    setViewer(h === '#viewer');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const to = tab.dataset.goto;
      history.pushState(null, '', to === 'bio' ? location.pathname + location.search : '#' + to);
      applyRoute();
    });
  });

  // Port links are rendered from config.yml after load, so listen on the page.
  views.ports.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-url]');
    if (!link) return;
    event.preventDefault();
    currentUrl = link.dataset.url;
    title.textContent = link.querySelector('span').textContent;
    note.textContent = 'Some sites block iframe embedding. If the page is blank, use Open in new tab.';
    loadFrame(currentUrl);
    history.pushState(null, '', '#viewer');
    applyRoute();
  });

  function closeViewer() {
    if (location.hash === '#viewer') history.back();
    else setViewer(false);
  }

  document.getElementById('back-button').addEventListener('click', closeViewer);
  document.getElementById('open-tab-button').addEventListener('click', () => {
    if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
  });
  document.getElementById('refresh-button').addEventListener('click', () => {
    if (currentUrl) loadFrame(currentUrl);
  });
  document.getElementById('fullscreen-button').addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await viewer.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      note.textContent = 'Fullscreen is unavailable in this browser. Try expanding the window.';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewer.classList.contains('open') && !document.fullscreenElement) closeViewer();
  });

  window.addEventListener('popstate', applyRoute);
  window.addEventListener('hashchange', applyRoute);
  applyRoute();
})();
