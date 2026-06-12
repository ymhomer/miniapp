function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportSvg(svg, filename = 'diagram.svg') {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

export async function exportPng(svg, filename = 'diagram.png', background = '#111318') {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.decoding = 'async';

  const loadPromise = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  image.src = url;
  await loadPromise;

  const scale = 2;
  const width = Math.max(800, image.naturalWidth || 800);
  const height = Math.max(500, image.naturalHeight || 500);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(url);

  const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  downloadBlob(pngBlob, filename);
}

export function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const temp = document.createElement('textarea');
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  temp.remove();
  return Promise.resolve();
}
