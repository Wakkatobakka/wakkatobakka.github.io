(function(){
  'use strict';
  const C=window.GameLogCore,$=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
  const STORAGE='wakka-playthroughs-v1';let baseline=null,data=null,snapshot={schemaVersion:1,records:{},customGames:[]},editing=false,openedId=null,adding=false,toastTimer=null,storageReady=true;
  const filters={search:'',collection:'all',platform:'all',progress:'all',sort:'title'};let view='gallery';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stageOptions=()=>C.STAGES.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('');
  const initials=s=>s.replace(/[^\p{L}\p{N} ]/gu,'').split(/\s+/).filter(Boolean).slice(0,3).map(x=>x[0]).join('').toUpperCase();
  const players=g=>g.players.map(x=>`<span class="player ${x==='omni'?'omni':'apple'}">${x==='omni'?'OMNI PLAYER':'APPLE BRIDGE'}</span>`).join('');
  const formatDay=d=>{if(!d)return 'No date recorded';try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(d+'T12:00:00'));}catch{return d;}};
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const artBundle=JSON.parse($('#embedded-art')?.textContent||'{}');
  const appIcons=artBundle.images||window.__PLAYTHROUGH_ART__||{},appIconPaths=artBundle.games||{};
  const artUrl=g=>{const path=Object.prototype.hasOwnProperty.call(appIconPaths,g.id)?appIconPaths[g.id]:g.art;return appIcons[path]||path;};
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},5000);}
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(snapshot));storageReady=true;}catch{storageReady=false;}$('#storage-warning').hidden=storageReady;}
  function hydrate(){data=C.mergeCatalog(baseline,snapshot);}
  function updatePlatformOptions(){let games=data.games;if(filters.collection==='classic')games=games.filter(g=>g.platform.toLowerCase()!=='ios');if(filters.collection==='ios')games=games.filter(g=>g.platform.toLowerCase()==='ios');const options=Array.from(new Set(games.map(g=>g.platform))).sort();if(filters.platform!=='all'&&!options.includes(filters.platform))filters.platform='all';$('#platform-filter').innerHTML='<option value="all">All platforms</option>'+options.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');$('#platform-filter').value=filters.platform;}
  function overview(){
    const s=C.summarize(data.games);$('#stat-total').textContent=s.total;$('#stat-active').textContent=s.active;$('#stat-finished').textContent=s.finished;$('#stat-unknown').textContent=s.unrecorded;$('#collection-count').textContent=s.total;
    const circumference=2*Math.PI*65;let offset=0;const segments=[];
    for(const st of C.STAGES){const n=s.counts[st.id];if(!n)continue;const length=s.total?n/s.total*circumference:0;segments.push(`<circle cx="80" cy="80" r="65" fill="none" stroke="${st.color}" stroke-width="13" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}"></circle>`);offset+=length;}
    $('#chart-segments').innerHTML=segments.join('');$('#progress-chart').setAttribute('aria-label',`${s.total} game editions: `+C.STAGES.map(x=>`${s.counts[x.id]} ${x.label.toLowerCase()}`).join(', '));
    $('#chart-legend').innerHTML=C.STAGES.map(x=>`<button class="legend-item" data-stage="${x.id}" title="Filter to ${esc(x.label)}"><i style="background:${x.color}"></i>${esc(x.label)} <strong>${s.counts[x.id]}</strong></button>`).join('');
    const recorded=s.total-s.unrecorded;$('#overview-note').textContent=recorded?`${recorded} of ${s.total} entries have a recorded progress stage. Overview covers the entire collection.`:'Personal progress hasn’t been entered yet. “Unrecorded” doesn’t mean unplayed.';
    const pending=C.pendingCount(baseline,data);$('#save-indicator').textContent=pending?`${pending} local update${pending===1?'':'s'}`:'Published log';$('#save-indicator').classList.toggle('local',pending>0);
  }
  function render(){
    if(!data)return;overview();const games=C.filterGames(data.games,filters);$('#games').className='game-grid'+(view==='list'?' list':'');
    $('#results-count').textContent=`${games.length} of ${data.games.length} game editions${filters.collection==='ios'?' · iOS':filters.collection==='classic'?' · classic mobile':''}`;
    $('#empty-state').hidden=games.length>0;$('#clear-filters').hidden=!filters.search&&filters.collection==='all'&&filters.platform==='all'&&filters.progress==='all';
    $('#games').innerHTML=games.map(g=>{
      const st=C.stage(g.status),art=artUrl(g),note=g.checkpoint||'No checkpoint recorded.';
      return `<article class="game-card" style="--status:${st.color}"><div class="game-art"><span class="fallback-art" ${art?'hidden':''}>${esc(initials(g.title))}</span>${art?`<img src="${esc(art)}" alt="" loading="eager" decoding="async" data-fallback data-pixel="${g.platform.toLowerCase()!=='ios'}">`:''}<span class="art-platform">${esc(g.platform)}</span></div><div class="game-body"><div class="game-title-wrap"><h3>${esc(g.title)}</h3><p class="game-edition" title="${esc(g.edition)}">${esc(g.edition||'Edition not specified')}</p><div class="game-players">${players(g)}</div></div><div class="game-state"><span class="progress-badge">${esc(st.label)}</span><div class="game-meta">${g.lastPlayed?'Last played · ':''}${esc(formatDay(g.lastPlayed))}</div></div><p class="checkpoint${g.checkpoint?'':' no-note'}">${esc(note)}</p><div class="game-foot"><button class="open-game" data-game="${esc(g.id)}" aria-label="${editing?'Update':'View'} checkpoint for ${esc(g.title)}">${editing?'Update progress ✎':'View checkpoint →'}</button>${g.guideUrl?`<a class="guide-link" href="${esc(g.guideUrl)}" target="_blank" rel="noopener">Game guide ↗</a>`:''}</div></div></article>`;
    }).join('');
    for(const img of $$('#games img[data-fallback]'))img.addEventListener('error',()=>{img.hidden=true;img.parentElement.querySelector('.fallback-art').hidden=false;},{once:true});
    $('#games').setAttribute('aria-busy','false');$('#progress-filter').value=filters.progress;$('#sort').value=filters.sort;
    for(const b of $$('[data-collection]')){const active=b.dataset.collection===filters.collection;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
    for(const b of $$('[data-view]')){const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
  }
  function resetFilters(){Object.assign(filters,{search:'',collection:'all',platform:'all',progress:'all'});$('#search').value='';updatePlatformOptions();render();}
  function editMode(value){editing=value;$('#editor-panel').hidden=!value;$('#edit-toggle').setAttribute('aria-pressed',String(value));$('#edit-toggle').innerHTML=value?'✓ Editing log':'<span aria-hidden="true">✎</span> Edit log';render();if(value)$('#editor-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  function showDialog(dialog){if(!dialog.open)dialog.showModal();}
  function openGame(id,edit=false){
    adding=id===null;openedId=id;const g=adding?{id:null,title:'Add a game',platform:'Other',edition:'',players:['omni'],art:null,status:'unrecorded',checkpoint:'',lastPlayed:null}:data.games.find(x=>x.id===id);if(!g)return;
    const custom=adding||!baseline.games.some(x=>x.id===id);const st=C.stage(g.status),art=artUrl(g);$('#dialog-mode').textContent=edit?(adding?'ADD TO THE PILE':'UPDATE CHECKPOINT'):'CHECKPOINT';
    $('#game-details').innerHTML=`<div class="dialog-game-heading">${art?`<img src="${esc(art)}" alt="" data-pixel="${g.platform.toLowerCase()!=='ios'}">`:''}<div><h2>${esc(g.title)}</h2><p>${esc(g.platform)}${g.edition?' · '+esc(g.edition):''}</p><div class="detail-players">${players(g)}</div></div></div>`+(edit?'':`<span class="progress-badge" style="--status:${st.color}">${esc(st.label)}</span><p class="detail-checkpoint" style="--status:${st.color}">${esc(g.checkpoint||'No personal checkpoint has been recorded yet.')}</p><div class="detail-meta"><span>${g.lastPlayed?'Last played: ':''}${esc(formatDay(g.lastPlayed))}</span><span>One entry for this game edition</span></div><div class="detail-buttons"><button class="button primary" data-edit-entry="${esc(g.id)}">Edit this entry ✎</button>${g.guideUrl?`<a href="${esc(g.guideUrl)}" target="_blank" rel="noopener">Original files & game guide ↗</a>`:''}</div>`);
    $('#game-form').hidden=!edit;$('#custom-fields').hidden=!edit||!custom;$('#game-title-input').required=edit&&custom;$('#game-title-input').disabled=!custom;
    $('#game-id').value=id||'';$('#game-title-input').value=adding?'':g.title;$('#game-platform-input').value=adding?'':g.platform;$('#game-edition-input').value=g.edition;$('#player-omni').checked=g.players.includes('omni');$('#player-apple').checked=g.players.includes('apple-bridge');$('#game-status').value=g.status;$('#game-checkpoint').value=g.checkpoint;$('#game-last-played').value=g.lastPlayed||'';$('#game-last-played').max=today();$('#form-error').hidden=true;
    showDialog($('#game-dialog'));if(edit)setTimeout(()=>$(custom?'#game-title-input':'#game-status').focus(),0);
  }
  function saveGame(event){
    event.preventDefault();try{
      const id=openedId||'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);const old=data.games.find(g=>g.id===id);const custom=!baseline.games.some(g=>g.id===id);
      let game={...(old||{}),id,status:$('#game-status').value,checkpoint:$('#game-checkpoint').value,lastPlayed:$('#game-last-played').value||null,updatedAt:new Date().toISOString()};
      if(custom)Object.assign(game,{title:$('#game-title-input').value,platform:$('#game-platform-input').value||'Other',edition:$('#game-edition-input').value,players:[$('#player-omni').checked?'omni':null,$('#player-apple').checked?'apple-bridge':null].filter(Boolean),art:old?.art||null,guideUrl:old?.guideUrl||null});
      game=C.normalizeGame(game);if(custom){const i=snapshot.customGames.findIndex(g=>g.id===id);if(i===-1)snapshot.customGames.push(game);else snapshot.customGames[i]=game;}else snapshot.records[id]=C.progressRecord(game);
      persist();hydrate();updatePlatformOptions();render();$('#game-dialog').close();toast(storageReady?'Checkpoint saved in this browser.':'Checkpoint updated. Tap Save a backup before closing this page.');
    }catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;}
  }
  function exportData(){if(!data)return;const result={...data,updatedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup downloaded: progress.json. Look in your Downloads folder.');}
  async function importData(file){if(!file)return;try{if(file.size>5*1024*1024)throw new Error('Choose your progress.json backup file (under 5 MB).');const incoming=JSON.parse(await file.text());const next=C.snapshotFromImport(baseline,incoming);if(C.pendingCount(baseline,data)>0&&!confirm('Load this backup? It will replace the progress saved in this browser. Tap Cancel and Save a backup first if you want to keep your current copy.'))return;snapshot=next;persist();hydrate();updatePlatformOptions();render();toast('Backup loaded. Your progress is saved in this browser.');}catch(error){toast(error instanceof SyntaxError?'That file couldn’t be opened. Choose the progress.json file from Save a backup.':error.message);}finally{$('#import-file').value='';}}
  async function load(){
    $('#load-error').hidden=true;$('#games').setAttribute('aria-busy','true');try{
      const source=window.__PLAYTHROUGH_DATA__||await fetch('data/progress.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json();});baseline=C.normalizeCatalog(source);
      try{const raw=localStorage.getItem(STORAGE);if(raw){const v=JSON.parse(raw);if(v.schemaVersion===1&&v.records&&Array.isArray(v.customGames))snapshot=v;}}catch{storageReady=false;$('#storage-warning').hidden=false;}
      hydrate();$('#progress-filter').innerHTML='<option value="all">Any progress</option>'+stageOptions()+'<option value="active">Opening + in progress</option><option value="finished">Story finished + full</option>';$('#game-status').innerHTML=stageOptions();updatePlatformOptions();render();
      $('#catalogue-date').textContent=baseline.catalogueAsOf?'Catalog imported '+new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(baseline.catalogueAsOf))+'. Progress dates are entered by you.':'';
      if(location.hash==='#edit')editMode(true);
    }catch(error){$('#load-error').hidden=false;$('#games').setAttribute('aria-busy','false');$('#results-count').textContent='The catalog is unavailable.';}
  }
  $('#search').addEventListener('input',e=>{filters.search=e.target.value;render();});$('#platform-filter').addEventListener('change',e=>{filters.platform=e.target.value;render();});$('#progress-filter').addEventListener('change',e=>{filters.progress=e.target.value;render();});$('#sort').addEventListener('change',e=>{filters.sort=e.target.value;render();});
  for(const b of $$('[data-collection]'))b.addEventListener('click',()=>{if(!data)return;filters.collection=b.dataset.collection;updatePlatformOptions();render();});
  for(const b of $$('[data-view]'))b.addEventListener('click',()=>{view=b.dataset.view;render();});
  for(const b of $$('[data-stat]'))b.addEventListener('click',()=>{if(!data)return;filters.progress=b.dataset.stat;render();$('#collection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  $('#chart-legend').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b){filters.progress=b.dataset.stage;render();$('#collection').scrollIntoView({behavior:'smooth'});}});
  $('#games').addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(b)openGame(b.dataset.game,editing);});
  $('#game-details').addEventListener('click',e=>{const b=e.target.closest('[data-edit-entry]');if(b)openGame(b.dataset.editEntry,true);});
  $('#edit-toggle').addEventListener('click',()=>{if(data)editMode(!editing);});$('#export-data').addEventListener('click',exportData);$('#import-data').addEventListener('click',()=>$('#import-file').click());$('#import-file').addEventListener('change',e=>importData(e.target.files[0]));$('#add-game').addEventListener('click',()=>openGame(null,true));
  $('#reset-local').addEventListener('click',()=>{if(!confirm('Reset the progress saved in this browser to the published log? Tap Cancel and Save a backup first if you want to keep your current copy.'))return;snapshot={schemaVersion:1,records:{},customGames:[]};persist();hydrate();updatePlatformOptions();render();toast('This browser’s copy now matches the published log.');});
  $('#clear-filters').addEventListener('click',resetFilters);$('#empty-clear').addEventListener('click',resetFilters);$('#game-form').addEventListener('submit',saveGame);$('#use-today').addEventListener('click',()=>{$('#game-last-played').value=today();});$('#close-game').addEventListener('click',()=>$('#game-dialog').close());$('#cancel-edit').addEventListener('click',()=>{if(adding)$('#game-dialog').close();else openGame(openedId,false);});
  $('#help-button').addEventListener('click',()=>showDialog($('#help-dialog')));$('#close-help').addEventListener('click',()=>$('#help-dialog').close());$('#help-start').addEventListener('click',()=>{$('#help-dialog').close();if(data){editMode(true);$('#search').focus({preventScroll:true});}});
  $('#about-button').addEventListener('click',()=>showDialog($('#about-dialog')));$('#close-about').addEventListener('click',()=>$('#about-dialog').close());$('#retry-load').addEventListener('click',load);
  for(const d of [$('#game-dialog'),$('#about-dialog'),$('#help-dialog')])d.addEventListener('click',e=>{if(e.target===d){const rect=d.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)d.close();}});
  window.PlaythroughLog={getCatalog:()=>data,exportData,resetFilters};
  document.addEventListener('load',e=>{const img=e.target;if(img instanceof HTMLImageElement&&img.dataset.pixel==='true'&&Math.max(img.naturalWidth,img.naturalHeight)<=64)img.classList.add('pixel');},true);
  load();
})();
