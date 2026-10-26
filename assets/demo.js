import { simulate } from './simulator.mjs';

const $ = id => document.getElementById(id);
const amount = value => `$${Number(value).toFixed(2)}`;
let currentRun = null;
let previousUnsafeRun = null;
let activeEvent = -1;
let playback = null;
const field = {
  payment: $('paymentInput'), request: $('refundInput'), atomic: $('atomicToggle'),
};
function config() {
  return {
    payment: Number(field.payment.value),
    request: Number(field.request.value),
    atomic: field.atomic.checked,
    mode: document.querySelector('input[name="mode"]:checked').value,
  };
}
function setText(id, text) { $(id).textContent = text; }
function setStatus(status) {
  const badge = $('overallStatus');
  badge.className = `demo-status ${status === 'failed' ? 'failed' : status === 'passed' ? 'passed' : ''}`;
  badge.innerHTML = '<span class="status-led"></span>';
  badge.append(document.createTextNode(status === 'failed' ? 'INVARIANT VIOLATED' : status === 'passed' ? 'RULE PRESERVED' : 'READY TO SIMULATE'));
}
function stopPlayback() {
  if (playback != null) window.clearInterval(playback);
  playback = null;
  $('replayButton').textContent = 'Replay ↻';
}
function clearResults({ preserveBaseline = false } = {}) {
  stopPlayback();
  currentRun = null;
  if (!preserveBaseline) previousUnsafeRun = null;
  activeEvent = -1;
  setStatus('ready');
  setText('refundedValue', '$0.00');
  setText('refundedSub', 'No events executed yet');
  setText('capturedValue', amount(Number(field.payment.value) || 0));
  setText('remainingValue', amount(Number(field.payment.value) || 0));
  setText('blockedValue', '0');
  setText('stateBadge', 'AWAITING RUN');
  $('stateBadge').className = 'state-status';
  $('refundedValue').className = '';
  setText('invariantResult', 'Not evaluated');
  $('invariantResult').className = '';
  $('traceList').replaceChildren();
  const li = document.createElement('li'); li.className = 'trace-empty'; li.textContent = 'No simulation has been executed.'; $('traceList').append(li);
  setText('eventCounter', '0 EVENTS');
  setText('traceHint', 'Run a simulation to inspect the executed sequence.');
  $('analysisEmpty').hidden = false;
  $('analysisResult').hidden = true;
  $('stepButton').disabled = true;
  $('replayButton').disabled = true;
  $('applyFixButton').disabled = true;
  $('nodeA').className = 'graph-agent graph-a';
  $('nodeB').className = 'graph-agent graph-b';
  $('nodeLedger').className = 'graph-ledger';
  $('comparison').hidden = true;
  setText('graphPayment', amount(Number(field.payment.value) || 0));
  setText('requestA', amount(Number(field.request.value) || 0));
  setText('requestB', amount(Number(field.request.value) || 0));
  setText('graphMode', config().mode.toUpperCase() + ' MODE');
  setText('modeDescription', config().mode === 'concurrent'
    ? 'Both agents read the same ledger state before either commits.'
    : 'The second agent reads the state only after the first commit.');
}
function makeEventItem(event, index) {
  const li = document.createElement('li');
  li.tabIndex = 0;
  li.setAttribute('role', 'button');
  li.setAttribute('aria-label', `Inspect event ${event.id}: ${event.action}`);
  li.dataset.index = String(index);
  const num = document.createElement('span'); num.className = 'trace-number'; num.textContent = String(event.id).padStart(2, '0');
  const main = document.createElement('div'); main.className = 'trace-main';
  const title = document.createElement('div'); title.className = 'trace-title';
  const actor = document.createElement('span'); actor.className = 'trace-actor'; actor.textContent = event.actor.toUpperCase();
  const action = document.createElement('strong'); action.textContent = event.action;
  title.append(actor, action);
  const detail = document.createElement('div'); detail.className = 'trace-description'; detail.textContent = event.description;
  main.append(title, detail);
  const state = document.createElement('span'); state.className = `trace-status ${event.kind}`; state.textContent = event.kind === 'breach' ? 'FAIL' : event.kind === 'safe' ? 'PASS' : event.kind === 'blocked' ? 'BLOCK' : '';
  li.append(num, main, state);
  li.addEventListener('click', () => { stopPlayback(); selectEvent(index); });
  li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopPlayback(); selectEvent(index); } });
  return li;
}
function selectEvent(index) {
  if (!currentRun) return;
  activeEvent = Math.max(0, Math.min(currentRun.events.length - 1, index));
  const event = currentRun.events[activeEvent];
  const nodes = [ $('nodeA'), $('nodeB'), $('nodeLedger') ];
  nodes.forEach(n => n.classList.remove('active', 'safe', 'breached'));
  if (event.actor === 'Agent A') $('nodeA').classList.add('active');
  if (event.actor === 'Agent B') $('nodeB').classList.add('active');
  if (event.actor === 'Ledger' || event.actor === 'Invariant checker') $('nodeLedger').classList.add(event.breached ? 'breached' : event.kind === 'safe' ? 'safe' : 'active');
  $('traceList').querySelectorAll('[data-index]').forEach(item => { item.classList.toggle('selected', Number(item.dataset.index) === activeEvent); });
  setText('capturedValue', amount(event.state.captured));
  setText('refundedValue', amount(event.state.refunded));
  setText('remainingValue', amount(event.state.remaining));
  $('refundedValue').className = event.breached ? 'failed' : (event.kind === 'safe' ? 'passed' : '');
  setText('refundedSub', `Ledger state after event ${event.id} / ${currentRun.events.length}`);
  setText('blockedValue', String(currentRun.events.slice(0, activeEvent + 1).filter(e => e.kind === 'blocked').length));
  const invariantEvaluated = activeEvent === currentRun.events.length - 1;
  setText('invariantResult', invariantEvaluated ? (currentRun.breached ? '✕ Invariant violated' : '✓ Invariant preserved') : 'Checking as events execute…');
  $('invariantResult').className = invariantEvaluated ? (currentRun.breached ? 'failed' : 'passed') : '';
  setText('stateBadge', event.breached ? 'FAILURE OBSERVED' : (invariantEvaluated ? 'TEST PASSED' : 'SIMULATED EXECUTION'));
  $('stateBadge').className = 'state-status ' + (event.breached ? 'failed' : invariantEvaluated ? 'passed' : '');
  const selectedItem = $('traceList').querySelector(`[data-index="${activeEvent}"]`);
  if (selectedItem) {
    const list = $('traceList');
    const box = list.getBoundingClientRect();
    const selected = selectedItem.getBoundingClientRect();
    if (selected.top < box.top) list.scrollTop += selected.top - box.top;
    else if (selected.bottom > box.bottom) list.scrollTop += selected.bottom - box.bottom;
  }
  $('stepButton').disabled = activeEvent >= currentRun.events.length - 1;
}
function renderAnalysis() {
  if (!currentRun) return;
  const r = currentRun;
  $('analysisEmpty').hidden = true;
  $('analysisResult').hidden = false;
  $('analysisVerdict').textContent = r.breached ? '✕ CRITICAL RULE VIOLATION' : '✓ BUSINESS RULE PRESERVED';
  $('analysisVerdict').className = r.breached ? 'analysis-verdict' : 'analysis-verdict passed';
  setText('analysisHeadline', r.breached ? `Excess refund: ${amount(r.excess)}` : 'No invariant violation in this run.');
  setText('analysisExplanation', r.rootCause);
  setText('analysisAssertion', `${amount(r.refunded)} ≤ ${amount(r.captured)}  →  ${r.passed ? 'TRUE' : 'FALSE'}`);
  $('applyFixButton').disabled = r.input.atomic;
  $('analysisRetestButton').disabled = r.input.atomic;
  $('analysisRetestButton').textContent = r.input.atomic ? 'Safeguard enabled ✓' : 'Test atomic safeguard ↗';
  const compare = $('comparison');
  if (previousUnsafeRun && r.input.atomic && previousUnsafeRun.input.payment === r.input.payment && previousUnsafeRun.input.request === r.input.request && previousUnsafeRun.input.mode === r.input.mode) {
    compare.hidden = false;
    compare.textContent = `BEFORE: ${amount(previousUnsafeRun.refunded)} refunded / ${previousUnsafeRun.breached ? 'FAILED' : 'PASSED'}\nAFTER: ${amount(r.refunded)} refunded / ${r.passed ? 'PASSED' : 'FAILED'}\nSame synthetic scenario. One changed safeguard.`;
    compare.style.whiteSpace = 'pre-line';
  } else compare.hidden = true;
}
function runSimulation() {
  stopPlayback();
  const error = $('inputError');
  error.hidden = true;
  const values = config();
  try {
    const result = simulate(values);
    if (!values.atomic) previousUnsafeRun = result;
    currentRun = result;
    setStatus(result.breached ? 'failed' : 'passed');
    setText('graphMode', values.mode.toUpperCase() + ' MODE');
    setText('graphPayment', amount(result.captured));
    setText('requestA', amount(result.input.request));
    setText('requestB', amount(result.input.request));
    const list = $('traceList'); list.replaceChildren(...result.events.map(makeEventItem));
    setText('eventCounter', `${result.events.length} EVENTS`);
    setText('traceHint', 'Select any event or replay the trace to inspect changing ledger state.');
    $('replayButton').disabled = false;
    renderAnalysis();
    selectEvent(result.events.length - 1);
  } catch (e) { error.textContent = e.message; error.hidden = false; }
}
function retest() {
  if (!currentRun) return;
  if (!currentRun.input.atomic) previousUnsafeRun = currentRun;
  field.atomic.checked = true;
  runSimulation();
}
function replay() {
  if (!currentRun) return;
  stopPlayback();
  selectEvent(0);
  $('replayButton').textContent = 'Pause Ⅱ';
  playback = window.setInterval(() => {
    if (!currentRun || activeEvent >= currentRun.events.length - 1) { stopPlayback(); return; }
    selectEvent(activeEvent + 1);
  }, 450);
}
$('runButton').addEventListener('click', runSimulation);
$('introRunButton').addEventListener('click', () => {
  runSimulation();
  if (currentRun) $('workspace').scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});
