import { templates, snippets } from './templates.js';
import { initializeMermaid, renderMermaid } from './renderer.js';
import { exportSvg, exportPng, copyToClipboard } from './export.js';
import { saveWorkspace, loadWorkspace, clearWorkspace, saveSnapshot, loadHistory, clearHistory } from './storage.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const editor = $('#codeEditor');
const lineNumbers = $('#lineNumbers');
const diagramLayer = $('#diagramLayer');
const canvasStage = $('#canvasStage');
const svgSource = $('#svgSource');
const consoleStatus = $('#consoleStatus');
const consoleMessage = $('#consoleMessage');
const toastStack = $('#toastStack');

const state = {
  currentSvg: '',
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: { x: 0, y: 0 },
  renderTimer: null,
  settings: {
    theme: 'dark',
    securityLevel: 'strict',
    curve: 'basis',
    fontSize: 16,
    background: '#111318',
    autoRender: true,
    autoSave: true,
    grid: true
  }
};

const defaultCode = templates[0].code;

function init() {
  const saved = loadWorkspace();
  if (saved?.settings) state.settings = { ...state.settings, ...saved.settings };

  editor.value = saved?.code || defaultCode;
  hydrateSettingsControls();
  initializeMermaid(state.settings);
  renderTemplateList();
  renderHistoryList();
  bindEvents();
  updateMetrics();
  updateLineNumbers();
  setCanvasTransform();
  scheduleRender(50);
}

function hydrateSettingsControls() {
  $('#themeSelect').value = state.settings.theme;
  $('#securitySelect').value = state.settings.securityLevel;
  $('#curveSelect').value = state.settings.curve;
  $('#fontSizeInput').value = state.settings.fontSize;
  $('#backgroundInput').value = state.settings.background;
  $('#autoRenderToggle').checked = state.settings.autoRender;
  $('#autoSaveToggle').checked = state.settings.autoSave;
  $('#gridToggle').checked = state.settings.grid;
  canvasStage.classList.toggle('grid-on', state.settings.grid);
  canvasStage.style.setProperty('--bg-soft', state.settings.background);
}

function bindEvents() {
  editor.addEventListener('input', () => {
    updateLineNumbers();
    updateMetrics();
    if (state.settings.autoSave) persist();
    if (state.settings.autoRender) scheduleRender();
  });

  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  editor.addEventListener('keydown', handleEditorKeys);

  $('#renderBtn').addEventListener('click', () => renderNow());
  $('#newDiagramBtn').addEventListener('click', createNewDiagram);
  $('#formatBtn').addEventListener('click', formatCode);
  $('#copyCodeBtn').addEventListener('click', async () => {
    await copyToClipboard(editor.value);
    toast('Code copied.', 'success');
  });
  $('#saveSnapshotBtn').addEventListener('click', () => {
    saveSnapshot(editor.value);
    renderHistoryList();
    toast('Snapshot saved.', 'success');
  });

  $('#templateSearch').addEventListener('input', renderTemplateList);

  $$('.rail-button').forEach(button => {
    button.addEventListener('click', () => switchPanel(button.dataset.panel));
  });

  $$('.snippet-card').forEach(button => {
    button.addEventListener('click', () => insertAtCursor(snippets[button.dataset.snippet] || ''));
  });

  $('#clearHistoryBtn').addEventListener('click', () => {
    clearHistory();
    renderHistoryList();
    toast('History cleared.');
  });

  $('#resetWorkspaceBtn').addEventListener('click', () => {
    clearWorkspace();
    editor.value = defaultCode;
    updateLineNumbers();
    updateMetrics();
    scheduleRender(30);
    toast('Workspace reset.');
  });

  ['themeSelect', 'securitySelect', 'curveSelect', 'fontSizeInput', 'backgroundInput'].forEach(id => {
    $(`#${id}`).addEventListener('change', handleSettingChange);
  });

  ['autoRenderToggle', 'autoSaveToggle', 'gridToggle'].forEach(id => {
    $(`#${id}`).addEventListener('change', handleSettingChange);
  });

  $('#zoomOutBtn').addEventListener('click', () => setZoom(state.zoom - 0.1));
  $('#zoomInBtn').addEventListener('click', () => setZoom(state.zoom + 0.1));
  $('#fitBtn').addEventListener('click', fitToView);
  $('#exportSvgBtn').addEventListener('click', () => {
    if (!state.currentSvg) return toast('Render a diagram first.', 'error');
    exportSvg(state.currentSvg, 'mermaid-diagram.svg');
  });
  $('#exportPngBtn').addEventListener('click', async () => {
    if (!state.currentSvg) return toast('Render a diagram first.', 'error');
    try {
      await exportPng(state.currentSvg, 'mermaid-diagram.png', state.settings.background);
    } catch (error) {
      toast(`PNG export failed: ${error.message}`, 'error');
    }
  });

  $$('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchPreview(button.dataset.previewMode));
  });

  canvasStage.addEventListener('wheel', handleWheel, { passive: false });
  canvasStage.addEventListener('pointerdown', handlePanStart);
  window.addEventListener('pointermove', handlePanMove);
  window.addEventListener('pointerup', handlePanEnd);
}

