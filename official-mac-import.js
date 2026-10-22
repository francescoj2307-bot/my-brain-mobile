/* My Brain Mobile: compatibilità con export JSON My Brain v0.5 (Mac)
   Il contenuto importato resta in locale. Niente API, tracking, upload o sync. */
(()=>{
"use strict";
const DATA_KEYS=["projects","goals","knowledge","decisions","ideas","signals","actions","timeline_events","skills","skill_evidence"];
const AREA={projects:"progetti",goals:"persona",knowledge:"conoscenza",decisions:"decisioni",ideas:"progetti",signals:"progetti",actions:"progetti",timeline_events:"crescita",skills:"conoscenza",skill_evidence:"conoscenza"};
const KIND={projects:"project",goals:"goal",knowledge:"knowledge",decisions:"decision",ideas:"idea",signals:"signal",actions:"task",timeline_events:"state_change",skills:"knowledge",skill_evidence:"knowledge"};
const DESC={projects:["mission","description","phase","next_step"],goals:["description","next_step"],knowledge:["topic","summary","source"],decisions:["context","rationale","alternatives","outcome","reconsider_trigger"],ideas:["content"],signals:["content"],actions:["reason"],timeline_events:["description"],skills:["area","evolution"],skill_evidence:["description"]};
const LABEL={projects:"Progetto",goals:"Obiettivo",knowledge:"Conoscenza",decisions:"Decisione",ideas:"Idea",signals:"Segnale",actions:"Azione",timeline_events:"Timeline",skills:"Competenza",skill_evidence:"Evidenza"};
let lastImport=null;
const $=id=>document.getElementById(id);
const dbName="my-brain-mac-archive";
function openDB(){return new Promise((resolve,reject)=>{const q=indexedDB.open(dbName,1);q.onupgradeneeded=()=>q.result.createObjectStore("backups");q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function putArchive(data){const database=await openDB();return new Promise((resolve,reject)=>{const tx=database.transaction("backups","readwrite");tx.objectStore("backups").put(data,"official-export");tx.oncomplete=()=>{database.close();resolve()};tx.onerror=()=>{database.close();reject(tx.error)}})}
async function getArchive(){const database=await openDB();return new Promise((resolve,reject)=>{const tx=database.transaction("backups","readonly");const req=tx.objectStore("backups").get("official-export");req.onsuccess=()=>{database.close();resolve(req.result||null)};req.onerror=()=>{database.close();reject(req.error)}})}
function download(name,content){const blob=new Blob([content],{type:"application/json;charset=utf-8"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),15000)}
function panel(){return document.getElementById("mac-compat-panel")}
function show(msg,isError=false){const n=$("mac-status");if(n){n.textContent=msg;n.style.color=isError?"#ffb4ab":"#9bdcc4"}}
function safe(v){return v==null?"":String(v)}
function flatten(key,record,projects){
 const name=safe(record.name||record.title||("Elemento "+record.id)).trim()||"Senza titolo";
 const description=(DESC[key]||[]).map(field=>{const v=safe(record[field]).trim();return v?(field==="summary"||field==="content"||field==="description"||field==="mission"?v:field+": "+v):""}).filter(Boolean).join("\n\n");
 const area=AREA[key]||"persona";
 const kind=KIND[key]||"note";
 const project=record.project_id!=null?projects.get(Number(record.project_id)):"";
 const tags=["mac",LABEL[key],...(project?[project]:[])];
 const priority=["High","Critical"].includes(record.priority||record.importance)?"high":"normal";
 const date=record.updated_at||record.created_at||record.event_date||new Date().toISOString();
 return {id:"mac:"+key+":"+String(record.id),title:name.slice(0,240),body:description.slice(0,25000),area,kind,priority,
 status:record.status==="Done"?"done":"active",due:record.due_date||"",tags,created:record.created_at||date,updated:date,
 original:{entity:key,id:record.id,project_id:record.project_id??null,origin:"my-brain-v0.5"}};
}
function validate(data){
 if(!data||typeof data!=="object"||Array.isArray(data)||data.format!=="my-brain-export")throw Error("Serve il file JSON esportato da My Brain sul Mac (formato my-brain-export).");
 const total=DATA_KEYS.reduce((n,k)=>{if(!Array.isArray(data[k]))throw Error("Nell'export manca la sezione "+k);return n+data[k].length},0);
 if(total>75000)throw Error("Archivio troppo grande per questa versione mobile.");
 for(const key of DATA_KEYS)for(const row of data[key])if(!row||typeof row!=="object"||!Number.isInteger(Number(row.id)))throw Error("Record non valido nella sezione "+key);
 return total;
}
async function importMac(file){
 if(!file)return;
 if(file.size>25*1024*1024)throw Error("Archivio oltre il limite di 25 MB.");
 const data=JSON.parse(await file.text()),total=validate(data);
 const bridge=window.MyBrainMobileBridge;
 if(!bridge)throw Error("App da aggiornare: riapri My Brain.");
 const projects=new Map(data.projects.map(p=>[Number(p.id),safe(p.name)]));
 const fresh=[];
 for(const key of DATA_KEYS)for(const row of data[key])if(!row.archived_at)fresh.push(flatten(key,row,projects));
 const existing=bridge.snapshot();
 const mobileOnly=existing.entries.filter(x=>!safe(x.id).startsWith("mac:"));
 const replaceCount=existing.entries.length-mobileOnly.length;
 if(!confirm("Importare "+fresh.length+" elementi attivi dal Mac? Verranno sostituiti "+replaceCount+" elementi già importati dal Mac; i tuoi appunti creati sull'app rimarranno intatti."))return;
 await putArchive(data);
 try{bridge.replaceEntries([...mobileOnly,...fresh], {version:data.version||"0.5.0",at:new Date().toISOString(),total:total,active:fresh.length});}
 catch(error){show("Memoria locale piena: "+error.message,true);return}
 show("Importati "+fresh.length+" elementi. Copia originale conservata sul dispositivo.");
}
function makeButton(label,handler){const b=document.createElement("button");b.type="button";b.className="mac-button";b.textContent=label;b.onclick=handler;return b}
function initialize(){
 const header=document.querySelector(".top"),main=document.querySelector("main");
 if(!header||!main)return;
 const panel=document.createElement("section");panel.id="mac-compat-panel";panel.className="mac-panel";
 const title=document.createElement("strong");title.textContent="My Brain originale · Mac v0.5";
 const caption=document.createElement("p");caption.textContent="Importa il backup JSON dall'app Mac. I contenuti vengono letti solo da questo dispositivo: non vengono caricati su GitHub. La sincronizzazione non è attiva.";
 const controls=document.createElement("div");controls.className="mac-controls";
 const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.id="mac-import";input.hidden=true;
 const choose=makeButton("↑ Importa export Mac",()=>input.click());choose.classList.add("primary");
 const downloadOriginal=makeButton("↓ Esporta originale Mac",async()=>{try{const d=await getArchive();if(!d){show("Non hai ancora importato un backup Mac.",true);return}download("my-brain-originale-mac.json",JSON.stringify(d,null,2));show("Copia Mac originale esportata.")}catch(e){show(e.message,true)}});
 const toggle=makeButton("×",()=>panel.classList.toggle("collapsed"));toggle.title="Apri o chiudi importazione";
 input.addEventListener("change",async()=>{try{show("Lettura archivio…");await importMac(input.files?.[0])}catch(e){show("Importazione non riuscita: "+e.message,true)}finally{input.value=""}});
 const status=document.createElement("div");status.id="mac-status";status.setAttribute("role","status");status.textContent="Nessun dato del Mac trasferito finché non scegli un export JSON.";
 controls.append(choose,downloadOriginal,toggle,input);
 panel.append(title,caption,controls,status);
 header.after(panel);
 getArchive().then(d=>{if(d)show("Archivio Mac locale disponibile. Puoi reimportare un nuovo export in qualsiasi momento.")}).catch(()=>show("Memoria IndexedDB non disponibile; controlla le impostazioni Safari.",true));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);else initialize();
})();