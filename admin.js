'use strict';
/* =====================================================================
   GymLog Admin Panel – admin.js
   Reads from the same localStorage key as the main app.
   ===================================================================== */

const STORE_KEY  = 'gymlog_v1';
const ADMIN_PASS = 'gymadmin';   // ⚠️  DEV / DEMO ONLY – password visible in source.
                                   // For production: replace the login() function with a
                                   // server-side authentication call (e.g. Laravel Sanctum)
                                   // and never ship credentials in client-side code.

const EPLEY = (w, r) => r === 1 ? w : w * (1 + r / 30);

/* ── STORAGE ─────────────────────────────────────────────────────── */
function loadDB() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)); }
  catch (e) { return null; }
}
function saveDB(db) { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
function uid() {
  const a = new Uint32Array(2); crypto.getRandomValues(a);
  return a[0].toString(36) + a[1].toString(36) + Date.now().toString(36);
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDur(sec) {
  if (!sec) return '—';
  const totalMinutes = Math.floor(sec / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = sec % 60;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function vol(workout) {
  return (workout.exercises || []).reduce((s, ex) =>
    s + (ex.sets || []).filter(st => st.completed).reduce((a, st) => a + (st.weight || 0) * (st.reps || 0), 0), 0);
}

/* ── AUTH ────────────────────────────────────────────────────────── */
let adminAuthed = sessionStorage.getItem('admin_auth') === '1';

function tryLogin() {
  const pw = document.getElementById('admin-password').value;
  if (pw === ADMIN_PASS) {
    adminAuthed = true;
    sessionStorage.setItem('admin_auth', '1');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    boot();
  } else {
    document.getElementById('login-error').textContent = 'Incorrect password.';
  }
}

document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); tryLogin(); });
document.getElementById('btn-logout').addEventListener('click', () => {
  sessionStorage.removeItem('admin_auth');
  adminAuthed = false;
  document.getElementById('admin-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-password').value = '';
});

/* ── NAV ─────────────────────────────────────────────────────────── */
function showTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
}
document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => {
  showTab(t.dataset.tab);
  renderTab(t.dataset.tab);
}));

/* ── BOOT ────────────────────────────────────────────────────────── */
function boot() {
  if (adminAuthed) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
  }
  showTab('dashboard');
  renderTab('dashboard');
}

function renderTab(name) {
  if (name === 'dashboard')  renderDashboard();
  if (name === 'exercises')  renderExercises();
  if (name === 'workouts')   renderWorkouts();
  if (name === 'users')      renderUsers();
}