function handleEditorKeys(event) {
  if (event.key === 'Tab') {
    event.preventDefault();
    insertAtCursor('  ');
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
    event.preventDefault();
    renderNow();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    persist();
    saveSnapshot(editor.value);
    renderHistoryList();
    toast('Saved locally.', 'success');
  }
}

function insertAtCursor(text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = `${editor.value.slice(0, start)}${text}${editor.value.slice(end)}`;
  editor.selectionStart = editor.selectionEnd = start + text.length;
  editor.focus();
  updateLineNumbers();
  updateMetrics();
  if (state.settings.autoSave) persist();
  if (state.settings.autoRender) scheduleRender();
}

function renderTemplateList() {
  const container = $('#templateList');
  const query = ($('#templateSearch').value || '').trim().toLowerCase();
  const matched = templates.filter(item => {
    return [item.name, item.type, item.description].join(' ').toLowerCase().includes(query);
  });

  container.innerHTML = matched.map(item => `
    <button class="template-card" data-template-id="${item.id}">
      <div class="template-name">${item.name}</div>
      <div class="template-meta"><span class="badge">${item.type}</span><span>${item.description}</span></div>
    </button>
  `).join('');

  container.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const template = templates.find(item => item.id === card.dataset.templateId);
      editor.value = template.code;
      $('#currentFileName').textContent = `${template.name.toLowerCase().replaceAll(' ', '-')}.mmd`;
      updateLineNumbers();
      updateMetrics();
      persist();
      scheduleRender(20);
      toast(`${template.name} loaded.`, 'success');
    });
  });
}

function renderHistoryList() {
  const container = $('#historyList');
  const history = loadHistory();
  if (!history.length) {
    container.className = 'history-list empty-state';
    container.textContent = 'No snapshots yet.';
    return;
  }

  container.className = 'history-list';
  container.innerHTML = history.map(item => `
    <button class="history-item" data-history-id="${item.id}">
      <div>${escapeHtml(item.preview || 'Untitled snapshot')}</div>
      <div class="history-time">${new Date(item.createdAt).toLocaleString()}</div>
    </button>
  `).join('');

  container.querySelectorAll('.history-item').forEach(button => {
    button.addEventListener('click', () => {
      const item = history.find(entry => entry.id === button.dataset.historyId);
      editor.value = item.code;
      updateLineNumbers();
      updateMetrics();
      persist();
      scheduleRender(20);
    });
  });
}

function switchPanel(panelName) {
  $$('.rail-button').forEach(button => button.classList.toggle('active', button.dataset.panel === panelName));
  $$('.panel-page').forEach(page => page.classList.toggle('active', page.dataset.page === panelName));
}

function switchPreview(mode) {
  $$('.tab-button').forEach(button => button.classList.toggle('active', button.dataset.previewMode === mode));
  const sourceMode = mode === 'source';
  svgSource.classList.toggle('hidden', !sourceMode);
  diagramLayer.classList.toggle('hidden', sourceMode);
}

function handleSettingChange() {
  state.settings.theme = $('#themeSelect').value;
  state.settings.securityLevel = $('#securitySelect').value;
  state.settings.curve = $('#curveSelect').value;
  state.settings.fontSize = Number($('#fontSizeInput').value || 16);
  state.settings.background = $('#backgroundInput').value;
  state.settings.autoRender = $('#autoRenderToggle').checked;
  state.settings.autoSave = $('#autoSaveToggle').checked;
  state.settings.grid = $('#gridToggle').checked;

  canvasStage.classList.toggle('grid-on', state.settings.grid);
  canvasStage.style.backgroundColor = state.settings.background;

  initializeMermaid(state.settings);
  persist();
  scheduleRender(20);
}

