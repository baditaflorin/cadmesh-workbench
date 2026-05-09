export type DecodedText = {
  text: string;
  encoding: string;
  normalizedLineEndings: boolean;
  replacementCount: number;
};

export function decodeNormalized(bytes: Uint8Array): DecodedText {
  let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  let encoding = 'utf-8';
  const replacementCount = count(text, '\uFFFD');
  if (replacementCount > 0 && typeof TextDecoder !== 'undefined') {
    try {
      const cp1252 = new TextDecoder('windows-1252', { fatal: false }).decode(bytes);
      if (count(cp1252, '\uFFFD') < replacementCount) {
        text = cp1252;
        encoding = 'windows-1252';
      }
    } catch {
      // Browser may not expose windows-1252; UTF-8 fallback is still deterministic.
    }
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const normalizedLineEndings = /\r/.test(text);
  text = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  return { text, encoding, normalizedLineEndings, replacementCount };
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
