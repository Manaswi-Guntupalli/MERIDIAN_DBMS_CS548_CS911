const checks = [
  ['Website', process.env.CHECK_WEB_ORIGIN || 'http://localhost:5173', false],
  ['API', `${process.env.CHECK_API_ORIGIN || 'http://localhost:4000'}/api/health`, true],
  ['Intelligence', `${process.env.CHECK_INTELLIGENCE_ORIGIN || 'http://localhost:8010'}/health`, true],
  ['Face engine', `${process.env.CHECK_FACE_ORIGIN || 'http://localhost:8020'}/health`, true],
];
const results = await Promise.all(checks.map(async ([name, url, json]) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = json ? await response.json() : null;
    if (data?.status && data.status !== 'ok') throw new Error(`Health status: ${data.status}`);
    if (name === 'Face engine' && data?.loaded !== true) throw new Error('Face model is not loaded');
    return { name, url, ok: true };
  } catch (error) { return { name, url, ok: false, reason: error.message }; }
}));
for (const result of results) console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.name}: ${result.url}${result.reason ? ` (${result.reason})` : ''}`);
if (results.some(result => !result.ok)) {
  console.error('Start the missing services using README.md. These checks do not verify camera hardware, provider delivery or login credentials.');
  process.exitCode = 1;
}
