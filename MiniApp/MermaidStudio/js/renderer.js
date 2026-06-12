import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

let initializedConfig = null;

export function initializeMermaid(config) {
  initializedConfig = {
    startOnLoad: false,
    theme: config.theme || 'dark',
    securityLevel: config.securityLevel || 'strict',
    fontFamily: 'Inter, system-ui, Segoe UI, sans-serif',
    flowchart: {
      htmlLabels: false,
      curve: config.curve || 'basis'
    },
    sequence: {
      mirrorActors: false
    },
    themeVariables: {
      fontSize: `${config.fontSize || 16}px`
    }
  };
  mermaid.initialize(initializedConfig);
}

export async function renderMermaid(code, config = {}) {
  if (!initializedConfig) initializeMermaid(config);
  const id = `mermaid-studio-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const start = performance.now();
  const { svg } = await mermaid.render(id, code);
  return {
    svg,
    renderTime: Math.max(1, Math.round(performance.now() - start))
  };
}
