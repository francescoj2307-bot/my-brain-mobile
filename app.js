const workspace = document.querySelector("#workspace");
const editorDialog = document.querySelector("#editor-dialog");
const editorForm = document.querySelector("#editor-form");
const editorFields = document.querySelector("#editor-fields");
const searchDialog = document.querySelector("#search-dialog");
const searchInput = document.querySelector("#search-input");
const searchResults = document.querySelector("#search-results");
const themeToggle = document.querySelector("#theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const inboxBadge = document.querySelector("#inbox-badge");
const autonomyIndicator = document.querySelector("#autonomy-indicator");
const reviewDialog = document.querySelector("#review-dialog");
const reviewForm = document.querySelector("#review-form");

const state = {
  data: null,
  route: "map",
  editor: null,
  reviewEventId: null,
  searchTimer: null,
  map: {
    loadedNodes: new Map(),
    loadedEdges: new Map(),
    positions: new Map(),
    positionContexts: new Map(),
    expanded: new Set(),
    projection: null,
    focusId: null,
    rootId: null,
    selectedId: null,
    history: [],
    pan: {x: 0, y: 0},
    zoom: 1,
    interaction: null,
    suppressedClick: null,
  },
};

const labels = {
  projects: "Progetto",
  goals: "Obiettivo",
  knowledge: "Conoscenza",
  decisions: "Decisione",
  ideas: "Idea",
  signals: "Segnale",
  actions: "Azione",
  timeline_events: "Evento",
  skills: "Competenza",
};

const routeForEntity = {
  projects: "projects",
  goals: "goals",
  knowledge: "learning",
  skills: "learning",
  decisions: "decisions",
  timeline_events: "evolution",
  ideas: "today",
  signals: "today",
  actions: "today",
};

const FORM_CONFIG = {
  projects: [
    ["name", "Nome", "text", true], ["status", "Stato", "select", false, ["Active", "Monitoring", "Paused", "Completed", "Archived"]],
    ["mission", "Missione", "textarea", true], ["description", "Descrizione / contesto", "textarea", true],
    ["priority", "Priorità", "select", false, ["Critical", "High", "Medium", "Low"]], ["energy", "Energia", "select", false, ["High", "Medium", "Low"]],
    ["phase", "Fase attuale", "text", true], ["next_step", "Prossimo passo", "textarea", true],
  ],
  goals: [
    ["title", "Titolo", "text", true], ["project_id", "Progetto collegato", "project", false],
    ["description", "Descrizione", "textarea", true], ["horizon", "Orizzonte", "select", false, ["Adesso", "Prossimi mesi", "Anno", "Futuro"]],
    ["status", "Stato", "select", false, ["Active", "Draft", "Paused", "Completed"]], ["progress", "Progresso %", "number", false],
    ["next_step", "Prossimo passo", "textarea", true], ["is_placeholder", "Tipo", "select", false, [[0, "Reale"], [1, "Placeholder"]]],
  ],
  decisions: [
    ["title", "Decisione", "text", true], ["decision_date", "Data", "date", false], ["project_id", "Progetto collegato", "project", false],
    ["context", "Contesto", "textarea", true], ["rationale", "Motivazione", "textarea", true], ["alternatives", "Alternative considerate", "textarea", true],
    ["status", "Stato", "select", false, ["Open", "Active", "Resolved", "Reconsider"]], ["outcome", "Risultato", "textarea", true],
    ["reconsider_trigger", "Trigger per riconsiderare", "textarea", true], ["reversibility", "Reversibilità", "select", false, ["Reversible", "Partially reversible", "Irreversible"]],
    ["importance", "Importanza", "select", false, ["High", "Medium", "Low"]],
  ],
  knowledge: [
    ["title", "Titolo", "text", true], ["topic", "Topic / area", "text", false], ["project_id", "Progetto collegato", "project", false],
    ["summary", "Sintesi", "textarea", true], ["confidence", "Confidenza", "select", false, ["High", "Developing", "Low"]],
    ["status", "Stato", "select", false, ["Active", "Core", "Review", "Archived"]], ["source", "Fonte", "text", false], ["last_reviewed", "Ultima revisione", "date", false],
  ],
  ideas: [
    ["title", "Titolo", "text", true], ["project_id", "Progetto collegato", "project", false], ["content", "Contenuto", "textarea", true],
    ["importance", "Importanza", "select", false, ["High", "Medium", "Low"]], ["status", "Stato", "select", false, ["Captured", "Exploring", "Developing", "Converted"]], ["origin", "Origine", "text", false],
  ],
  signals: [
    ["title", "Titolo", "text", true], ["project_id", "Progetto collegato", "project", false], ["content", "Contenuto", "textarea", true],
    ["importance", "Importanza", "select", false, ["High", "Medium", "Low"]], ["status", "Stato", "select", false, ["Watching", "Strengthening", "Dismissed", "Converted"]], ["origin", "Origine", "text", false],
  ],
  actions: [
    ["title", "Azione", "text", true], ["project_id", "Progetto collegato", "project", false], ["priority", "Priorità", "select", false, ["High", "Medium", "Low"]],
    ["status", "Stato", "select", false, ["Next", "In progress", "Done", "Waiting"]], ["due_date", "Scadenza (facoltativa)", "date", false], ["reason", "Perché conta", "textarea", true], ["origin", "Origine", "text", false],
  ],
  timeline_events: [
    ["title", "Evento", "text", true], ["project_id", "Progetto collegato", "project", false], ["event_date", "Data", "date", false],
    ["event_type", "Tipo", "select", false, ["Project birth", "Decision", "Skill", "Milestone", "Direction change", "Learning"]], ["importance", "Importanza", "select", false, ["High", "Medium", "Low"]], ["description", "Cosa è cambiato", "textarea", true],
  ],
  skills: [
    ["name", "Competenza", "text", true], ["area", "Area", "text", false], ["level", "Livello", "select", false, ["Exploring", "Developing", "Practiced", "Strong"]],
    ["status", "Stato", "select", false, ["Active", "Paused", "Archived"]], ["evolution", "Evoluzione osservata", "textarea", true],
  ],
};

function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"})[char]);
}

function short(value = "", length = 116) {
  const text = String(value || "");
  return esc(text.length > length ? `${text.slice(0, length - 1)}…` : text);
}

function formatDate(value, style = "short") {
  if (!value) return "—";
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return esc(value);
  return new Intl.DateTimeFormat("it-IT", style === "long" ? {day:"numeric", month:"long", year:"numeric"} : {day:"2-digit", month:"short", year:"numeric"}).format(parsed);
}

function slug(value = "") { return String(value).toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, ""); }

