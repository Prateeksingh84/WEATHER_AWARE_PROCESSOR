const $ = (id) => document.getElementById(id);
const runBtn = $('runBtn');
const banner = $('statusBanner');
const statusText = $('statusText');
const consoleEl = $('console');

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function setBanner(mode, text) {
  banner.className = `banner ${mode || ''}`.trim();
  statusText.textContent = text;
}

function clearConsole() {
  consoleEl.innerHTML = '';
}

function addConsole(stream, text, time = new Date().toISOString()) {
  const line = document.createElement('div');
  line.className = `console-line ${stream === 'stderr' ? 'err' : ''}`;
  line.textContent = `[${new Date(time).toLocaleTimeString()}] ${text}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function renderOrders(orders = []) {
  const body = $('ordersBody');
  body.innerHTML = '';
  if (!orders.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No orders available yet.</td></tr>';
    return;
  }
  for (const order of orders) {
    const tr = document.createElement('tr');
    const weather = order.weather;
    const statusClass = order.error ? 'error' : (order.status === 'Delayed' ? 'delayed' : 'pending');
    const statusText = order.error ? 'ERROR' : order.status;
    const message = order.customer_message || '—';
    tr.innerHTML = `
      <td><strong>${escapeHtml(order.order_id)}</strong></td>
      <td>${escapeHtml(order.customer)}</td>
      <td>${escapeHtml(order.city)}</td>
      <td><div class="weather"><strong>${escapeHtml(weather?.main || '—')}</strong><small>${escapeHtml(weather?.description || '')}</small>${weather?.temperatureC != null ? `<small>${Number(weather.temperatureC).toFixed(1)}°C · ${Number(weather.humidity ?? 0)}% humidity</small>` : ''}</div></td>
      <td><span class="status ${statusClass}">${escapeHtml(statusText)}</span></td>
      <td><div class="message">${escapeHtml(message)}</div></td>
    `;
    body.appendChild(tr);
  }
}

function renderErrors(errors = []) {
  $('errorCount').textContent = String(errors.length);
  const el = $('errorList');
  el.innerHTML = '';
  if (!errors.length) {
    el.innerHTML = '<div class="empty">No errors logged.</div>';
    return;
  }
  for (const error of errors) {
    const item = document.createElement('div');
    item.className = 'log-entry';
    item.textContent = `${fmtDate(error.timestamp)} · ${error.city} · ${error.code}: ${error.error}`;
    el.appendChild(item);
  }
}

function renderState(state) {
  $('total').textContent = state.summary?.total ?? '—';
  $('delayed').textContent = state.summary?.delayed ?? '—';
  $('normal').textContent = state.summary?.normal ?? '—';
  $('errors').textContent = state.summary?.errors ?? '—';
  $('refreshStamp').textContent = `Updated ${fmtDate(state.generatedAt)}`;
  renderOrders(state.orders);
  renderErrors(state.errors);

  const lr = state.lastRun;
  $('runStarted').textContent = fmtDate(lr?.startedAt);
  $('runFinished').textContent = fmtDate(lr?.finishedAt);
  $('runCode').textContent = lr?.exitCode ?? '—';
  $('runResult').textContent = lr ? (lr.ok ? 'SUCCESS' : lr.ok === false ? 'FAILED' : 'RUNNING') : '—';
  $('lastRunBadge').textContent = lr ? (lr.ok ? 'Success' : lr.ok === false ? 'Failed' : 'Running') : 'No run yet';
  $('lastRunBadge').className = `badge ${lr?.ok === false ? 'danger' : lr?.ok === true ? '' : 'neutral'}`;
  if (state.running) {
    runBtn.disabled = true;
    setBanner('running', 'Weather check running…');
    $('liveBadge').textContent = 'Live';
  } else {
    runBtn.disabled = false;
    $('liveBadge').textContent = 'Idle';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function refresh() {
  try {
    const state = await fetch('/api/state', { cache: 'no-store' }).then((r) => r.json());
    renderState(state);
    if (!state.running && state.lastRun) {
      setBanner(state.lastRun.ok ? 'success' : 'error', state.lastRun.ok ? 'Last run completed successfully' : 'Last run failed — inspect the live console');
    }
  } catch (error) {
    setBanner('error', `Dashboard API unavailable: ${error.message}`);
  }
}

runBtn.addEventListener('click', async () => {
  clearConsole();
  runBtn.disabled = true;
  setBanner('running', 'Starting live weather check…');
  try {
    const response = await fetch('/api/run', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to start run');
  } catch (error) {
    runBtn.disabled = false;
    setBanner('error', error.message);
  }
});

const events = new EventSource('/api/events');
events.addEventListener('run-start', (event) => {
  const data = JSON.parse(event.data);
  clearConsole();
  setBanner('running', `Live run started · ${data.runId.slice(0, 8)}`);
});
events.addEventListener('run-log', (event) => {
  const data = JSON.parse(event.data);
  addConsole(data.stream, data.text, data.time);
});
events.addEventListener('run-complete', (event) => {
  const data = JSON.parse(event.data);
  setBanner(data.ok ? 'success' : 'error', data.ok ? 'Live run completed successfully' : `Live run failed (exit ${data.exitCode})`);
  refresh();
});
events.addEventListener('state', (event) => renderState(JSON.parse(event.data)));
events.onerror = () => setBanner('error', 'Realtime connection interrupted; retrying automatically…');

refresh();
setInterval(refresh, 5000);
