// Leonida Legend — tracker logic: list, filters, spoiler mode, detail panel
// with cited guides and sub-checklists, plus the roadmap and timeline views.
import { loadState, saveState, exportState, parseImport, clearState } from './storage.js';
import { renderRoadmap } from './roadmap.js';

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = [...doc.trophies].sort((a, b) => a.id - b.id);
const byId = new Map(trophies.map((t) => [t.id, t]));

const KIND_LABELS = {
  story: 'Story', side: 'Side missions', collectibles: 'Collectibles',
  activities: 'Activities', combat: 'Combat & robberies',
  exploration: 'Exploration', money: 'Money & property', meta: 'Platinum & 100%',
};
const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

let state = loadState();
let earned = new Set(state.earned);
if (params.get('spoiler') === 'on') state.spoiler = true;
if (params.get('demo') === '1') {
  // Screenshot demo only: pre-tick a spread of trophies in memory, never saved.
  for (const id of [2, 3, 4, 8, 9, 20, 21, 35, 38, 44, 47]) earned.add(byId.get(id).name);
  state.subCounts[28] = 12;
  state.subCounts[35] = 100;
  state.subCounts[15] = 187;
}

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detail');
let selectedId = null;
let currentView = 'tracker';

function persist() {
  state.earned = [...earned];
  saveState(state);
}

function isHidden(t) {
  return state.spoiler && t.kind === 'story' && !earned.has(t.name);
}

function displayName(t) {
  return isHidden(t) ? 'Hidden story trophy' : t.name;
}

function subProgress(t) {
  if (!t.sub) return '';
  const doneItems = (t.sub.items || []).filter((item) => state.subItems[t.id + ':' + item]).length;
  const count = state.subCounts[t.id] || 0;
  if (t.sub.type === 'count' || t.sub.type === 'money') {
    const need = t.sub.need;
    const unit = t.sub.type === 'money' ? '$' : '';
    return unit + Math.min(count, t.sub.total).toLocaleString() + ' / ' + unit + need.toLocaleString();
  }
  if (t.sub.items) return doneItems + ' / ' + t.sub.items.length + ' done';
  return '';
}

function kindProgress() {
  const strip = $('kindStrip');
  strip.replaceChildren();
  for (const kind of Object.keys(KIND_LABELS)) {
    const group = trophies.filter((t) => t.kind === kind);
    if (!group.length) continue;
    const got = group.filter((t) => earned.has(t.name)).length;
    const chip = document.createElement('div');
    chip.className = 'kind-chip';
    const label = document.createElement('strong');
    label.textContent = KIND_LABELS[kind] + ' — ' + got + ' / ' + group.length;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = (got / group.length * 100) + '%';
    bar.append(fill);
    chip.append(label, bar);
    strip.append(chip);
  }
}

