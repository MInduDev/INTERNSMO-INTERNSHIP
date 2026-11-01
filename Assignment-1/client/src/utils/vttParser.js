function parseVttTime(value) {
  const match = String(value).trim().match(/^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{1,3})$/);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4].padEnd(3, '0'));
  return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
}

function parseVtt(content) {
  if (typeof content !== 'string') throw new Error('Subtitle content must be text.');
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(normalized)) {
    throw new Error('Subtitle file is missing the WEBVTT header.');
  }

  const cues = [];
  const blocks = normalized.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n');
    if (!lines.length || /^(NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0])) continue;
    const timingIndex = lines.findIndex(line => line.includes('-->'));
    if (timingIndex < 0) continue;

    const timing = lines[timingIndex].match(/^\s*(\S+)\s+-->\s+(\S+)/);
    if (!timing) continue;
    const start = parseVttTime(timing[1]);
    const end = parseVttTime(timing[2]);
    const text = lines.slice(timingIndex + 1).join('\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .trim();
    if (start === null || end === null || end <= start || !text) continue;
    cues.push({ start, end, text });
  }
  return cues.sort((left, right) => left.start - right.start);
}

function findVttCue(cues, timeSeconds) {
  return cues.find(cue => timeSeconds >= cue.start && timeSeconds < cue.end) || null;
}

export { findVttCue, parseVtt, parseVttTime };
