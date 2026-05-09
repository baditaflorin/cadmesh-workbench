import type { AnalysisInputFile } from './types';

export async function fileToInput(file: File): Promise<AnalysisInputFile> {
  return {
    name: file.name,
    type: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    lastModified: file.lastModified,
  };
}

export function textToInput(text: string, name = nameForText(text)): AnalysisInputFile {
  return {
    name,
    type: 'text/plain',
    bytes: new TextEncoder().encode(text),
  };
}

export async function urlToInput(url: string): Promise<AnalysisInputFile> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(
      `URL fetch failed with HTTP ${response.status}. Download the file or paste its text instead.`,
    );
  }
  const blob = await response.blob();
  const name = filenameFromURL(url) || `downloaded.${extensionFromType(blob.type)}`;
  return {
    name,
    type: blob.type || 'application/octet-stream',
    bytes: new Uint8Array(await blob.arrayBuffer()),
  };
}

export function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard is unavailable. Select the text and copy it manually.');
  }
  await navigator.clipboard.writeText(text);
}

export function encodeShareState(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeShareState(encoded: string): string {
  const padded = encoded
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function nameForText(text: string): string {
  const trimmed = text.trimStart();
  if (/^ISO-10303-21/i.test(trimmed)) return 'pasted.step';
  if (/^solid\b/i.test(trimmed) || /facet\s+normal/i.test(trimmed)) return 'pasted.stl';
  if (/^ply\s/i.test(trimmed)) return 'pasted.ply';
  if (/^OFF\b/i.test(trimmed)) return 'pasted.off';
  if (/^(#.*\n)?\s*(o |v |mtllib |g )/m.test(text)) return 'pasted.obj';
  if (/^\s*\{/.test(trimmed)) return 'pasted.gltf';
  return 'pasted.txt';
}

function filenameFromURL(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : '';
  } catch {
    return '';
  }
}

function extensionFromType(type: string): string {
  if (type.includes('json')) return 'json';
  if (type.includes('gltf')) return 'gltf';
  if (type.includes('png')) return 'png';
  if (type.includes('jpeg')) return 'jpg';
  return 'bin';
}
