(() => {
  const body = document.body;
  const track = document.getElementById('track');
  const viewBio = document.getElementById('view-bio');
  const viewPorts = document.getElementById('view-ports');
  const tabPorts = document.getElementById('tab-ports');
  const tabBio = document.getElementById('tab-bio');

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

  function setPorts(on) {
    track.classList.toggle('show-ports', on);
    body.classList.toggle('on-ports', on);
    viewBio.inert = on;
    viewPorts.inert = !on;
    viewBio.setAttribute('aria-hidden', String(on));
    viewPorts.setAttribute('aria-hidden', String(!on));
    tabPorts.inert = on;
    tabBio.inert = !on;
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

  // #ports = ports view, #viewer = a game open on top of ports, anything else = bio
  function applyRoute() {
    const h = location.hash;
    if (h === '#viewer' && !currentUrl) {
      history.replaceState(null, '', '#ports');
      return applyRoute();
    }
    setPorts(h === '#ports' || h === '#viewer');
    setViewer(h === '#viewer');
  }

  tabPorts.addEventListener('click', () => {
    history.pushState(null, '', '#ports');
    applyRoute();
  });
  tabBio.addEventListener('click', () => {
    history.pushState(null, '', location.pathname + location.search);
    applyRoute();
  });

  // Links are rendered from config.yml after load, so listen on the container.
  viewPorts.addEventListener('click', (event) => {
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