async function api(path, options = {}) {
  const response = await fetch(path, {headers: {"Content-Type": "application/json"}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Operazione non riuscita");
  return data;
}

async function loadData() {
  state.data = await api("/api/bootstrap");
  const savedTheme = state.data.preferences?.theme;
  if (savedTheme === "light" || savedTheme === "dark") applyTheme(savedTheme, false);
  updateInboxBadge();
}

function updateInboxBadge() {
  const pending = Number(state.data.inbox_pending_count || 0);
  inboxBadge.textContent = String(pending);
  inboxBadge.hidden = pending === 0;
  const mode = state.data.preferences?.autonomy_mode || "manual";
  autonomyIndicator.textContent = {manual:"Manuale", assisted:"Assistita", automatic:"Automatica"}[mode] || "Manuale";
}

async function refreshInbox() {
  if (!state.data) return;
  try {
    const items = await api("/api/inbox");
    const before = (state.data.bridge_inbox || []).map(item => `${item.event_id}:${item.review_status}`).join("|");
    const after = items.map(item => `${item.event_id}:${item.review_status}`).join("|");
    state.data.bridge_inbox = items;
    state.data.inbox_pending_count = items.filter(item => item.review_status === "Pending Review").length;
    updateInboxBadge();
    if (state.route === "settings" && before !== after) {
      state.data.autonomy_activity = await api("/api/autonomy/activity");
      renderSettings();
    }
  } catch { /* The next refresh will retry when the local backend is ready. */ }
}

function applyTheme(theme, persist = true) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  themeMeta?.setAttribute("content", next === "light" ? "#f3f4ef" : "#0b0d0c");
  themeToggle.textContent = next === "light" ? "◐" : "☼";
  themeToggle.setAttribute("aria-label", next === "light" ? "Passa al tema scuro" : "Passa al tema chiaro");
  themeToggle.setAttribute("title", next === "light" ? "Passa al tema scuro" : "Passa al tema chiaro");
  themeToggle.setAttribute("aria-pressed", String(next === "light"));
  if (persist) {
    try { localStorage.setItem("my-brain-theme", next); } catch { /* Storage is optional. */ }
  }
}

async function setRoute(route) {
  state.route = route === "inbox" ? "settings" : (routeForEntity[route] || route);
  document.querySelectorAll("[data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === state.route));
  if (state.route === "settings") await refreshInbox();
  render();
  workspace.focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: "smooth"});
}

function viewHeader(eyebrow, title, question, tools = "") {
  return `<header class="view-header"><div class="view-heading"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(question)}</p></div><div class="view-tools">${tools}</div></header>`;
}

function addButton(entity, text = "Aggiungi") {
  return `<button class="button primary" data-add="${entity}">＋ ${esc(text)}</button>`;
}

function tag(value) {
  return `<span class="tag ${slug(value)}">${esc(value || "—")}</span>`;
}

function rowActions(entity, item) {
  return `<div class="entity-actions"><button class="row-button" data-edit="${entity}" data-id="${item.id}" aria-label="Modifica ${esc(item.name || item.title)}">Modifica</button><button class="row-button" data-archive="${entity}" data-id="${item.id}" aria-label="Archivia ${esc(item.name || item.title)}">×</button></div>`;
}

function renderMap() {
  workspace.innerHTML = `<section class="view cognitive-map-view">
    <header class="canvas-header">
      <div><span class="eyebrow">LIVE MEMORY PROJECTION</span><h1>My Brain Map</h1><p>La struttura emerge dalla memoria. Esplora, espandi, sposta.</p></div>
      <div class="map-breadcrumbs" id="map-breadcrumbs" aria-label="Percorso nella mappa"></div>
      <div class="canvas-status"><i></i><span id="canvas-status-text">Sincronizzazione…</span></div>
    </header>
    <div class="infinite-canvas" id="infinite-canvas" tabindex="0" aria-label="Canvas cognitivo infinito. Trascina per muoverti e usa la rotella per lo zoom.">
      <div class="map-grid" aria-hidden="true"></div>
      <div class="map-viewport" id="map-viewport">
        <svg class="graph-links" id="graph-links" aria-hidden="true"></svg>
        <div class="graph-nodes" id="graph-nodes"></div>
      </div>
      <div class="canvas-help"><span>TRASCINA · PAN</span><span>SCROLL · ZOOM</span><span>DOPPIO CLIC · ESPANDI</span></div>
      <div class="canvas-controls">
        <button data-map-control="back" aria-label="Torna al livello precedente" title="Indietro">←</button>
        <button data-map-control="out" aria-label="Riduci zoom">−</button>
        <button class="zoom-readout" id="zoom-readout" data-map-control="reset" aria-label="Centra e ripristina zoom">100%</button>
        <button data-map-control="in" aria-label="Aumenta zoom">＋</button>
        <button class="positions-reset" data-map-control="positions-reset" aria-label="Riporta tutte le sfere alla posizione iniziale" title="Ripristina disposizione sfere"><span aria-hidden="true">↺</span> Sfere</button>
      </div>
      <aside class="node-inspector" id="node-inspector" aria-live="polite"></aside>
      <div class="canvas-loading" id="canvas-loading"><i></i>Proietto la memoria…</div>
    </div>
  </section>`;
  bindCanvasInteractions();
  if (state.map.loadedNodes.size) {
    drawGraph();
  } else {
    loadMapProjection(null, {reset: true});
  }
}

async function loadMapProjection(focusId, {reset = false} = {}) {
  const map = state.map;
  const loading = document.querySelector("#canvas-loading");
  loading?.classList.add("visible");
  try {
    const projection = await api(`/api/map${focusId ? `?focus=${focusId}` : ""}`);
    const actualFocus = projection.focus_id;
    if (reset) {
      map.loadedNodes.clear();
      map.loadedEdges.clear();
      map.positions.clear();
      map.positionContexts.clear();
      map.expanded.clear();
      map.focusId = actualFocus;
      map.rootId = projection.root_id;
      map.selectedId = focusId ? actualFocus : null;
      map.pan = {x: 0, y: 0};
      map.zoom = 1;
    }
    const anchorPosition = map.positions.get(actualFocus) || {x: 0, y: 0};
    const neighbors = projection.nodes.filter(node => node.id !== actualFocus).sort((a, b) => b.significance - a.significance || a.id - b.id);
    projection.nodes.forEach(node => map.loadedNodes.set(node.id, node));
    projection.edges.forEach(edge => map.loadedEdges.set(edge.id, edge));
    if (!map.positions.has(actualFocus)) map.positions.set(actualFocus, reset ? {x: 0, y: 0} : anchorPosition);
    const unplaced = neighbors.filter(node => !map.positions.has(node.id));
    unplaced.forEach((node, index) => {
      const angle = autoLayoutAngle(actualFocus, index, unplaced.length);
      const radius = actualFocus === map.rootId ? 430 : 240;
      const relative = node.x != null && node.y != null ? {x: Number(node.x), y: Number(node.y)} : {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius};
      map.positions.set(node.id, {x: anchorPosition.x + relative.x, y: anchorPosition.y + relative.y});
      map.positionContexts.set(node.id, actualFocus);
    });
    map.positionContexts.set(actualFocus, actualFocus);
    map.expanded.add(actualFocus);
    if (reset || !map.projection) map.projection = projection;
    if (reset && actualFocus === map.rootId) {
      const canvas = document.querySelector("#infinite-canvas");
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        map.zoom = Math.max(.35, Math.min(1, (rect.width - 42) / 1040, (rect.height - 130) / 650));
      }
    }
    if (!reset && focusId) map.pan = {x: -anchorPosition.x * map.zoom, y: -anchorPosition.y * map.zoom};
    drawGraph();
  } catch (error) {
    toast(error.message);
    if (loading) loading.textContent = "Mappa non disponibile";
  } finally {
    loading?.classList.remove("visible");
  }
}

function autoLayoutAngle(focusId, index, total) {
  if (focusId === state.map.rootId && total === 5) {
    return [-2.62, -0.52, 0.48, 2.66, 1.57][index];
  }
  if (total === 1) return Math.PI / 2;
  return (Math.PI * index) / Math.max(total - 1, 1);
}