function persist() {
  saveWorkspace({ code: editor.value, settings: state.settings });
}

function createNewDiagram() {
  editor.value = `flowchart TD\n    A([Start]) --> B[New Diagram]\n    B --> C([Done])`;
  $('#currentFileName').textContent = 'untitled.mmd';
  updateLineNumbers();
  updateMetrics();
  persist();
  scheduleRender(20);
}

function formatCode() {
  editor.value = editor.value
    .split('\n')
    .map(line => line.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart();
  updateLineNumbers();
  updateMetrics();
  persist();
  scheduleRender(20);
  toast('Basic spacing cleaned.');
}

function scheduleRender(delay = 420) {
  clearTimeout(state.renderTimer);
  state.renderTimer = setTimeout(renderNow, delay);
}

async function renderNow() {
  const code = editor.value.trim();
  if (!code) {
    diagramLayer.innerHTML = '<div class="diagram-placeholder"><div class="placeholder-icon">◇</div><div>Type Mermaid syntax to preview.</div></div>';
    return;
  }

  setStatus('Rendering', 'Rendering Mermaid diagram...', 'rendering');
  try {
    const { svg, renderTime } = await renderMermaid(code, state.settings);
    state.currentSvg = svg;
    diagramLayer.innerHTML = svg;
    svgSource.textContent = svg;
    $('#metricRenderTime').textContent = `${renderTime}ms`;
    $('#metricStatus').textContent = 'OK';
    setStatus('Ready', `Rendered successfully in ${renderTime}ms.`, 'success');
    fitToView();
  } catch (error) {
    $('#metricStatus').textContent = 'Error';
    setStatus('Error', error.message || String(error), 'error');
    diagramLayer.innerHTML = `<div class="diagram-placeholder"><div class="placeholder-icon">!</div><div>${escapeHtml(error.message || 'Render failed')}</div></div>`;
  }
}

function updateLineNumbers() {
  const count = editor.value.split('\n').length;
  lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join('\n');
}

function updateMetrics() {
  $('#metricLines').textContent = editor.value.split('\n').length;
  $('#metricChars').textContent = editor.value.length;
}

function setStatus(status, message, mode) {
  consoleStatus.className = `console-status ${mode === 'error' ? 'error' : mode === 'rendering' ? 'rendering' : ''}`;
  consoleStatus.textContent = status;
  consoleMessage.textContent = message;
}

function setZoom(value) {
  state.zoom = Math.min(3, Math.max(0.25, value));
  $('#zoomReadout').textContent = `${Math.round(state.zoom * 100)}%`;
  setCanvasTransform();
}

function setCanvasTransform() {
  diagramLayer.style.transform = `translate(calc(-50% + ${state.panX}px), calc(-50% + ${state.panY}px)) scale(${state.zoom})`;
}

function fitToView() {
  const svg = diagramLayer.querySelector('svg');
  if (!svg) {
    state.panX = 0;
    state.panY = 0;
    setZoom(1);
    return;
  }

  const stage = canvasStage.getBoundingClientRect();
  const box = svg.getBBox ? svg.getBBox() : { width: 800, height: 500 };
  const width = Math.max(1, box.width || svg.clientWidth || 800);
  const height = Math.max(1, box.height || svg.clientHeight || 500);
  const zoom = Math.min(1.25, Math.max(0.25, Math.min((stage.width - 80) / width, (stage.height - 80) / height)));
  state.panX = 0;
  state.panY = 0;
  setZoom(zoom);
}

function handleWheel(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.08 : 0.08;
  setZoom(state.zoom + delta);
}

function handlePanStart(event) {
  if (event.button !== 0 || event.target.closest('button,textarea,input,select')) return;
  state.isPanning = true;
  state.panStart = { x: event.clientX - state.panX, y: event.clientY - state.panY };
  canvasStage.setPointerCapture?.(event.pointerId);
}

function handlePanMove(event) {
  if (!state.isPanning) return;
  state.panX = event.clientX - state.panStart.x;
  state.panY = event.clientY - state.panStart.y;
  setCanvasTransform();
}

function handlePanEnd() {
  state.isPanning = false;
}

function toast(message, type = 'info') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  toastStack.appendChild(item);
  setTimeout(() => item.remove(), 2600);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
