// Lossless build-time dictionary representation of the existing canonical document.
// Will's 2026-10-04 Pages brief permits slimming frames while preserving their semantics.
export function expandPondFrames(document) {
  if (document?.schema_version !== 'farm-pond-frame-wire/v1') return document;
  if (!Array.isArray(document.dictionary)) throw new Error('Pond frame dictionary missing');
  const resolved = [];
  const expand = (value, limit) => {
    if (Array.isArray(value)) return value.map(row => expand(row, limit));
    if (!value || typeof value !== 'object') return value;
    if (Object.hasOwn(value, '$pond_ref')) {
      const id = value.$pond_ref;
      if (Object.keys(value).length !== 1 || !Number.isInteger(id) || id < 0 || id >= limit) {
        throw new Error('Invalid pond frame dictionary reference');
      }
      return resolved[id];
    }
    return Object.fromEntries(Object.entries(value).map(([key, row]) => [key, expand(row, limit)]));
  };
  for (const entry of document.dictionary) resolved.push(expand(entry, resolved.length));
  return expand(document.document, resolved.length);
}