/* ── DASHBOARD ───────────────────────────────────────────────────── */
function renderDashboard() {
  const db = loadDB();
  if (!db) { document.getElementById('tab-dashboard').innerHTML = '<p class="admin-empty">No app data found. Open the main app first.</p>'; return; }

  const workouts  = db.workouts || [];
  const exercises = db.exercises || [];
  const templates = db.templates || [];
  const prs       = db.prs || {};
  const prCount   = Object.values(prs).reduce((n, ex) => n + Object.keys(ex).length, 0);
  const totalVol  = workouts.reduce((s, w) => s + vol(w), 0);

  document.getElementById('dash-workouts').textContent  = workouts.length;
  document.getElementById('dash-exercises').textContent = exercises.length;
  document.getElementById('dash-templates').textContent = templates.length;
  document.getElementById('dash-prs').textContent       = prCount;
  document.getElementById('dash-volume').textContent    = totalVol >= 1000 ? (totalVol / 1000).toFixed(1) + 'k' : totalVol;
  document.getElementById('dash-unit').textContent      = db.settings?.unit || 'kg';

  // Recent workouts mini table
  const recent = workouts.slice(-5).reverse();
  document.getElementById('dash-recent').innerHTML = recent.length ? recent.map(w => `
    <tr>
      <td>${esc(w.templateName || 'Workout')}</td>
      <td>${fmtDate(w.date)}</td>
      <td>${fmtDur(w.duration)}</td>
      <td>${vol(w)} ${db.settings?.unit || 'kg'}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="admin-empty">No workouts yet.</td></tr>';
}

/* ── EXERCISES ───────────────────────────────────────────────────── */
let exEditId = null;

function renderExercises() {
  const db = loadDB();
  if (!db) return;
  const exercises = db.exercises || [];
  document.getElementById('ex-count').textContent = exercises.length;
  document.getElementById('exercises-tbody').innerHTML = exercises.map(ex => `
    <tr>
      <td><code class="admin-code">${esc(ex.id)}</code></td>
      <td>${esc(ex.name)}</td>
      <td><span class="admin-badge">${esc(ex.cat)}</span></td>
      <td>
        <button class="admin-btn admin-btn-sm" onclick="openEditExercise('${esc(ex.id)}')">✏️ Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteExercise('${esc(ex.id)}')">🗑 Delete</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="4" class="admin-empty">No exercises.</td></tr>';
}

function openAddExercise() {
  exEditId = null;
  document.getElementById('ex-modal-title').textContent = 'Add Exercise';
  document.getElementById('ex-form-id').value = '';
  document.getElementById('ex-form-name').value = '';
  document.getElementById('ex-form-cat').value = '';
  document.getElementById('modal-exercise').classList.remove('hidden');
}
function openEditExercise(id) {
  const db = loadDB(); if (!db) return;
  const ex = db.exercises.find(e => e.id === id); if (!ex) return;
  exEditId = id;
  document.getElementById('ex-modal-title').textContent = 'Edit Exercise';
  document.getElementById('ex-form-id').value   = ex.id;
  document.getElementById('ex-form-name').value = ex.name;
  document.getElementById('ex-form-cat').value  = ex.cat;
  document.getElementById('modal-exercise').classList.remove('hidden');
}
function closeExModal() { document.getElementById('modal-exercise').classList.add('hidden'); }

document.getElementById('ex-form').addEventListener('submit', e => {
  e.preventDefault();
  const db = loadDB(); if (!db) return;
  const name = document.getElementById('ex-form-name').value.trim();
  const cat  = document.getElementById('ex-form-cat').value.trim();
  if (!name) return;
  if (exEditId) {
    const i = db.exercises.findIndex(x => x.id === exEditId);
    if (i !== -1) { db.exercises[i].name = name; db.exercises[i].cat = cat; }
  } else {
    const newId = document.getElementById('ex-form-id').value.trim() || uid();
    db.exercises.push({ id: newId, name, cat });
  }
  saveDB(db); closeExModal(); renderExercises(); showToast('Exercise saved!');
});

function deleteExercise(id) {
  if (!confirm('Delete exercise "' + id + '"? This cannot be undone.')) return;
  const db = loadDB(); if (!db) return;
  db.exercises = db.exercises.filter(e => e.id !== id);
  saveDB(db); renderExercises(); showToast('Exercise deleted.');
}

document.getElementById('ex-search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#exercises-tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

/* ── WORKOUTS ────────────────────────────────────────────────────── */
function renderWorkouts() {
  const db = loadDB(); if (!db) return;
  const workouts = (db.workouts || []).slice().reverse();
  document.getElementById('workout-count').textContent = workouts.length;
  document.getElementById('workouts-tbody').innerHTML = workouts.map(w => `
    <tr>
      <td><code class="admin-code">${esc(w.id.slice(0, 8))}</code></td>
      <td>${esc(w.templateName || 'Workout')}</td>
      <td>${fmtDate(w.date)}</td>
      <td>${fmtDur(w.duration)}</td>
      <td>${(w.exercises || []).length} ex · ${(w.exercises || []).reduce((s, ex) => s + (ex.sets || []).filter(st => st.completed).length, 0)} sets</td>
      <td>${vol(w)} ${db.settings?.unit || 'kg'}</td>
      <td><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteWorkout('${esc(w.id)}')">🗑</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="admin-empty">No workouts yet.</td></tr>';
}

function deleteWorkout(id) {
  if (!confirm('Delete this workout?')) return;
  const db = loadDB(); if (!db) return;
  db.workouts = db.workouts.filter(w => w.id !== id);
  // recalc PRs (handles both weight-based and time-based exercises)
  db.prs = {};
  db.workouts.forEach(w => w.exercises.forEach(ex => {
    const exObj  = (db.exercises || []).find(e => e.id === ex.exerciseId);
    const isTime = exObj?.type === 'time';
    const pr     = db.prs[ex.exerciseId] = db.prs[ex.exerciseId] || {};
    if (isTime) {
      const done = (ex.sets || []).filter(s => s.completed && s.duration > 0);
      if (!done.length) return;
      const best = Math.max(...done.map(s => s.duration));
      if (!pr.duration || best > pr.duration.value) pr.duration = { value: best, date: w.date };
    } else {
      const done = (ex.sets || []).filter(s => s.completed && s.weight > 0 && s.reps > 0);
      if (!done.length) return;
      const bW = Math.max(...done.map(s => s.weight));
      const bE = Math.max(...done.map(s => EPLEY(s.weight, s.reps)));
      const bV = done.reduce((a, s) => a + s.weight * s.reps, 0);
      if (!pr.weight || bW > pr.weight.value) pr.weight = { value: bW, date: w.date };
      if (!pr.e1rm   || bE > pr.e1rm.value)   pr.e1rm   = { value: Math.round(bE * 10) / 10, date: w.date };
      if (!pr.volume || bV > pr.volume.value)  pr.volume = { value: bV, date: w.date };
    }
  }));
  saveDB(db); renderWorkouts(); showToast('Workout deleted.');
}

document.getElementById('workout-search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#workouts-tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

/* ── USERS / PROFILE ─────────────────────────────────────────────── */
function renderUsers() {
  const db = loadDB(); if (!db) return;
  const s = db.settings || {};
  document.getElementById('user-name').textContent    = s.username || '(anonymous)';
  document.getElementById('user-id').textContent      = s.userId || '—';
  document.getElementById('user-unit').textContent    = s.unit || 'kg';
  document.getElementById('user-privacy').textContent = s.privacy || '—';
  document.getElementById('user-onboarded').textContent = db.onboarded ? 'Yes' : 'No';
  document.getElementById('user-friends').textContent = (db.friends || []).length;

  const prs = db.prs || {};
  const exercises = db.exercises || [];
  document.getElementById('prs-tbody').innerHTML = Object.entries(prs).map(([exId, pr]) => {
    const ex     = exercises.find(e => e.id === exId);
    const isTime = ex?.type === 'time';
    if (isTime) {
      return `<tr>
        <td>${esc(ex?.name || exId)}</td>
        <td colspan="2">${pr.duration ? fmtDur(pr.duration.value) : '—'}</td>
        <td>—</td>
        <td>${fmtDate(pr.duration?.date)}</td>
      </tr>`;
    }
    return `<tr>
      <td>${esc(ex?.name || exId)}</td>
      <td>${pr.weight ? pr.weight.value + ' ' + (s.unit || 'kg') : '—'}</td>
      <td>${pr.e1rm   ? pr.e1rm.value   + ' ' + (s.unit || 'kg') : '—'}</td>
      <td>${pr.volume ? pr.volume.value  + ' ' + (s.unit || 'kg') : '—'}</td>
      <td>${fmtDate(pr.weight?.date)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" class="admin-empty">No PRs yet.</td></tr>';
}

/* ── IMPORT / EXPORT ─────────────────────────────────────────────── */
document.getElementById('btn-admin-export').addEventListener('click', () => {
  const db = loadDB(); if (!db) return;
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'gymlog-admin-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('Exported!');
});

document.getElementById('btn-admin-import').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.workouts || !data.exercises) throw new Error('Invalid format');
      if (!confirm('This will REPLACE all current data. Continue?')) return;
      saveDB(data); showToast('Data imported!'); renderTab(getCurrentTab());
    } catch (err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function getCurrentTab() {
  return document.querySelector('.admin-tab.active')?.dataset.tab || 'dashboard';
}

/* ── TOAST ───────────────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── INIT ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (adminAuthed) boot();
});