function visibleGraph() {
  const map = state.map;
  const visible = new Set([map.focusId]);
  const queue = [map.focusId];
  while (queue.length) {
    const current = queue.shift();
    if (!map.expanded.has(current)) continue;
    for (const edge of map.loadedEdges.values()) {
      let next = null;
      if (edge.source_node_id === current) next = edge.target_node_id;
      else if (current === map.focusId && edge.target_node_id === current) next = edge.source_node_id;
      if (next != null && map.loadedNodes.has(next) && !visible.has(next)) {
        visible.add(next);
        queue.push(next);
      }
    }
  }
  return visible;
}

function nodeIcon(type) {
  return {person: "◎", domain: "◌", project: "◒", goal: "↗", decision: "◇", skill: "⌁", concept: "·"}[type] || "·";
}

function drawGraphLinks(visible = visibleGraph()) {
  const linksLayer = document.querySelector("#graph-links");
  if (!linksLayer) return;
  const map = state.map;
  const visibleEdges = [...map.loadedEdges.values()].filter(edge => visible.has(edge.source_node_id) && visible.has(edge.target_node_id));
  linksLayer.innerHTML = visibleEdges.map(edge => {
    const from = map.positions.get(edge.source_node_id);
    const to = map.positions.get(edge.target_node_id);
    if (!from || !to) return "";
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const bend = Math.min(80, Math.hypot(dx, dy) * .12) * (edge.relation_type === "related_to" ? 1 : 0);
    const mx = (from.x + to.x) / 2 - (dy / Math.max(Math.hypot(dx, dy), 1)) * bend;
    const my = (from.y + to.y) / 2 + (dx / Math.max(Math.hypot(dx, dy), 1)) * bend;
    return `<path class="graph-edge ${edge.is_primary ? "primary" : "cross"}" data-edge-id="${edge.id}" d="M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}"/><text class="edge-label" x="${mx}" y="${my - 8}">${esc(edge.relation_type.replaceAll("_", " "))}</text>`;
  }).join("");
}

function drawGraph() {
  const canvas = document.querySelector("#infinite-canvas");
  const viewport = document.querySelector("#map-viewport");
  const nodesLayer = document.querySelector("#graph-nodes");
  const linksLayer = document.querySelector("#graph-links");
  if (!canvas || !viewport || !nodesLayer || !linksLayer) return;
  const map = state.map;
  const visible = visibleGraph();
  const canvasRect = canvas.getBoundingClientRect();
  viewport.style.transform = `translate(${canvasRect.width / 2 + map.pan.x}px, ${canvasRect.height / 2 + map.pan.y}px) scale(${map.zoom})`;
  document.querySelector("#zoom-readout").textContent = `${Math.round(map.zoom * 100)}%`;
  drawGraphLinks(visible);
  nodesLayer.innerHTML = [...visible].map(id => {
    const node = map.loadedNodes.get(id);
    const position = map.positions.get(id) || {x: 0, y: 0};
    const selected = map.selectedId === id;
    const expanded = map.expanded.has(id);
    return `<button class="graph-node type-${slug(node.node_type)} ${selected ? "selected" : ""} ${expanded ? "expanded" : ""}" data-map-node="${id}" style="--node-x:${position.x}px;--node-y:${position.y}px;--importance:${node.significance}" aria-label="${esc(node.title)}. ${node.branch_count} ramificazioni.">
      <span class="graph-node-ring" aria-hidden="true"></span><span class="graph-node-icon">${nodeIcon(node.node_type)}</span><strong>${esc(node.title)}</strong><small>${node.memory_count} MEMORIE · ${node.relation_count} LEGAMI</small>${node.branch_count ? `<em>${expanded ? "−" : "+"}</em>` : ""}
    </button>`;
  }).join("");
  drawInspector();
  drawBreadcrumbs();
  const status = document.querySelector("#canvas-status-text");
  if (status) status.textContent = `${visible.size} nodi visibili · ${map.loadedNodes.size} conosciuti`;
}

function drawInspector() {
  const inspector = document.querySelector("#node-inspector");
  const node = state.map.loadedNodes.get(state.map.selectedId);
  if (!inspector) return;
  if (!node) {
    inspector.className = "node-inspector";
    inspector.innerHTML = "";
    return;
  }
  const route = node.node_key?.startsWith("domain:") ? node.node_key.split(":")[1] : routeForEntity[node.source_entity];
  inspector.className = "node-inspector visible";
  inspector.innerHTML = `<div class="inspector-top"><span class="eyebrow">${esc(node.node_type)} · ${Math.round(node.significance * 100)}% SIGNAL</span><button data-map-action="close" aria-label="Chiudi sintesi">×</button></div>
    <div class="inspector-symbol">${nodeIcon(node.node_type)}</div><h2>${esc(node.title)}</h2><p>${esc(node.summary)}</p>
    <dl><div><dt>Memorie sottostanti</dt><dd>${node.memory_count}</dd></div><div><dt>Relazioni</dt><dd>${node.relation_count}</dd></div><div><dt>Origine</dt><dd>${esc(node.origin.replaceAll("_", " "))}</dd></div></dl>
    <div class="inspector-actions">${node.branch_count ? `<button class="button primary" data-map-action="expand" data-id="${node.id}">${state.map.expanded.has(node.id) ? "Richiudi" : "Espandi"}</button>` : ""}<button class="button" data-map-action="enter" data-id="${node.id}">Entra nel nodo</button>${route ? `<button class="button ghost" data-route="${route}">Apri archivio</button>` : ""}</div>`;
}

function drawBreadcrumbs() {
  const target = document.querySelector("#map-breadcrumbs");
  if (!target) return;
  const crumbs = state.map.projection?.breadcrumbs || [];
  target.innerHTML = crumbs.map((crumb, index) => `<button data-map-focus="${crumb.id}" ${index === crumbs.length - 1 ? "aria-current=page" : ""}>${esc(crumb.title)}</button>${index < crumbs.length - 1 ? "<span>›</span>" : ""}`).join("");
}

async function toggleMapNode(nodeId) {
  const id = Number(nodeId);
  if (state.map.expanded.has(id)) {
    state.map.expanded.delete(id);
    drawGraph();
    return;
  }
  state.map.selectedId = null;
  await loadMapProjection(id);
}

async function enterMapNode(nodeId, addHistory = true) {
  const id = Number(nodeId);
  if (id === state.map.focusId) return;
  if (addHistory && state.map.focusId) state.map.history.push(state.map.focusId);
  await loadMapProjection(id, {reset: true});
}

function setCanvasZoom(nextZoom, point = null) {
  const canvas = document.querySelector("#infinite-canvas");
  if (!canvas) return;
  const map = state.map;
  const oldZoom = map.zoom;
  const next = Math.max(.35, Math.min(2.4, nextZoom));
  if (point) {
    const rect = canvas.getBoundingClientRect();
    const px = point.x - rect.left - rect.width / 2;
    const py = point.y - rect.top - rect.height / 2;
    const worldX = (px - map.pan.x) / oldZoom;
    const worldY = (py - map.pan.y) / oldZoom;
    map.pan.x = px - worldX * next;
    map.pan.y = py - worldY * next;
  }
  map.zoom = next;
  drawGraph();
}