function filtered() {
  const q = $('search').value.trim().toLowerCase();
  const kind = $('kindFilter').value;
  const grade = $('gradeFilter').value;
  const missableOnly = $('missableOnly').checked;
  const hideEarned = $('hideEarned').checked;
  let out = trophies.filter((t) => {
    if (kind !== 'all' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (missableOnly && !t.missable) return false;
    if (hideEarned && earned.has(t.name)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
  const sort = $('sortFilter').value;
  if (sort === 'grade') out.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.name.localeCompare(b.name));
  else if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  else out.sort((a, b) => a.stage - b.stage || a.id - b.id);
  return out;
}

function renderList() {
  const rows = filtered();
  listEl.replaceChildren();
  for (const t of rows) {
    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'trophy-card' + (earned.has(t.name) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', 'Earned: ' + displayName(t));
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      persist();
      renderAll();
    });
    const body = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = displayName(t);
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = isHidden(t) ? 'A story trophy. Turn spoiler-free mode off, or earn it, to reveal it.' : t.description;
    const tags = document.createElement('span');
    tags.className = 'trophy-tags';
    const gradeTag = document.createElement('span');
    gradeTag.className = 'tag grade-' + t.grade;
    gradeTag.textContent = t.grade;
    tags.append(gradeTag);
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = KIND_LABELS[t.kind];
    tags.append(kindTag);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = 'MISSABLE';
      tags.append(m);
    }
    if (!t.confirmed) {
      const u = document.createElement('span');
      u.className = 'tag unconfirmed';
      u.textContent = 'UNCONFIRMED';
      tags.append(u);
    }
    body.append(name, document.createElement('br'), desc, tags);
    const prog = subProgress(t);
    if (prog) {
      const p = document.createElement('span');
      p.className = 'sub-progress';
      p.textContent = prog;
      body.append(document.createElement('br'), p);
    }
    card.append(box, body);
    card.addEventListener('click', () => select(t.id));
    li.append(card);
    listEl.append(li);
  }
  $('listMeta').textContent = rows.length + ' of 55 trophies shown · ' + earned.size + ' earned';
  $('overallFill').style.width = (earned.size / trophies.length * 100) + '%';
  $('overallCount').textContent = earned.size + ' of 55 earned · ' + Math.round(earned.size / trophies.length * 100) + '%';
  kindProgress();
}

function renderDetail() {
  const t = byId.get(selectedId);
  detailEl.replaceChildren();
  if (!t) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Pick a trophy on the left to read its guide, sources and sub-checklist.';
    detailEl.append(p);
    return;
  }
  if (isHidden(t)) {
    const h = document.createElement('h2');
    h.textContent = 'Hidden story trophy';
    const p = document.createElement('p');
    p.textContent = 'Spoiler-free mode is on. This story trophy stays hidden until you earn it — or turn spoiler-free mode off.';
    detailEl.append(h, p);
    return;
  }
  const h = document.createElement('h2');
  h.textContent = t.name;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = '“' + t.description + '”';
  const meta = document.createElement('p');
  meta.className = 'meta-line';
  meta.textContent = t.grade + ' · ' + KIND_LABELS[t.kind] + ' · Stage ' + t.stage + ' · ' + t.difficulty + ' · ' + t.time + (t.missable ? ' · MISSABLE' : '');
  detailEl.append(h, official, meta);
  if (!t.confirmed) {
    const note = document.createElement('p');
    note.className = 'unconfirmed-note';
    note.textContent = 'Not yet confirmed: no guide has pinned down the exact trigger as of 19 November 2026. This entry says so honestly rather than guessing.';
    detailEl.append(note);
  }
  const gh = document.createElement('h3');
  gh.textContent = 'How to get it';
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = t.guide;
  detailEl.append(gh, guide);
  const sh = document.createElement('h3');
  sh.textContent = 'Sources';
  const ul = document.createElement('ul');
  for (const s of t.sources) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    ul.append(li);
  }
  detailEl.append(sh, ul);
  if (t.sub) renderSub(t);
  const row = document.createElement('div');
  row.className = 'earn-row';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = earned.has(t.name) ? '✓ Earned — unmark' : 'Mark as earned';
  btn.addEventListener('click', () => {
    if (earned.has(t.name)) earned.delete(t.name);
    else earned.add(t.name);
    persist();
    renderAll();
  });
  row.append(btn);
  detailEl.append(row);
}

function renderSub(t) {
  const h = document.createElement('h3');
  h.textContent = 'Your checklist';
  detailEl.append(h);
  if (t.sub.type === 'count' || t.sub.type === 'money') {
    const wrap = document.createElement('div');
    wrap.className = 'sub-count';
    const label = document.createElement('label');
    label.textContent = t.sub.label + ': ';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(t.sub.total);
    input.value = String(state.subCounts[t.id] || 0);
    input.addEventListener('change', () => {
      const v = Math.max(0, Math.min(t.sub.total, Number(input.value) || 0));
      state.subCounts[t.id] = v;
      persist();
      renderAll();
    });
    label.append(input);
    wrap.append(label);
    detailEl.append(wrap);
  }
  if (t.sub.items) {
    const ul = document.createElement('ul');
    ul.className = 'sub-list';
    for (const item of t.sub.items) {
      const li = document.createElement('li');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!state.subItems[t.id + ':' + item];
      box.addEventListener('change', () => {
        state.subItems[t.id + ':' + item] = box.checked;
        persist();
        renderAll();
      });
      const span = document.createElement('span');
      span.textContent = item;
      li.append(box, span);
      ul.append(li);
    }
    detailEl.append(ul);
  }
}

