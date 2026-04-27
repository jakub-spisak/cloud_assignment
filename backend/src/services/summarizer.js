const stopwords = new Set([
  'a', 'aj', 'ako', 'ale', 'alebo', 'ani', 'asi', 'bez', 'bol', 'bola', 'bolo', 'by', 'byť',
  'cez', 'čo', 'do', 'ho', 'ich', 'ja', 'je', 'jej', 'jeho', 'ju', 'k', 'každý', 'keď', 'kde',
  'ktorá', 'ktoré', 'ktorý', 'ku', 'len', 'ma', 'má', 'majú', 'mi', 'môže', 'na', 'nad', 'naj',
  'ne', 'nebo', 'nech', 'než', 'nie', 'niečo', 'od', 'po', 'pod', 'podľa', 'pre', 'pri', 'sa',
  'si', 'sme', 'som', 'sú', 'tak', 'tá', 'tam', 'ten', 'tento', 'to', 'toho', 'tom', 'tu', 'už',
  'v', 'vo', 'z', 'za', 'že',
  'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it', 'of',
  'on', 'or', 'that', 'the', 'to', 'with'
]);

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getTitle(text) {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return 'Bez názvu';
  }

  const first = lines[0].replace(/^[-•\d.\s]+/, '').trim();
  return first.length > 80 ? `${first.slice(0, 77)}...` : first;
}

function splitSentences(text) {
  return normalizeText(text)
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9áäčďéíĺľňóôŕšťúýž\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopwords.has(word));
}

function buildSummary(text, maxSentences = 3) {
  const normalized = normalizeText(text);
  const sentences = splitSentences(normalized);

  if (sentences.length === 0) {
    return normalized
      .split('\n')
      .filter(Boolean)
      .slice(0, maxSentences)
      .join(' ');
  }

  const frequencies = new Map();
  for (const word of tokenize(normalized)) {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }

  const ranked = sentences.map((sentence, index) => {
    const score = tokenize(sentence).reduce((sum, word) => sum + (frequencies.get(word) || 0), 0);
    return { sentence, index, score };
  });

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(' ');
}

module.exports = {
  normalizeText,
  getTitle,
  buildSummary
};