function resetCanvasView() {
  state.map.pan = {x: 0, y: 0};
  state.map.zoom = 1;
  drawGraph();
}

async function resetMapPositions(button) {
  if (button) button.disabled = true;
  try {
    await api("/api/map/positions/reset", {method: "POST", body: "{}"});
    state.map.history = [];
    state.map.selectedId = null;
    state.map.suppressedClick = null;
    await loadMapProjection(null, {reset: true});
    toast("Sfere riportate alla disposizione iniziale.");
  } catch (error) {
    toast(error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

function bindCanvasInteractions() {
  const canvas = document.querySelector("#infinite-canvas");
  if (!canvas) return;
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    setCanvasZoom(state.map.zoom * Math.exp(-event.deltaY * .0012), {x: event.clientX, y: event.clientY});
  }, {passive: false});
  canvas.addEventListener("pointerdown", event => {
    const nodeElement = event.target.closest("[data-map-node]");
    if (event.target.closest(".node-inspector, .canvas-controls, .canvas-header")) return;
    if (nodeElement) {
      const nodeId = Number(nodeElement.dataset.mapNode);
      const position = state.map.positions.get(nodeId);
      state.map.interaction = {type: "node", pointerId: event.pointerId, nodeId, startX: event.clientX, startY: event.clientY, origin: {...position}, moved: false};
      nodeElement.setPointerCapture(event.pointerId);
      nodeElement.classList.add("dragging");
    } else {
      state.map.interaction = {type: "pan", pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: {...state.map.pan}};
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("panning");
    }
  });
  canvas.addEventListener("pointermove", event => {
    const interaction = state.map.interaction;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    if (interaction.type === "pan") {
      state.map.pan = {x: interaction.origin.x + dx, y: interaction.origin.y + dy};
      const viewport = document.querySelector("#map-viewport");
      const rect = canvas.getBoundingClientRect();
      viewport.style.transform = `translate(${rect.width / 2 + state.map.pan.x}px, ${rect.height / 2 + state.map.pan.y}px) scale(${state.map.zoom})`;
    } else {
      interaction.moved = interaction.moved || Math.hypot(dx, dy) > 4;
      const nextPosition = {x: interaction.origin.x + dx / state.map.zoom, y: interaction.origin.y + dy / state.map.zoom};
      state.map.positions.set(interaction.nodeId, nextPosition);
      const node = document.querySelector(`[data-map-node="${interaction.nodeId}"]`);
      node?.style.setProperty("--node-x", `${nextPosition.x}px`);
      node?.style.setProperty("--node-y", `${nextPosition.y}px`);
      drawGraphLinks();
    }
  });
  canvas.addEventListener("pointerup", async event => {
    const interaction = state.map.interaction;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    canvas.classList.remove("panning");
    document.querySelector(`[data-map-node="${interaction.nodeId}"]`)?.classList.remove("dragging");
    state.map.interaction = null;
    if (interaction.type === "node" && interaction.moved) {
      state.map.suppressedClick = {nodeId: interaction.nodeId, until: performance.now() + 500};
      const position = state.map.positions.get(interaction.nodeId);
      const contextId = state.map.positionContexts.get(interaction.nodeId) || state.map.focusId;
      const contextPosition = contextId === interaction.nodeId ? {x: 0, y: 0} : (state.map.positions.get(contextId) || {x: 0, y: 0});
      try {
        await api(`/api/map/positions/${interaction.nodeId}`, {method: "PUT", body: JSON.stringify({context_id: contextId, x: position.x - contextPosition.x, y: position.y - contextPosition.y})});
      } catch (error) { toast(error.message); }
    }
  });
}

function renderProjects() {
  const projects = state.data.projects;
  const focus = projects.find(p => p.priority === "Critical") || projects[0];
  const rows = projects.map(p => `<article class="entity-row"><div class="entity-main"><strong>${esc(p.name)}</strong><p>${short(p.description || p.mission)}</p></div><div class="entity-meta"><label>Fase attuale</label>${short(p.phase, 70)}</div><div class="entity-meta"><label>Prossimo passo</label>${short(p.next_step, 78)}</div>${rowActions("projects", p)}</article>`).join("");
  workspace.innerHTML = `<section class="view">${viewHeader("MONDO · PROGETTI", "Cosa sto costruendo?", "Qui vivono soltanto le costruzioni che cambiano una parte reale del percorso.", addButton("projects", "Nuovo progetto"))}<div class="content-grid">
    ${focus ? `<div class="project-focus"><article class="project-hero"><span>${tag(focus.status)} ${tag(focus.energy + " energy")}</span><h3>${esc(focus.name)}</h3><p>${esc(focus.mission)}</p></article><aside class="next-step-card"><footer>PROSSIMO PASSO · ${esc(focus.name)}</footer><blockquote>“${esc(focus.next_step || "Definisci il prossimo passo.")}”</blockquote></aside></div>` : ""}
    <section class="section-block"><header class="section-title"><h2>Tutti i progetti</h2><span>${projects.length} NEL SISTEMA</span></header><div class="entity-list">${rows || `<div class="empty-state">Nessun progetto attivo.</div>`}</div></section>
  </div></section>`;
}

function renderLearning() {
  const knowledge = state.data.knowledge;
  const topics = ["Professioni Sanitarie", "Intelligenza Artificiale", "Finanza / Investimenti", "Competenze"];
  const areas = topics.map(topic => {
    const count = knowledge.filter(k => k.topic === topic).length + (topic === "Competenze" ? state.data.skills.length : 0);
    return `<article class="learning-area"><span class="orb"></span><div><strong>${esc(topic)}</strong><small>${count} ELEMENT${count === 1 ? "O" : "I"}</small></div></article>`;
  }).join("");
  const rows = knowledge.map(k => `<article class="entity-row"><div class="entity-main"><strong>${esc(k.title)}</strong><p>${short(k.summary)}</p></div><div class="entity-meta"><label>Topic</label>${esc(k.topic || "Non classificato")}</div><div class="entity-meta"><label>Confidenza</label>${tag(k.confidence)}</div>${rowActions("knowledge", k)}</article>`).join("");
  const skills = state.data.skills.map(s => `<article class="entity-row"><div class="entity-main"><strong>${esc(s.name)}</strong><p>${short(s.evolution)}</p></div><div class="entity-meta"><label>Area</label>${esc(s.area)}</div><div class="entity-meta"><label>Livello</label>${tag(s.level)}</div>${rowActions("skills", s)}</article>`).join("");
  workspace.innerHTML = `<section class="view">${viewHeader("MONDO · APPRENDIMENTO", "Cosa sto imparando?", "Conoscenza selettiva: concetti, progressi e competenze che modificano il modo di capire o agire.", `${addButton("knowledge", "Nuova conoscenza")} ${addButton("skills", "Nuova competenza")}`)}<div class="content-grid">
    <div class="learning-areas">${areas}</div>
    <section class="section-block"><header class="section-title"><h2>Knowledge</h2><span>${knowledge.length} CONOSCENZE</span></header><div class="entity-list">${rows || `<div class="empty-state">Aggiungi la prima conoscenza verificata.</div>`}</div></section>
    <section class="section-block"><header class="section-title"><h2>Skills · predisposizione</h2><span>${state.data.skills.length} COMPETENZE</span></header><div class="entity-list">${skills || `<div class="empty-state">Nessuna competenza tracciata.</div>`}</div></section>
  </div></section>`;
}

function renderGoals() {
  const horizons = ["Adesso", "Prossimi mesi", "Anno", "Futuro"];
  const sections = horizons.map(horizon => {
    const items = state.data.goals.filter(goal => goal.horizon === horizon);
    const rows = items.map(goal => `<article class="entity-row"><div class="entity-main"><strong>${esc(goal.title)} ${goal.is_placeholder ? `<span class="tag low">PLACEHOLDER</span>` : ""}</strong><p>${short(goal.description)}</p></div><div class="entity-meta"><label>Progetto</label>${esc(goal.project_name || "Indipendente")}<div class="progress-track"><i style="width:${Number(goal.progress) || 0}%"></i></div></div><div class="entity-meta"><label>Prossimo passo · ${goal.progress}%</label>${short(goal.next_step, 75)}</div>${rowActions("goals", goal)}</article>`).join("");
    return `<section class="section-block"><header class="section-title"><h2>${esc(horizon)}</h2><span>${items.length} OBIETTIVI</span></header><div class="entity-list">${rows || `<div class="empty-state">Nessun obiettivo in questo orizzonte.</div>`}</div></section>`;
  }).join("");
  workspace.innerHTML = `<section class="view">${viewHeader("MONDO · OBIETTIVI", "Dove sto andando?", "Pochi orientamenti, distribuiti nel tempo e collegati a un prossimo passo osservabile.", addButton("goals", "Nuovo obiettivo"))}<div class="content-grid">${sections}</div></section>`;
}

function renderDecisions() {
  const rows = state.data.decisions.map(d => `<article class="entity-row"><div class="entity-main"><strong>${esc(d.title)}</strong><p>${short(d.rationale || d.context)}</p></div><div class="entity-meta"><label>Contesto · ${formatDate(d.decision_date)}</label>${short(d.context, 74)}</div><div class="entity-meta"><label>Riconsidera quando</label>${short(d.reconsider_trigger || "Nessun trigger", 78)}</div>${rowActions("decisions", d)}</article>`).join("");
  workspace.innerHTML = `<section class="view">${viewHeader("MONDO · DECISIONI", "Come penso e come scelgo?", "Una decisione registra una scelta, la sua logica e le condizioni che potrebbero farla cambiare.", addButton("decisions", "Nuova decisione"))}<div class="content-grid">
    <section class="section-block"><header class="section-title"><h2>Decision log</h2><span>${state.data.decisions.length} SCELTE TRACCIATE</span></header><div class="entity-list">${rows || `<div class="empty-state">La prima decisione importante inizierà qui.</div>`}</div></section>
  </div></section>`;
}

function insight() {
  const active = state.data.projects.filter(p => ["Active", "Monitoring"].includes(p.status));
  const missing = active.filter(p => !p.next_step?.trim());
  const unresolved = state.data.decisions.filter(d => !d.outcome?.trim() && ["Open", "Active"].includes(d.status));
  if (missing.length) return `Hai ${active.length} progetti attivi, ma ${missing.length} ${missing.length === 1 ? "non ha" : "non hanno"} un prossimo passo definito.`;
  if (unresolved.length) return `Hai ${unresolved.length} decision${unresolved.length === 1 ? "e importante ancora senza risultato" : "i importanti ancora senza risultato"}.`;
  const recent = state.data.timeline_events[0];
  if (recent) return `L'ultimo cambiamento registrato è “${recent.title}”, collegato a ${recent.project_name || "Personale"}.`;
  return "Il sistema è pronto: registra un cambiamento reale per iniziare a costruire la tua traiettoria.";
}

function renderToday() {
  const priorities = state.data.actions.filter(a => a.status !== "Done").sort((a,b) => ({High:0,Medium:1,Low:2}[a.priority] ?? 3) - ({High:0,Medium:1,Low:2}[b.priority] ?? 3)).slice(0,3);
  const ideas = [...state.data.ideas, ...state.data.signals].sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,4);
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("it-IT", {weekday:"long", day:"numeric", month:"long"}).format(now);
  const stages = priorities.map((action, i) => `<article class="priority-stage"><span class="priority-number">0${i+1}</span><div class="priority-copy"><strong>${esc(action.title)}</strong><span>${esc(action.project_name || "Personale")} · ${esc(action.reason || "Prossima azione")}</span></div>${tag(action.priority)}</article>`).join("");
  const ideaRows = ideas.map(item => `<div class="mini-item"><i></i><div><strong>${esc(item.title)}</strong><small>${short(item.content, 82)}</small></div><time>${item.status === "Watching" ? "SIGNAL" : "IDEA"}</time></div>`).join("");
  const recent = state.data.timeline_events[0];
  workspace.innerHTML = `<section class="view"><div class="today-shell">
    <header class="today-top"><div><span class="eyebrow">CONTROL ROOM</span><h1>Oggi</h1></div><div class="today-date"><strong>${esc(dateText)}</strong>${state.data.projects.filter(p => p.status === "Active").length} progetti attivi · ${priorities.length} priorità</div></header>
    <section><header class="section-title"><h2>Le tre priorità</h2><div>${addButton("actions", "Nuova azione")}</div></header>${stages || `<div class="empty-state">Nessuna prossima azione. Scegli ciò che conta adesso.</div>`}</section>
    <div class="today-lower"><div><aside class="ai-insight"><div class="ai-label"><span>AI INSIGHT · REGOLE LOCALI</span><i></i></div><p>${esc(insight())}</p><small>Nessuna API esterna. Insight calcolato dai dati locali.</small></aside>
      ${recent ? `<section class="section-block"><header class="section-title"><h2>Ultimo cambiamento</h2><span>${formatDate(recent.event_date)}</span></header><div class="mini-item"><i></i><div><strong>${esc(recent.title)}</strong><small>${short(recent.description)}</small></div><time>${esc(recent.event_type)}</time></div></section>` : ""}
    </div><div><header class="section-title"><h2>Idee & segnali recenti</h2><div><button class="button compact" data-add="ideas">＋ Idea</button> <button class="button compact" data-add="signals">＋ Signal</button></div></header><div class="mini-list">${ideaRows || `<div class="empty-state">Nessuna idea recente.</div>`}</div></div></div>
  </div></section>`;
}