$('resetButton').addEventListener('click', () => {
  field.payment.value = '100'; field.request.value = '100'; field.atomic.checked = false;
  document.querySelector('input[name="mode"][value="concurrent"]').checked = true;
  $('inputError').hidden = true;
  clearResults();
});
$('stepButton').addEventListener('click', () => { stopPlayback(); if (currentRun) selectEvent(activeEvent + 1); });
$('replayButton').addEventListener('click', () => playback == null ? replay() : stopPlayback());
$('applyFixButton').addEventListener('click', retest);
$('analysisRetestButton').addEventListener('click', retest);
for (const element of [field.payment, field.request, ...document.querySelectorAll('input[name="mode"]')]) {
  element.addEventListener('change', () => { $('inputError').hidden = true; clearResults(); });
}
field.atomic.addEventListener('change', () => {
  $('inputError').hidden = true;
  const baseline = previousUnsafeRun && previousUnsafeRun.input.payment === Number(field.payment.value)
    && previousUnsafeRun.input.request === Number(field.request.value)
    && previousUnsafeRun.input.mode === config().mode;
  clearResults({ preserveBaseline: Boolean(baseline) });
  setText('traceHint', baseline ? 'Safeguard changed. Rerun the same scenario to compare outcomes.' : 'Run a simulation to inspect the executed sequence.');
});
clearResults();