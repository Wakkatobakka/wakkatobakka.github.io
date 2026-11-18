(function () {
  'use strict';
  const C = window.GameLogCore;
  const progressOverview = window.GameLogOverview;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  let data = null;
  let view = 'gallery';
  const initialCollection = new URLSearchParams(location.search).get('collection');
  const filters = {search: '', collection: ['classic', 'ios'].includes(initialCollection) ? initialCollection : 'all', platform: 'all', progress: 'all', sort: 'title'};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const initials = s => s.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 3).map(x => x[0]).join('').toUpperCase();
  const players = g => g.players.map(x => `<span class="player ${x === 'omni' ? 'omni' : 'apple'}">${x === 'omni' ? 'OMNI PLAYER' : 'APPLE BRIDGE'}</span>`).join('');
  const artBundle = JSON.parse($('#embedded-art')?.textContent || '{}');
  const appIcons = artBundle.images || {};
  const appIconPaths = artBundle.games || {};
  const artUrl = g => {
    const path = Object.prototype.hasOwnProperty.call(appIconPaths, g.id) ? appIconPaths[g.id] : g.art;
    return appIcons[path] || path;
  };
  function formatDay(day) {
    if (!day) return 'No date recorded';
    return new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(day + 'T12:00:00'));
  }
  function scrollToCollection() {
    $('#collection').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
  }
  function updatePlatformOptions() {
    let games = data.games;
    if (filters.collection === 'classic') games = games.filter(g => g.platform.toLowerCase() !== 'ios');
    if (filters.collection === 'ios') games = games.filter(g => g.platform.toLowerCase() === 'ios');
    const options = Array.from(new Set(games.map(g => g.platform))).sort();
    if (filters.platform !== 'all' && !options.includes(filters.platform)) filters.platform = 'all';
    $('#platform-filter').innerHTML = '<option value="all">All platforms</option>' + options.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    $('#platform-filter').value = filters.platform;
  }
  function overview() {
    const s = C.summarize(data.games);
    progressOverview.render($('.overview'), s);
    $('#collection-count').textContent = s.total;
    $('#chart-legend').innerHTML = C.STAGES.map(x => `<button class="legend-item" data-stage="${x.id}" title="Filter to ${esc(x.label)}"><i style="background:${x.color}"></i>${esc(x.label)} <strong>${s.counts[x.id]}</strong></button>`).join('');
    const recorded = s.total - s.unrecorded;
    $('#overview-note').textContent = recorded ? `${recorded} of ${s.total} entries have a recorded progress stage. Overview covers my entire collection.` : 'Personal progress hasn’t been entered yet. “Unrecorded” doesn’t mean unplayed.';
    $('#save-indicator').textContent = 'Wakka’s published log';
  }
  function render() {
    if (!data) return;
    overview();
    const games = C.filterGames(data.games, filters);
    $('#games').className = 'game-grid' + (view === 'list' ? ' list' : '');
    $('#results-count').textContent = `${games.length} of ${data.games.length} game editions${filters.collection === 'ios' ? ' · iOS' : filters.collection === 'classic' ? ' · classic mobile' : ''}`;
    $('#empty-state').hidden = games.length > 0;
    $('#clear-filters').hidden = !filters.search && filters.collection === 'all' && filters.platform === 'all' && filters.progress === 'all';
    $('#games').innerHTML = games.map(g => {
      const st = C.stage(g.status), art = artUrl(g), note = g.checkpoint || 'No checkpoint recorded.';
      return `<article class="game-card" style="--status:${st.color}"><div class="game-art"><span class="fallback-art" ${art ? 'hidden' : ''}>${esc(initials(g.title))}</span>${art ? `<img src="${esc(art)}" alt="" loading="eager" decoding="async" data-fallback data-pixel="${g.platform.toLowerCase() !== 'ios'}">` : ''}<span class="art-platform">${esc(g.platform)}</span></div><div class="game-body"><div class="game-title-wrap"><h3>${esc(g.title)}</h3><p class="game-edition" title="${esc(g.edition)}">${esc(g.edition || 'Edition not specified')}</p><div class="game-players">${players(g)}</div></div><div class="game-state"><span class="progress-badge">${esc(st.label)}</span><div class="game-meta">${g.lastPlayed ? 'Last played · ' : ''}${esc(formatDay(g.lastPlayed))}</div></div><p class="checkpoint${g.checkpoint ? '' : ' no-note'}">${esc(note)}</p><div class="game-foot"><button class="open-game" data-game="${esc(g.id)}" aria-label="View checkpoint for ${esc(g.title)}">View checkpoint →</button>${g.guideUrl ? `<a class="guide-link" href="${esc(g.guideUrl)}" target="_blank" rel="noopener">Game guide ↗</a>` : ''}</div></div></article>`;
    }).join('');
    for (const img of $$('#games img[data-fallback]')) img.addEventListener('error', () => {img.hidden = true; img.parentElement.querySelector('.fallback-art').hidden = false;}, {once: true});
    $('#games').setAttribute('aria-busy', 'false');
    $('#progress-filter').value = filters.progress;
    $('#sort').value = filters.sort;
    for (const b of $$('[data-collection]')) {const active = b.dataset.collection === filters.collection; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));}
    for (const b of $$('[data-view]')) {const active = b.dataset.view === view; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));}
  }
  function resetFilters() {
    Object.assign(filters, {search: '', collection: 'all', platform: 'all', progress: 'all'});
    $('#search').value = '';
    updatePlatformOptions();
    render();
  }
  function openGame(id) {
    const g = data.games.find(game => game.id === id);
    if (!g) return;
    const st = C.stage(g.status), art = artUrl(g);
    $('#dialog-mode').textContent = 'WAKKA’S CHECKPOINT';
    $('#game-details').innerHTML = `<div class="dialog-game-heading">${art ? `<img src="${esc(art)}" alt="" data-pixel="${g.platform.toLowerCase() !== 'ios'}">` : ''}<div><h2>${esc(g.title)}</h2><p>${esc(g.platform)}${g.edition ? ' · ' + esc(g.edition) : ''}</p><div class="detail-players">${players(g)}</div></div></div><span class="progress-badge" style="--status:${st.color}">${esc(st.label)}</span><p class="detail-checkpoint" style="--status:${st.color}">${esc(g.checkpoint || 'No personal checkpoint has been recorded yet.')}</p><div class="detail-meta"><span>${g.lastPlayed ? 'Last played: ' : ''}${esc(formatDay(g.lastPlayed))}</span><span>Wakka’s published progress</span></div>${g.guideUrl ? `<div class="detail-buttons"><a href="${esc(g.guideUrl)}" target="_blank" rel="noopener">Original files &amp; game guide ↗</a></div>` : ''}`;
    if (!$('#game-dialog').open) $('#game-dialog').showModal();
  }
  async function load() {
    $('#load-error').hidden = true;
    $('#games').setAttribute('aria-busy', 'true');
    try {
      data = await progressOverview.loadPublishedCatalog();
      $('#progress-filter').innerHTML = '<option value="all">Any progress</option>' + C.STAGES.map(x => `<option value="${x.id}">${esc(x.label)}</option>`).join('') + '<option value="active">Underway</option><option value="finished">Story finished + full</option>';
      updatePlatformOptions();
      render();
      $('#catalogue-date').textContent = data.catalogueAsOf ? 'Catalog imported ' + new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(new Date(data.catalogueAsOf)) + '. Progress dates are recorded by Wakka.' : '';
    } catch {
      $('#load-error').hidden = false;
      $('#games').setAttribute('aria-busy', 'false');
      $('#results-count').textContent = 'The catalog is unavailable.';
    }
  }
  $('#search').addEventListener('input', e => {filters.search = e.target.value; render();});
  $('#platform-filter').addEventListener('change', e => {filters.platform = e.target.value; render();});
  $('#progress-filter').addEventListener('change', e => {filters.progress = e.target.value; render();});
  $('#sort').addEventListener('change', e => {filters.sort = e.target.value; render();});
  for (const b of $$('[data-collection]')) b.addEventListener('click', () => {if (!data) return; filters.collection = b.dataset.collection; updatePlatformOptions(); render();});
  for (const b of $$('[data-view]')) b.addEventListener('click', () => {view = b.dataset.view; render();});
  for (const b of $$('[data-stat]')) b.addEventListener('click', () => {if (!data) return; filters.progress = b.dataset.stat; render(); scrollToCollection();});
  $('#chart-legend').addEventListener('click', e => {const b = e.target.closest('[data-stage]'); if (b) {filters.progress = b.dataset.stage; render(); scrollToCollection();}});
  $('#games').addEventListener('click', e => {const b = e.target.closest('[data-game]'); if (b) openGame(b.dataset.game);});
  $('#clear-filters').addEventListener('click', resetFilters);
  $('#empty-clear').addEventListener('click', resetFilters);
  $('#close-game').addEventListener('click', () => $('#game-dialog').close());
  for (const kind of ['help', 'about']) {
    $(`#${kind}-button`).addEventListener('click', () => {if (!$(`#${kind}-dialog`).open) $(`#${kind}-dialog`).showModal();});
    $(`#close-${kind}`).addEventListener('click', () => $(`#${kind}-dialog`).close());
  }
  $('#retry-load').addEventListener('click', load);
  for (const dialog of [$('#game-dialog'), $('#about-dialog'), $('#help-dialog')]) dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  document.addEventListener('load', e => {const img = e.target; if (img instanceof HTMLImageElement && img.dataset.pixel === 'true' && Math.max(img.naturalWidth, img.naturalHeight) <= 64) img.classList.add('pixel');}, true);
  load();
})();