function reviewStatusLabel(status) {
  return {"Pending Review":"Da rivedere", Confirmed:"Confermato", Corrected:"Corretto", Archived:"Archiviato"}[status] || status;
}

function inboxCard(item, compact = false) {
  const pending = item.review_status === "Pending Review";
  const proposedProject = item.original_project || "Nessun progetto";
  const finalProject = item.final_project || "Nessun progetto";
  const stateImpact = item.state_impact ? `<div class="inbox-impact"><span>IMPATTO SULLO STATO</span><p>${esc(item.state_impact)}</p></div>` : "";
  const auditTarget = item.review_status === "Archived" ? "NON INTEGRATO" : `${item.final_type || item.original_type} · ${finalProject} · ${item.final_importance || item.importance}`;
  const audit = !pending ? `<div class="inbox-audit"><span>${esc(item.original_type)} · ${esc(proposedProject)}</span><b>→</b><span>${esc(auditTarget)}</span>${item.reviewed_at ? `<time>${formatDate(item.reviewed_at)}</time>` : ""}</div>` : "";
  return `<article class="inbox-card ${pending ? "pending" : "reviewed"} ${compact ? "compact" : ""}">
    <header><div class="inbox-card-tags">${tag(reviewStatusLabel(item.review_status))}${tag(item.original_type)}${tag(item.importance)}</div><time>${formatDate(item.occurred_at || item.received_at)}</time></header>
    <div class="inbox-copy"><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p></div>
    <div class="inbox-facts"><div><label>Origine</label><span>${esc(item.source || "Bridge")}</span></div><div><label>Progetto proposto</label><span>${esc(proposedProject)}</span></div><div><label>Classificazione</label><span>${esc(item.original_type)}</span></div></div>
    ${stateImpact}${audit}
    <details class="inbox-details"><summary>Dettagli</summary><dl><div><dt>Event ID</dt><dd>${esc(item.event_id)}</dd></div><div><dt>Ricevuto</dt><dd>${esc(item.received_at)}</dd></div>${item.source_link ? `<div><dt>Link origine</dt><dd>${esc(item.source_link)}</dd></div>` : ""}</dl></details>
    ${pending ? `<footer class="inbox-actions"><button class="button primary" data-inbox-action="confirm" data-id="${esc(item.event_id)}">Conferma</button><button class="button" data-inbox-action="correct" data-id="${esc(item.event_id)}">Correggi</button><button class="button ghost" data-inbox-action="archive" data-id="${esc(item.event_id)}">Archivia</button></footer>` : ""}
  </article>`;
}

