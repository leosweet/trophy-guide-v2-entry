// Progress storage for the trophy tracker: earned ticks, sub-checklist
// counts and items, and the spoiler setting, all kept in localStorage.
const KEY = 'leonida-legend-v2';

function blankState() {
  return { earned: [], subCounts: {}, subItems: {}, spoiler: false };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return blankState();
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      subCounts: parsed.subCounts && typeof parsed.subCounts === 'object' ? parsed.subCounts : {},
      subItems: parsed.subItems && typeof parsed.subItems === 'object' ? parsed.subItems : {},
      spoiler: parsed.spoiler === true,
    };
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportState(state) {
  return JSON.stringify({ app: 'leonida-legend-v2', version: 1, ...state }, null, 2);
}

export function parseImport(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
  const state = blankState();
  if (Array.isArray(parsed.earned)) state.earned = parsed.earned.filter((n) => typeof n === 'string');
  if (parsed.subCounts && typeof parsed.subCounts === 'object') state.subCounts = parsed.subCounts;
  if (parsed.subItems && typeof parsed.subItems === 'object') state.subItems = parsed.subItems;
  if (parsed.spoiler === true) state.spoiler = true;
  return state;
}

export function clearState() {
  localStorage.removeItem(KEY);
  return blankState();
}
