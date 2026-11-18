(function () {
  'use strict';

  const core = window.GameLogCore;
  const progressUrl = new URL('data/progress.json', document.currentScript.src);

  async function loadPublishedCatalog() {
    const response = await fetch(progressUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Published progress is unavailable');
    return core.normalizeCatalog(await response.json());
  }

  function render(overview, summary) {
    for (const count of overview.querySelectorAll('[data-overview-count]')) {
      count.textContent = summary[count.dataset.overviewCount];
    }

    const circumference = 2 * Math.PI * 65;
    let offset = 0;
    const segments = [];
    for (const stage of core.STAGES) {
      const count = summary.counts[stage.id];
      if (!count) continue;
      const length = count / summary.total * circumference;
      segments.push(`<circle cx="80" cy="80" r="65" fill="none" stroke="${stage.color}" stroke-width="13" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"></circle>`);
      offset += length;
    }

    const chart = overview.querySelector('[data-overview-chart]');
    chart.querySelector('g').innerHTML = segments.join('');
    const breakdown = core.STAGES.map(stage => `${summary.counts[stage.id]} ${stage.label.toLowerCase()}`);
    chart.setAttribute('aria-label', `${summary.total} game editions: ${breakdown.join(', ')}`);
  }

  window.GameLogOverview = { loadPublishedCatalog, render };

  const homepage = document.querySelector('[data-playthrough-preview]');
  if (!homepage) return;

  const status = homepage.querySelector('[data-overview-status]');
  loadPublishedCatalog().then(catalog => {
    render(homepage, core.summarize(catalog.games));
    homepage.querySelector('[data-overview-figures]').hidden = false;
    status.hidden = true;
  }).catch(() => {
    status.textContent = 'Progress totals are temporarily unavailable.';
  });
})();