function renderInbox() {
  const items = state.data.bridge_inbox || [];
  const pending = items.filter(item => item.review_status === "Pending Review");
  const history = items.filter(item => item.review_status !== "Pending Review").slice(0, 12);
  workspace.innerHTML = `<section class="view inbox-view">${viewHeader("BRIDGE REVIEW INBOX", "In arrivo", "Pochi secondi per decidere cosa entra davvero nella memoria.", `<span class="pending-summary">${pending.length} DA RIVEDERE</span>`)}<div class="inbox-shell">
    <section><header class="section-title"><h2>Da rivedere</h2><span>RECENTI PRIMA</span></header><div class="inbox-list">${pending.map(item => inboxCard(item)).join("") || `<div class="inbox-zero"><span>✓</span><h2>Tutto revisionato</h2><p>I nuovi eventi del Bridge compariranno qui.</p></div>`}</div></section>
    ${history.length ? `<section class="section-block inbox-history"><header class="section-title"><h2>Revisioni recenti</h2><span>AUDIT LOCALE</span></header><div class="inbox-list">${history.map(item => inboxCard(item, true)).join("")}</div></section>` : ""}
  </div></section>`;
}

function autonomyModeCard(mode, title, statement, detail) {
  const current = (state.data.preferences?.autonomy_mode || "manual") === mode;
  return `<button class="autonomy-card ${current ? "selected" : ""}" data-autonomy-mode="${mode}" aria-pressed="${current}">
    <span class="autonomy-choice"><i></i><b>${esc(title)}</b>${current ? `<em>ATTIVA</em>` : ""}</span>
    <strong>${esc(statement)}</strong><p>${esc(detail)}</p>
  </button>`;
}

function activityCard(item) {
  const undone = Boolean(item.undone_at);
  return `<article class="activity-card ${undone ? "undone" : ""}">
    <div class="activity-mark">${undone ? "↶" : "✓"}</div><div><header><span>${esc({automatic:"AUTOMATICA", assisted:"ASSISTITA", manual:"MANUALE"}[item.autonomy_mode] || item.autonomy_mode)}</span><time>${formatDate(item.created_at)}</time></header><p>${esc(item.summary)}</p>${undone ? `<small>${esc(item.undo_summary || "Attività annullata")}</small>` : ""}</div>
    ${item.reversible && !undone ? `<button class="button ghost compact" data-activity-undo="${item.id}">Annulla e rivedi</button>` : ""}
  </article>`;
}

function renderSettings() {
  const items = state.data.bridge_inbox || [];
  const pending = items.filter(item => item.review_status === "Pending Review");
  const history = items.filter(item => item.review_status !== "Pending Review").slice(0, 8);
  const activities = state.data.autonomy_activity || [];
  const autonomyMode = state.data.preferences?.autonomy_mode || "manual";
  const manualReview = autonomyMode === "manual";
  workspace.innerHTML = `<section class="view settings-view">
    ${viewHeader("IMPOSTAZIONI", "Quanto vuoi fidarti di My Brain?", "Scegli chi prende l’ultima decisione quando arriva una nuova informazione.", `<span class="pending-summary">${pending.length} DA RIVEDERE</span>`)}
    <div class="settings-shell">
      <section class="settings-section"><header class="section-title"><h2>Chi decide cosa entra in My Brain?</h2><span>MEMORIZZATO SU QUESTO MAC</span></header>
        <div class="manual-review-control ${manualReview ? "is-manual" : "is-autonomous"}">
          <div class="manual-review-copy"><span class="eyebrow">CONTROLLO PRINCIPALE</span><h3>Revisione manuale</h3><p>${manualReview ? "Ogni elemento resta In arrivo. Sei tu ad accettarlo, correggerlo oppure archiviarlo." : "Le proposte vengono integrate autonomamente usando le regole locali disponibili, senza attendere la tua conferma."}</p></div>
          <button class="manual-review-switch" role="switch" aria-checked="${manualReview}" data-manual-review-toggle aria-label="${manualReview ? "Disattiva" : "Attiva"} la revisione manuale">
            <span class="switch-track" aria-hidden="true"><i></i></span><strong>${manualReview ? "ATTIVA" : "NON ATTIVA"}</strong><small>${manualReview ? "Decidi tu" : "Lavora autonomamente"}</small>
          </button>
        </div>
        <div class="autonomy-explanation"><i></i><p>${manualReview ? "Bridge → Gatekeeper → In arrivo → tua decisione → memoria" : "Bridge → Gatekeeper → memoria, con cronologia e possibilità di annullare"}</p></div>
        <details class="autonomy-levels" ${autonomyMode === "assisted" ? "open" : ""}>
          <summary>Regola il livello in dettaglio <span>${esc({manual:"Manuale",assisted:"Assistita",automatic:"Automatica"}[autonomyMode])}</span></summary>
          <div class="autonomy-grid">
            ${autonomyModeCard("manual", "Manuale", "My Brain propone. Tu decidi.", "Ogni evento resta In arrivo finché non lo confermi, correggi o archivi.")}
            ${autonomyModeCard("assisted", "Assistita", "My Brain collabora con prudenza.", "Senza un segnale semantico affidabile, per ora gli eventi restano da rivedere.")}
            ${autonomyModeCard("automatic", "Automatica", "Il Gatekeeper lavora in autonomia.", "Usa il routing deterministico esistente e registra ogni assimilazione importante.")}
          </div>
        </details>
      </section>
      <section class="settings-section inbox-inside-settings"><header class="section-title"><div><span class="eyebrow">BRIDGE REVIEW INBOX</span><h2>In arrivo</h2></div><span>RECENTI PRIMA</span></header>
        <p class="settings-intro">La zona di passaggio: qui decidi in pochi secondi cosa entra davvero nella memoria.</p>
        <div class="inbox-list">${pending.map(item => inboxCard(item)).join("") || `<div class="inbox-zero"><span>✓</span><h2>Tutto revisionato</h2><p>I nuovi eventi da controllare compariranno qui.</p></div>`}</div>
      </section>
      <section class="settings-section"><header class="section-title"><h2>Attività autonome</h2><span>TRASPARENZA E CONTROLLO</span></header>
        <div class="activity-list">${activities.map(activityCard).join("") || `<div class="empty-state">Nessuna attività automatica registrata.</div>`}</div>
      </section>
      ${history.length ? `<section class="settings-section"><header class="section-title"><h2>Revisioni recenti</h2><span>AUDIT LOCALE</span></header><div class="inbox-list">${history.map(item => inboxCard(item, true)).join("")}</div></section>` : ""}
    </div>
  </section>`;
}

