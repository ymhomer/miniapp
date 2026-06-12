const STORAGE_KEY = 'mermaid-studio.workspace.v1';
const HISTORY_KEY = 'mermaid-studio.history.v1';

export function saveWorkspace(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
}

export function loadWorkspace() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearWorkspace() {
  localStorage.removeItem(STORAGE_KEY);
}

export function saveSnapshot(code) {
  const history = loadHistory();
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    code,
    preview: code.split('\n').slice(0, 3).join(' / '),
    createdAt: Date.now()
  };
  const next = [item, ...history].slice(0, 12);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return item;
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
