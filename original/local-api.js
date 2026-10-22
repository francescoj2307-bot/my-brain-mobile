/* My Brain v0.5 – Browser-local adapter for the official frontend.
   This preserves the original HTML/CSS/JS; the macOS Python/SQLite Bridge is NOT executed.
   Imported data remain in this device's IndexedDB. */
(function(){
'use strict';
const TABLES=['projects','goals','knowledge','decisions','ideas','signals','actions','timeline_events','skills','skill_evidence'];
const GRAPH=['graph_nodes','graph_edges','graph_memberships','graph_placements','graph_candidates'];
const CORE=['person','preferences','bridge_events','autonomy_activity'];
const VALID=new Set(TABLES);
const dbName='mybrain-official-mobile-v1';
const origFetch=window.fetch.bind(window);
const NOW=()=>new Date().toISOString();
const today=()=>new Date().toISOString().slice(0,10);
let cache=null;
function blank(){return {format:'my-brain-export',version:'0.5.0-mobile',exported_at:NOW(),person:{id:1,name:'Io',tagline:'Il mio sistema cognitivo'},preferences:{theme:'dark',autonomy_mode:'manual'},bridge_events:[],autonomy_activity:[],...Object.fromEntries([...TABLES,...GRAPH].map(k=>[k,[]]))}}
function database(){return new Promise((resolve,reject)=>{const req=indexedDB.open(dbName,1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function load(){if(cache)return cache;const db=await database();const value=await new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),req=tx.objectStore('state').get('working');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();cache=value||blank();for(const t of TABLES.concat(GRAPH))if(!Array.isArray(cache[t]))cache[t]=[];cache.preferences=cache.preferences||{theme:'dark',autonomy_mode:'manual'};cache.bridge_events=cache.bridge_events||[];cache.autonomy_activity=cache.autonomy_activity||[];return cache}
async function write(){const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(cache,'working');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function sourceCopy(exportJson){const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(exportJson,'original-mac-backup');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function getSource(){const db=await database();const obj=await new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),req=tx.objectStore('state').get('original-mac-backup');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();return obj}
function error(message,status=400){return {error:message,__status:status}}
function activeRows(table){return (cache[table]||[]).filter(row=>!row.archived_at).sort((a,b)=>String(b[table==='timeline_events'?'event_date':'updated_at']||'').localeCompare(String(a[table==='timeline_events'?'event_date':'updated_at']||''))).map(row=>{const res={...row};if('project_id' in row)res.project_name=cache.projects.find(p=>p.id===Number(row.project_id))?.name||null;return res})}
function nextId(table){return (cache[table]||[]).reduce((m,r)=>Math.max(m,Number(r.id)||0),0)+1}
function normalizedInput(kind,payload,partial=false){const out={...payload};const titleName=['projects','skills'].includes(kind)?'name':'title';if(!partial||titleName in out){out[titleName]=String(out[titleName]??'').trim();if(!out[titleName])return error('Campo obbligatorio: '+titleName)}for(const [k,v] of Object.entries(out)){if(k.endsWith('_id')||['progress','is_placeholder'].includes(k))out[k]=(v===''||v===null)?null:Number(v);if((k==='due_date'||k==='last_reviewed')&&v==='')out[k]=null}if('progress' in out&&(out.progress<0||out.progress>100))return error('Progresso non valido');if('project_id' in out&&out.project_id&&!activeRows('projects').some(p=>p.id===out.project_id))return error('Progetto non trovato');return out}
function classify(text){const s=text.toLocaleLowerCase('it');const rules=[['DECISION',['ho deciso','decido','scegliamo','decisione']],['ACTION',['devo ','fare ','entro ','prossimo passo']],['IDEA',['idea','potremmo','si potrebbe']],['SIGNAL',['segnale','monitorare','attenzione']],['STATE_CHANGE',['da ora','è cambiato','completato','iniziato']],['KNOWLEDGE',['ho imparato','significa','principio','scoperto']]];for(const [category,terms] of rules)if(terms.some(t=>s.includes(t)))return {category,confidence:82,reason:'Regola locale: rilevato un indicatore di '+category.toLowerCase()+'.'};return {category:'NOTE',confidence:45,reason:'Nessun indicatore forte; nota da rivedere.'}}
function inbox(){return (cache.bridge_events||[]).map(row=>{let data={};try{data=typeof row.payload_json==='string'?JSON.parse(row.payload_json):row.payload_json||{}}catch{};return {event_id:row.event_id,review_status:row.status,title:data.title||row.title||'Evento',summary:data.summary||data.title||row.title||'Evento',received_at:row.received_at,occurred_at:data.occurred_at,source:data.source||'Bridge Mac',source_link:data.source_link||'',importance:data.importance||'Medium',final_importance:row.final_importance||null,state_impact:data.state_impact||'',original_type:row.event_type||data.type||'NOTE',final_type:row.final_event_type||null,original_project:data.project||data.domain||null,original_project_id:row.project_id||null,final_project_id:row.final_project_id||null,project_id:row.final_project_id??row.project_id??null,reviewed_at:row.reviewed_at||null,autonomy_mode:row.autonomy_mode||'manual',autonomy_mode_label:'Manuale',autonomy_reason:row.autonomy_reason||'',resolution_source:row.resolution_source||null,entity:row.entity_type?{type:row.entity_type,id:row.entity_id}:null,metadata:data.metadata||{},relationships:data.relationships||[]}}).sort((a,b)=>String(b.received_at).localeCompare(String(a.received_at)))}
function makeGraph(){
 const ns=new Map(),es=new Map();let nextEdge=1;
 const mk=(id,node_key,title,summary,node_type,source_entity,source_id,significance=.7)=>{
  const row={id,node_key,title,summary:summary||'',node_type,source_entity:source_entity||null,source_id:source_id??null,significance,origin:'memory_projection',emergence_status:'canonical',status:'active',archived_at:null};
  ns.set(id,row);return row;
 };
 const edge=(from,to,relation='contains',primary=true)=>{const id=nextEdge++;es.set(id,{id,source_node_id:from,target_node_id:to,relation_type:relation,strength:.8,is_primary:primary?1:0,origin:'memory_projection',archived_at:null})};
 const rootId=1;
 mk(rootId,'person:1',cache.person?.name||'Io','Il centro del sistema cognitivo personale','person','person',1,1);
 const domains=[['learning','Apprendimento','Conoscenza e competenze'],['projects','Progetti','Ciò che costruisco'],['goals','Obiettivi','La mia direzione'],['decisions','Decisioni','Le scelte consapevoli'],['evolution','Evoluzione','La mia traiettoria']];
 const d={};domains.forEach(([key,title,desc],i)=>{const id=11+i;d[key]=id;mk(id,'domain:'+key,title,desc,'domain',null,null,.91);edge(rootId,id,'contains',true)});
 activeRows('projects').forEach(p=>{const id=100000+p.id;mk(id,'project:'+p.id,p.name,p.description||p.mission||p.next_step,'project','projects',p.id,p.priority==='Critical'?.95:p.priority==='High'?.82:.68);edge(d.projects,id);});
 activeRows('goals').filter(p=>p.status!=='Draft').forEach(p=>{const id=200000+p.id;mk(id,'goal:'+p.id,p.title,p.description||p.next_step,'goal','goals',p.id,.72);edge(d.goals,id,'orients');if(p.project_id&&ns.has(100000+p.project_id))edge(id,100000+p.project_id,'guides',false)});
 activeRows('decisions').filter(p=>p.importance==='High').forEach(p=>{const id=300000+p.id;mk(id,'decision:'+p.id,p.title,p.rationale||p.context,'decision','decisions',p.id,.78);edge(d.decisions,id);if(p.project_id&&ns.has(100000+p.project_id))edge(id,100000+p.project_id,'shapes',false)});
 activeRows('skills').filter(p=>p.level==='Strong').forEach(p=>{const id=400000+p.id;mk(id,'skill:'+p.id,p.name,p.evolution||p.area,'skill','skills',p.id,.79);edge(d.learning,id)});
 const placements=new Map((cache.graph_placements||[]).map(p=>[p.context_node_id+':'+p.node_id,p]));
 const layout={11:[-400,-175],12:[400,-175],13:[420,205],14:[-420,205],15:[0,270]};
 function mapPayload(focus){focus=ns.has(focus)?focus:rootId;const edges=[...es.values()].filter(e=>e.source_node_id===focus||e.target_node_id===focus);const ids=new Set([focus]);edges.forEach(e=>{ids.add(e.source_node_id);ids.add(e.target_node_id)});const nodes=[...ids].map(id=>{const n=ns.get(id);if(!n)return null;const p=placements.get(focus+':'+id);const coords=p?{x:p.x,y:p.y}:focus===rootId&&layout[id]?{x:layout[id][0],y:layout[id][1]}:{x:null,y:null};return {...n,branch_count:[...es.values()].filter(e=>e.source_node_id===id).length,relation_count:[...es.values()].filter(e=>e.source_node_id===id||e.target_node_id===id).length,memory_count:(cache.graph_memberships||[]).filter(m=>m.node_id===id).length||((n.source_entity&&n.source_id)?1:0),...coords,manually_positioned:p?.manually_positioned||0}}).filter(Boolean);
 const crumbs=[],seen=new Set();let cid=focus;while(ns.has(cid)&&!seen.has(cid)){seen.add(cid);const n=ns.get(cid);crumbs.unshift({id:cid,title:n.title,node_type:n.node_type});const parent=[...es.values()].find(e=>e.target_node_id===cid&&e.is_primary);if(!parent)break;cid=parent.source_node_id}
 return {root_id:rootId,focus_id:focus,nodes,edges,breadcrumbs:crumbs};
 }
 return {mapPayload,rootId};
}
async function handler(path,method,body){
 await load();const url=new URL(path,location.origin),p=url.pathname;
 if(method==='GET'){
  if(p==='/api/bootstrap'){const obj={person:cache.person,preferences:cache.preferences||{},bridge_inbox:inbox(),inbox_pending_count:inbox().filter(x=>x.review_status==='Pending Review').length,autonomy_activity:cache.autonomy_activity||[]};TABLES.forEach(t=>obj[t]=activeRows(t));return obj}
  if(p==='/api/export')return {...cache,format:'my-brain-export',version:'0.5.0-mobile',exported_at:NOW()};
  if(p==='/api/inbox')return inbox();
  if(p==='/api/autonomy/activity')return cache.autonomy_activity||[];
  if(p==='/api/map')return makeGraph().mapPayload(Number(url.searchParams.get('focus'))||1);
  if(p==='/api/search'){const q=(url.searchParams.get('q')||'').trim().toLocaleLowerCase('it'),result=[];if(q.length<2)return result;for(const t of TABLES){for(const row of activeRows(t)){const fields=[row.name,row.title,row.description,row.mission,row.summary,row.content,row.context,row.rationale,row.reason,row.evolution,row.area,row.topic];if(fields.some(x=>String(x||'').toLocaleLowerCase('it').includes(q))){result.push({entity:t,id:row.id,label:row.name||row.title});if(result.length>=25)return result}}}return result}
  if(p==='/api/health')return {status:'ok',version:'0.5.0-mobile',local:true};
  if(VALID.has(p.slice(5)))return activeRows(p.slice(5));
 }
 if(method==='POST'){
  if(p==='/api/classify')return classify(String(body.text||''));
  if(p==='/api/map/positions/reset'){const initial=cache.graph_placements.length;cache.graph_placements=cache.graph_placements.filter(p=>!p.manually_positioned);await write();return {ok:true,reset_count:initial-cache.graph_placements.length}}
  const match=/^\/api\/inbox\/([^/]+)\/(confirm|correct|archive)$/.exec(p);
  if(match){const [,raw,action]=match;const id=decodeURIComponent(raw),ev=cache.bridge_events.find(x=>x.event_id===id);if(!ev)return error('Evento non trovato',404);if(ev.status!=='Pending Review')return error('Evento già revisionato',409);ev.status=action==='archive'?'Archived':action==='confirm'?'Confirmed':'Corrected';ev.reviewed_at=NOW();if(action!=='archive'){
    let payload={};try{payload=JSON.parse(ev.payload_json||'{}')}catch{}
    const ty=action==='correct'?body.type:ev.event_type;
    const map={NOTE:'knowledge',KNOWLEDGE:'knowledge',IDEA:'ideas',SIGNAL:'signals',DECISION:'decisions',ACTION:'actions',STATE_CHANGE:'timeline_events'};
    const t=map[ty]||'knowledge';const item={id:nextId(t),person_id:1,title:payload.title||ev.title||'Nuovo elemento',project_id:action==='correct'?body.project_id??null:ev.project_id??null,created_at:NOW(),updated_at:NOW(),archived_at:null};
    if(t==='knowledge')Object.assign(item,{summary:payload.summary||payload.title||'',topic:'Bridge',status:'Active',confidence:'Developing'});
    else if(t==='decisions')Object.assign(item,{context:payload.summary||'',rationale:payload.state_impact||'',importance:payload.importance||'Medium',status:'Open'});
    else if(t==='actions')Object.assign(item,{reason:payload.summary||'',priority:payload.importance||'Medium',status:'Next'});
    else if(t==='timeline_events')Object.assign(item,{description:payload.summary||'',event_date:today(),event_type:'Direction change',importance:payload.importance||'Medium'});
    else Object.assign(item,{content:payload.summary||'',importance:payload.importance||'Medium',status:'Captured'});
    cache[t].push(item);ev.entity_type=t;ev.entity_id=item.id;ev.final_event_type=ty;
  }
  await write();return {event_id:id,review_status:ev.status,graph_updated:action!=='archive'};
  }
  if(VALID.has(p.slice(5))){const t=p.slice(5),clean=normalizedInput(t,body);if(clean.__status)return clean;const record={...clean,id:nextId(t),person_id:1,created_at:NOW(),updated_at:NOW(),archived_at:null};cache[t].push(record);if(t==='projects')cache.timeline_events.push({id:nextId('timeline_events'),person_id:1,project_id:record.id,title:'Nasce '+record.name,description:'Progetto creato in My Brain Mobile.',event_type:'Project birth',event_date:today(),importance:'Medium',created_at:NOW(),updated_at:NOW(),archived_at:null});await write();return record}
 }
 if(method==='PUT'){
  const pref=/^\/api\/preferences\/([a-z_]+)$/.exec(p);if(pref){if(pref[1]==='autonomy_mode'&&body.value!=='manual')return error('La modalità automatica richiede My Brain Bridge sul Mac.');cache.preferences[pref[1]]=String(body.value);await write();return {ok:true,[pref[1]]:body.value}}
  const loc=/^\/api\/map\/positions\/(\d+)$/.exec(p);if(loc){const nodeId=Number(loc[1]),ctx=Number(body.context_id),x=Number(body.x),y=Number(body.y);if(![nodeId,ctx,x,y].every(Number.isFinite))return error('Posizione non valida');const val={id:cache.graph_placements.length+1,node_id:nodeId,context_node_id:ctx,x,y,manually_positioned:1,updated_at:NOW()};cache.graph_placements=cache.graph_placements.filter(p=>!(p.context_node_id===ctx&&p.node_id===nodeId));cache.graph_placements.push(val);await write();return val}
  const nr=/^\/api\/map\/nodes\/(\d+)$/.exec(p);if(nr){const row=cache.graph_nodes.find(x=>x.id===Number(nr[1]));if(!row)return error('Il nodo generato localmente non è modificabile.',404);Object.assign(row,Object.fromEntries(Object.entries(body).filter(([k])=>['title','summary','status'].includes(k))),{origin:'user_override',updated_at:NOW()});await write();return row}
  const edit=/^\/api\/([a-z_]+)\/(\d+)$/.exec(p);if(edit&&VALID.has(edit[1])){const t=edit[1],id=Number(edit[2]),row=cache[t].find(x=>x.id===id);if(!row)return error('Elemento non trovato',404);const clean=normalizedInput(t,body,true);if(clean.__status)return clean;Object.assign(row,clean,{updated_at:NOW()});await write();return row}
 }
 if(method==='DELETE'){
  const edit=/^\/api\/([a-z_]+)\/(\d+)$/.exec(p);if(edit&&VALID.has(edit[1])){const t=edit[1],id=Number(edit[2]),row=cache[t].find(x=>x.id===id);if(!row||row.archived_at)return error('Elemento non trovato',404);row.archived_at=NOW();row.updated_at=NOW();await write();return {ok:true,archived_id:id}}
 }
 return error('Funzione non disponibile in modalità mobile locale',404);
}
window.fetch=async function(input,opts={}){const url=typeof input==='string'?input:input?.url||'';let parsed;try{parsed=new URL(url,location.href)}catch{return origFetch(input,opts)}if(parsed.origin!==location.origin||!parsed.pathname.startsWith('/api/'))return origFetch(input,opts);try{const data=await handler(parsed.pathname+parsed.search,String(opts.method||'GET').toUpperCase(),opts.body?JSON.parse(opts.body):{});const status=data.__status||200;return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8'}})}catch(e){console.error('Local API:',e);return new Response(JSON.stringify({error:'Archivio locale non disponibile: '+e.message}),{status:500,headers:{'Content-Type':'application/json'}})}};
function controls(){
 const root=document.querySelector('.top-actions');if(!root)return;
 const style=document.createElement('style');style.textContent='.portable-button{border:1px solid var(--line-strong);background:var(--panel-2);color:var(--text);padding:8px;border-radius:10px;cursor:pointer;font-size:11px}.mobile-note{padding:9px 15px;color:var(--muted);font-size:11px;background:var(--panel-2);border-bottom:1px solid var(--line)}@media(max-width:620px){.portable-button{padding:7px;font-size:10px}.top-actions{gap:3px}.topbar{padding:0 8px}.identity>span:last-child strong{font-size:10px}}';document.head.append(style);
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;
 const add=(label,fn)=>{const btn=document.createElement('button');btn.type='button';btn.className='portable-button';btn.textContent=label;btn.onclick=fn;root.prepend(btn);return btn};
 add('Importa Mac',()=>input.click());
 add('Copia Mac',async()=>{try{const b=await getSource();if(!b){alert('Nessun export Mac originale importato.');return}download('my-brain-originale-mac.json',b)}catch(e){alert(e.message)}});
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>40*1024*1024)throw Error('File oltre 40 MB');const data=JSON.parse(await file.text());if(data.format!=='my-brain-export'||!Array.isArray(data.projects)||!Array.isArray(data.goals)||!Array.isArray(data.graph_nodes))throw Error('Non è un export JSON valido di My Brain v0.5');if(!confirm('Importare '+TABLES.reduce((sum,t)=>sum+(data[t]?.length||0),0)+' memorie dal Mac? I dati locali dell’app verranno sostituiti. Esporta prima un backup dalla freccia ↓.'))return;await sourceCopy(data);cache=structuredClone(data);for(const t of TABLES.concat(GRAPH))if(!Array.isArray(cache[t]))cache[t]=[];cache.preferences=cache.preferences||{theme:'dark',autonomy_mode:'manual'};cache.preferences.autonomy_mode='manual';cache.bridge_events=cache.bridge_events||[];cache.autonomy_activity=cache.autonomy_activity||[];await write();alert('Memoria importata! La pagina verrà ricaricata.');location.reload()}catch(e){alert('Errore importazione: '+e.message)}finally{input.value=''}};
 root.append(input);
 const banner=document.createElement('div');banner.className='mobile-note';banner.textContent='Versione mobile: frontend ufficiale My Brain v0.5 · archivio locale del dispositivo · Bridge e sincronizzazione Mac non attivi.';document.querySelector('.topbar').after(banner);
}
function download(filename,source){const url=URL.createObjectURL(new Blob([JSON.stringify(source,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',controls);else controls();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();