function renderEvolution() {
  const events = [...state.data.timeline_events].sort((a,b) => String(a.event_date).localeCompare(String(b.event_date)));
  const timeline = events.map(e => `<article class="timeline-event"><time>${formatDate(e.event_date).toUpperCase()} · ${esc(e.event_type).toUpperCase()}</time><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><footer><span>${tag(e.importance)}</span>${rowActions("timeline_events", e)}</footer></article>`).join("");
  workspace.innerHTML = `<section class="view">${viewHeader("MONDO · EVOLUZIONE", "Come sto cambiando?", "La traiettoria personale: eventi che hanno modificato progetti, direzione, competenze o comprensione.", addButton("timeline_events", "Registra cambiamento"))}<div class="content-grid"><div class="timeline">${timeline || `<div class="empty-state">La tua timeline inizia con il primo cambiamento registrato.</div>`}<div class="timeline-now">OGGI · QUI</div></div></div></section>`;
}

function render() {
  if (!state.data) return;
  const views = {map: renderMap, projects: renderProjects, learning: renderLearning, goals: renderGoals, decisions: renderDecisions, evolution: renderEvolution, today: renderToday, settings: renderSettings};
  (views[state.route] || renderMap)();
}

function openReviewCorrection(eventId) {
  const item = state.data.bridge_inbox.find(candidate => candidate.event_id === eventId);
  if (!item) return toast("Evento non trovato");
  state.reviewEventId = eventId;
  document.querySelector("#review-title").textContent = item.title;
  document.querySelector("#review-original").innerHTML = `<span>PROPOSTA ORIGINALE</span><strong>${esc(item.original_type)}</strong><p>${esc(item.original_project || "Nessun progetto proposto")} · ${esc(item.importance)}</p>`;
  const categories = ["NOTE", "KNOWLEDGE", "IDEA", "SIGNAL", "DECISION", "ACTION", "STATE_CHANGE"];
  document.querySelector("#review-type").innerHTML = categories.map(type => `<option value="${type}" ${type === item.original_type ? "selected" : ""}>${type}</option>`).join("");
  document.querySelector("#review-project").innerHTML = `
    <option value="">Nessun progetto</option>${state.data.projects.map(project => `<option value="${project.id}" ${project.id === item.original_project_id ? "selected" : ""}>${esc(project.name)}</option>`).join("")}`;
  document.querySelector("#review-importance").value = item.importance || "Medium";
  reviewDialog.showModal();
  requestAnimationFrame(() => document.querySelector("#review-type").focus());
}

function invalidateMapProjection() {
  state.map.loadedNodes.clear();
  state.map.loadedEdges.clear();
  state.map.projection = null;
}

async function reviewInboxEvent(eventId, action, payload = {}) {
  try {
    const result = await api(`/api/inbox/${encodeURIComponent(eventId)}/${action}`, {method: "POST", body: JSON.stringify(payload)});
    if (["confirm", "correct"].includes(action)) invalidateMapProjection();
    await loadData();
    render();
    toast(action === "confirm" ? "Evento confermato e integrato." : action === "correct" ? "Correzione salvata e integrata." : "Evento archiviato senza modificare la memoria.");
    return result;
  } catch (error) {
    toast(error.message);
    return null;
  }
}

async function setAutonomyMode(mode, button) {
  if (!state.data || state.data.preferences?.autonomy_mode === mode) return;
  button.disabled = true;
  try {
    await api("/api/preferences/autonomy_mode", {method:"PUT", body:JSON.stringify({value: mode})});
    state.data.preferences.autonomy_mode = mode;
    updateInboxBadge();
    renderSettings();
    toast(`Modalità ${autonomyIndicator.textContent} memorizzata.`);
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
}

async function undoAutonomyActivity(activityId, button) {
  button.disabled = true;
  try {
    await api(`/api/autonomy/activity/${activityId}/undo`, {method:"POST", body:"{}"});
    invalidateMapProjection();
    await loadData();
    renderSettings();
    toast("Assimilazione annullata. L’evento è tornato In arrivo.");
  } catch (error) { toast(error.message); button.disabled = false; }
}

function defaultValue(entity, field) {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = {
    decision_date: today, event_date: today, evidence_date: today, progress: 0, is_placeholder: 0,
    priority: "Medium", energy: "Medium", status: entity === "actions" ? "Next" : entity === "signals" ? "Watching" : entity === "ideas" ? "Captured" : entity === "decisions" ? "Open" : "Active",
    importance: "Medium", horizon: "Adesso", confidence: "Developing", reversibility: "Reversible", event_type: "Milestone", origin: "Manual", level: "Developing",
  };
  return defaults[field] ?? "";
}

function fieldHtml(config, value) {
  const [name, label, type, wide, options] = config;
  const id = `field-${name}`;
  const required = ["name", "title"].includes(name) ? "required" : "";
  let control;
  if (type === "textarea") {
    control = `<textarea id="${id}" name="${name}" ${required}>${esc(value)}</textarea>`;
  } else if (type === "select" || type === "project") {
    const choices = type === "project" ? [["", "Nessun progetto"], ...state.data.projects.map(p => [p.id, p.name])] : options.map(item => Array.isArray(item) ? item : [item, item]);
    control = `<select id="${id}" name="${name}">${choices.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}" ${String(value ?? "") === String(optionValue) ? "selected" : ""}>${esc(optionLabel)}</option>`).join("")}</select>`;
  } else {
    control = `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" ${type === "number" ? 'min="0" max="100"' : ""} ${required}>`;
  }
  return `<div class="form-field ${wide ? "wide" : ""}"><label for="${id}">${esc(label)}</label>${control}</div>`;
}

function openEditor(entity, id = null) {
  const config = FORM_CONFIG[entity];
  if (!config) return toast("Editor non disponibile per questa entità");
  const item = id ? state.data[entity].find(candidate => candidate.id === Number(id)) : null;
  state.editor = {entity, id: id ? Number(id) : null};
  document.querySelector("#editor-eyebrow").textContent = item ? "MODIFICA ELEMENTO" : "NUOVO ELEMENTO";
  document.querySelector("#editor-title").textContent = `${item ? "Modifica" : "Aggiungi"} ${labels[entity].toLowerCase()}`;
  editorFields.innerHTML = config.map(field => fieldHtml(field, item?.[field[0]] ?? defaultValue(entity, field[0]))).join("");
  editorDialog.showModal();
  requestAnimationFrame(() => editorFields.querySelector("input, textarea, select")?.focus());
}

