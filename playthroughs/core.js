(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GameLogCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STAGES=[
    {id:'unrecorded',label:'Unrecorded',color:'#8297ae',rank:-1},
    {id:'not-started',label:'Not started',color:'#b3a0d9',rank:0},
    {id:'opening',label:'Opening / tutorial',color:'#e6c36b',rank:1},
    {id:'in-progress',label:'In progress',color:'#43dce5',rank:2},
    {id:'story-finished',label:'Story finished',color:'#78d6a4',rank:3},
    {id:'fully-completed',label:'Fully completed',color:'#ffac58',rank:4}
  ];
  const stage=id=>STAGES.find(x=>x.id===id)||STAGES[0];
  function safeUrl(value,art=false){if(typeof value!=='string'||!value)return null;if(art&&/^art\/[A-Za-z0-9_./-]+$/.test(value)&&!value.includes('..'))return value;try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
  function validDay(value){if(value===null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Last played must use YYYY-MM-DD.');const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,10)!==value)throw new Error('Last played contains an invalid date.');return value;}
  function cleanText(value,max,label,required=false){if(typeof value!=='string')value='';value=value.trim();if(required&&!value)throw new Error(label+' is missing.');if(value.length>max)throw new Error(label+' is too long.');return value;}
  function normalizeGame(g,i=0){
    if(!g||typeof g!=='object')throw new Error('Game '+(i+1)+' is invalid.');
    const id=cleanText(g.id,160,'Game ID',true);if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id))throw new Error('Game ID contains unsupported characters.');
    if(!STAGES.some(x=>x.id===g.status))throw new Error('Unknown progress stage for '+(g.title||id)+'.');
    const players=Array.from(new Set((Array.isArray(g.players)?g.players:[]).filter(x=>['omni','apple-bridge'].includes(x))));if(!players.length)throw new Error('Choose at least one player for '+(g.title||id)+'.');
    return {id,title:cleanText(g.title,160,'Game title',true),platform:cleanText(g.platform,70,'Platform')||'Other',edition:cleanText(g.edition,500,'Edition'),players,guideUrl:safeUrl(g.guideUrl),art:safeUrl(g.art,true),status:g.status,checkpoint:cleanText(g.checkpoint,1200,'Checkpoint'),lastPlayed:validDay(g.lastPlayed??null),updatedAt:typeof g.updatedAt==='string'&&Number.isFinite(Date.parse(g.updatedAt))?g.updatedAt:null};
  }
  function normalizeCatalog(input){
    if(!input||input.schemaVersion!==1||!Array.isArray(input.games))throw new Error('Choose a version 1 progress.json export.');
    if(input.games.length>1500)throw new Error('This file has more than 1,500 entries.');
    const games=input.games.map(normalizeGame),ids=new Set();for(const g of games){if(ids.has(g.id))throw new Error('Duplicate game ID: '+g.id);ids.add(g.id);}
    return {schemaVersion:1,title:cleanText(input.title,160,'Log title')||'Wakka’s Playthroughs',updatedAt:input.updatedAt||null,catalogueAsOf:input.catalogueAsOf||null,games};
  }
  function filterGames(games,filters){
    const q=(filters.search||'').trim().toLocaleLowerCase();
    const result=games.filter(g=>{
      if(filters.collection==='classic'&&g.platform.toLowerCase()==='ios')return false;
      if(filters.collection==='ios'&&g.platform.toLowerCase()!=='ios')return false;
      if(filters.platform&&filters.platform!=='all'&&g.platform!==filters.platform)return false;
      if(filters.progress==='active'&&!['opening','in-progress'].includes(g.status))return false;
      if(filters.progress==='finished'&&!['story-finished','fully-completed'].includes(g.status))return false;
      if(filters.progress&&!['all','active','finished'].includes(filters.progress)&&g.status!==filters.progress)return false;
      return !q||[g.title,g.edition,g.platform,g.checkpoint].join(' ').toLocaleLowerCase().includes(q);
    });
    return result.sort((a,b)=>{
      if(filters.sort==='recent'){const d=(b.lastPlayed||'').localeCompare(a.lastPlayed||'');if(d)return d;}
      if(filters.sort==='progress'){const d=stage(b.status).rank-stage(a.status).rank;if(d)return d;}
      return a.title.localeCompare(b.title,undefined,{sensitivity:'base'});
    });
  }
  function summarize(games){const counts=Object.fromEntries(STAGES.map(x=>[x.id,0]));for(const g of games)counts[g.status]++;return {total:games.length,active:counts.opening+counts['in-progress'],finished:counts['story-finished']+counts['fully-completed'],unrecorded:counts.unrecorded,counts};}
  return {STAGES,stage,safeUrl,validDay,normalizeGame,normalizeCatalog,filterGames,summarize};
});