function renderTimeline() {
  const tl = $('timeline');
  tl.replaceChildren();
  const steps = [
    ['Chapter 1 — do it now', 'Positive Mental Attitude: the morning after the mission Down to Earth, talk to Lucia in the kitchen at Jason’s house, follow her to the balcony and choose Accept. Gone after Chapter 1. Whether the trophy strictly needs it is still unconfirmed — do it anyway and keep a Chapter 1 save.'],
    ['Chapter 2 — nothing missable', 'Switching between Jason and Lucia opens after Coffee Break. Both characters together unlock the partner trophies and the double-count meditations.'],
    ['Chapters 3–4 — nothing missable', 'Side questlines (Andy, Kenton, Billy, Randy, Tyrone, Bret) and the Key Cloner, Snap Gun and bank vaults all stay available after the story.'],
    ['Chapter 5 & after the story — nothing missable', 'Free-roam continues with no mission replay. Everything for 100% is still reachable. Keep a save at the start of each chapter anyway: 15 manual slots is plenty.'],
  ];
  for (const [title, text] of steps) {
    const li = document.createElement('li');
    const b = document.createElement('strong');
    b.textContent = title + ': ';
    li.append(b, document.createTextNode(text));
    tl.append(li);
  }
}

function renderSources() {
  const seen = new Map();
  for (const t of trophies) for (const s of t.sources) seen.set(s.url, s.name);
  const ul = $('sourceList');
  ul.replaceChildren();
  for (const [url, name] of seen) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = name;
    li.append(a);
    ul.append(li);
  }
}

function renderAll() {
  renderList();
  renderDetail();
  renderRoadmap($('roadmapStages'), trophies, earned, (id) => {
    showView('tracker');
    select(id);
    document.getElementById('detailCol').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('missableBanner').hidden = !trophies.some((t) => t.missable && !earned.has(t.name));
}

function select(id) {
  selectedId = id;
  renderList();
  renderDetail();
}

function showView(view) {
  currentView = view;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('main').style.display = view === 'tracker' ? '' : 'none';
  $('kindStrip').style.display = view === 'tracker' ? '' : 'none';
  $('toolbar').style.display = view === 'tracker' ? '' : 'none';
  $('roadmapView').hidden = view !== 'roadmap';
  $('missableView').hidden = view !== 'missable';
  $('aboutView').hidden = view !== 'about';
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
for (const id of ['search', 'kindFilter', 'gradeFilter', 'sortFilter', 'missableOnly', 'hideEarned']) {
  $(id).addEventListener('input', renderList);
  $(id).addEventListener('change', renderList);
}
$('spoiler').addEventListener('change', () => {
  state.spoiler = $('spoiler').checked;
  persist();
  renderAll();
});
$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportState(state)], { type: 'application/json' }));
  a.download = 'leonida-legend-progress.json';
  a.click();
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const next = parseImport(await file.text());
    next.earned = next.earned.filter((n) => trophies.some((t) => t.name === n));
    state = next;
    earned = new Set(state.earned);
    $('spoiler').checked = state.spoiler;
    persist();
    renderAll();
  } catch {
    alert('That file is not a Leonida Legend progress export.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned ticks, sub-checklists and settings?')) return;
  state = clearState();
  earned = new Set();
  selectedId = null;
  $('spoiler').checked = false;
  renderAll();
});

$('spoiler').checked = state.spoiler;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selectedId !== null) {
    selectedId = null;
    renderList();
    renderDetail();
  }
});
renderTimeline();
renderSources();
renderAll();
if (params.get('view')) showView(params.get('view'));
if (params.get('open')) select(Number(params.get('open')));