async function saveEditor() {
  const {entity, id} = state.editor;
  const payload = Object.fromEntries(new FormData(editorForm).entries());
  try {
    await api(`/api/${entity}${id ? `/${id}` : ""}`, {method: id ? "PUT" : "POST", body: JSON.stringify(payload)});
    editorDialog.close();
    await loadData();
    render();
    toast(`${labels[entity]} ${id ? "aggiornato" : "creato"}.`);
  } catch (error) {
    toast(error.message);
  }
}

async function archiveEntity(entity, id) {
  const item = state.data[entity].find(candidate => candidate.id === Number(id));
  if (!item || !confirm(`Archiviare “${item.name || item.title}”? I dati resteranno nel database e nell'export.`)) return;
  try {
    await api(`/api/${entity}/${id}`, {method: "DELETE"});
    await loadData();
    render();
    toast(`${labels[entity]} archiviato.`);
  } catch (error) { toast(error.message); }
}

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  document.querySelector("#toast-region").append(item);
  setTimeout(() => item.remove(), 3200);
}

async function exportData() {
  try {
    const response = await fetch("/api/export");
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `my-brain-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
    toast("Backup JSON esportato.");
  } catch { toast("Impossibile esportare il backup."); }
}

function openSearch() {
  if (!searchDialog.open) searchDialog.showModal();
  searchInput.value = "";
  searchResults.innerHTML = `<p class="search-empty">Inizia a digitare per cercare progetti, decisioni, conoscenze, obiettivi, idee e azioni.</p>`;
  requestAnimationFrame(() => searchInput.focus());
}

async function search(query) {
  if (query.trim().length < 2) {
    searchResults.innerHTML = `<p class="search-empty">Scrivi almeno due caratteri.</p>`;
    return;
  }
  try {
    const results = await api(`/api/search?q=${encodeURIComponent(query.trim())}`);
    searchResults.innerHTML = results.length ? results.map(result => `<button class="search-result" data-search-route="${routeForEntity[result.entity] || "map"}"><span>${esc(result.label)}</span><span>${esc(labels[result.entity] || result.entity)}</span></button>`).join("") : `<p class="search-empty">Nessun elemento trovato.</p>`;
  } catch { searchResults.innerHTML = `<p class="search-empty">Ricerca non disponibile.</p>`; }
}

document.addEventListener("click", event => {
  const reviewClose = event.target.closest("[data-review-close]");
  if (reviewClose) return reviewDialog.close();
  const inboxAction = event.target.closest("[data-inbox-action]");
  if (inboxAction) {
    const action = inboxAction.dataset.inboxAction;
    if (action === "correct") return openReviewCorrection(inboxAction.dataset.id);
    return reviewInboxEvent(inboxAction.dataset.id, action);
  }
  const manualToggle = event.target.closest("[data-manual-review-toggle]");
  if (manualToggle) {
    const isManual = (state.data.preferences?.autonomy_mode || "manual") === "manual";
    return setAutonomyMode(isManual ? "automatic" : "manual", manualToggle);
  }
  const autonomyMode = event.target.closest("[data-autonomy-mode]");
  if (autonomyMode) return setAutonomyMode(autonomyMode.dataset.autonomyMode, autonomyMode);
  const activityUndo = event.target.closest("[data-activity-undo]");
  if (activityUndo) return undoAutonomyActivity(Number(activityUndo.dataset.activityUndo), activityUndo);
  const dialogClose = event.target.closest("[data-dialog-close]");
  if (dialogClose) return editorDialog.close();
  const mapControl = event.target.closest("[data-map-control]");
  if (mapControl) {
    const control = mapControl.dataset.mapControl;
    if (control === "in") setCanvasZoom(state.map.zoom * 1.2);
    if (control === "out") setCanvasZoom(state.map.zoom / 1.2);
    if (control === "reset") resetCanvasView();
    if (control === "positions-reset") resetMapPositions(mapControl);
    if (control === "back") {
      const target = state.map.history.pop() || state.map.rootId;
      enterMapNode(target, false);
    }
    return;
  }
  const mapAction = event.target.closest("[data-map-action]");
  if (mapAction) {
    const action = mapAction.dataset.mapAction;
    if (action === "close") { state.map.selectedId = null; drawInspector(); }
    if (action === "expand") toggleMapNode(mapAction.dataset.id);
    if (action === "enter") enterMapNode(mapAction.dataset.id);
    return;
  }
  const mapFocus = event.target.closest("[data-map-focus]");
  if (mapFocus) return enterMapNode(mapFocus.dataset.mapFocus);
  const mapNode = event.target.closest("[data-map-node]");
  if (mapNode) {
    const nodeId = Number(mapNode.dataset.mapNode);
    const suppressed = state.map.suppressedClick;
    state.map.suppressedClick = null;
    if (suppressed?.nodeId === nodeId && performance.now() <= suppressed.until) return;
    state.map.selectedId = nodeId;
    drawGraph();
    return;
  }
  const route = event.target.closest("[data-route]");
  if (route) return setRoute(route.dataset.route);
  const add = event.target.closest("[data-add]");
  if (add) return openEditor(add.dataset.add);
  const edit = event.target.closest("[data-edit]");
  if (edit) return openEditor(edit.dataset.edit, edit.dataset.id);
  const archive = event.target.closest("[data-archive]");
  if (archive) return archiveEntity(archive.dataset.archive, archive.dataset.id);
  const searchRoute = event.target.closest("[data-search-route]");
  if (searchRoute) { searchDialog.close(); setRoute(searchRoute.dataset.searchRoute); }
});

document.addEventListener("dblclick", event => {
  const mapNode = event.target.closest("[data-map-node]");
  if (mapNode) {
    event.preventDefault();
    toggleMapNode(mapNode.dataset.mapNode);
  }
});

editorForm.addEventListener("submit", event => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") return editorDialog.close();
  saveEditor();
});

reviewForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(reviewForm);
  const projectValue = form.get("project_id");
  const result = await reviewInboxEvent(state.reviewEventId, "correct", {
    type: form.get("type"),
    project_id: projectValue ? Number(projectValue) : null,
    importance: form.get("importance"),
  });
  if (result) reviewDialog.close();
});

document.querySelector("#search-trigger").addEventListener("click", openSearch);
document.querySelector("#export-button").addEventListener("click", exportData);
themeToggle.addEventListener("click", async () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  themeToggle.disabled = true;
  try {
    await api("/api/preferences/theme", {method: "PUT", body: JSON.stringify({value: next})});
    if (state.data) state.data.preferences = {...state.data.preferences, theme: next};
    toast(next === "light" ? "Tema chiaro memorizzato." : "Tema scuro memorizzato.");
  } catch (error) {
    toast(`Tema applicato solo per questa sessione: ${error.message}`);
  } finally {
    themeToggle.disabled = false;
  }
});
searchInput.addEventListener("input", () => {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => search(searchInput.value), 180);
});
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
  if (event.key === "Escape" && searchDialog.open) searchDialog.close();
});

async function start() {
  workspace.innerHTML = `<div class="empty-state" style="margin:80px auto;max-width:420px">Avvio del sistema cognitivo locale…</div>`;
  try {
    await loadData();
    render();
  } catch (error) {
    workspace.innerHTML = `<div class="empty-state" style="margin:80px auto;max-width:520px">My Brain non riesce a leggere il database locale.<br><br>${esc(error.message)}</div>`;
  }
}

applyTheme(document.documentElement.dataset.theme, false);
start();
setInterval(refreshInbox, 10_000);