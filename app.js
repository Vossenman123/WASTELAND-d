'use strict';
/* =====================================================================
   GYM PROGRESS LOG  –  app.js
   No tracking · No ads · Offline-first
   ===================================================================== */

/* ── CONSTANTS ─────────────────────────────────────────────────────── */
const STORE_KEY  = 'gymlog_v1';
const EPLEY     = (w, r) => r === 1 ? w : w * (1 + r / 30);   // e1RM formula
/*
 * type: 'weight' = uses weight (kg/lb) + reps  (default)
 *       'time'   = uses duration in seconds, no weight/reps
 * desc: short coaching cue shown in the exercise picker
 */
const BUILT_IN_EXERCISES = [
  // ── Chest ──────────────────────────────────────────────────────────
  { id:'ex_bench',       name:'Bench Press',              cat:'Chest',     type:'weight', desc:'Lie on bench, lower bar to chest, press up. Keep shoulder blades retracted.' },
  { id:'ex_incline',     name:'Incline Bench Press',      cat:'Chest',     type:'weight', desc:'Bench at 30-45°. Targets upper chest. Keep feet flat on floor.' },
  { id:'ex_decline',     name:'Decline Bench Press',      cat:'Chest',     type:'weight', desc:'Bench declined. Targets lower chest. Secure legs on the bench pad.' },
  { id:'ex_dbfly',       name:'Dumbbell Fly',             cat:'Chest',     type:'weight', desc:'Arms wide, slight elbow bend. Bring dumbbells together over chest in an arc.' },
  { id:'ex_pushup',      name:'Push-up',                  cat:'Chest',     type:'weight', desc:'Hands shoulder-width apart. Lower chest to floor, push back up. Keep body straight.' },
  { id:'ex_cable_fly',   name:'Cable Fly',                cat:'Chest',     type:'weight', desc:'Stand between cable towers, press handles together in front. Stretch chest fully.' },
  // ── Shoulders ──────────────────────────────────────────────────────
  { id:'ex_ohp',         name:'Overhead Press',           cat:'Shoulders', type:'weight', desc:'Press barbell from shoulder height overhead. Keep core tight, no excessive back arch.' },
  { id:'ex_dbohp',       name:'Dumbbell Shoulder Press',  cat:'Shoulders', type:'weight', desc:'Press dumbbells from shoulder height overhead. Allows natural wrist rotation.' },
  { id:'ex_laterals',    name:'Lateral Raise',            cat:'Shoulders', type:'weight', desc:'Raise dumbbells to the side to shoulder height. Slight elbow bend. Slow eccentric.' },
  { id:'ex_frontraise',  name:'Front Raise',              cat:'Shoulders', type:'weight', desc:'Raise dumbbells to front. Keep arms nearly straight. Targets anterior deltoid.' },
  { id:'ex_facepull',    name:'Face Pull',                cat:'Shoulders', type:'weight', desc:'Pull rope to forehead, elbows high. Great for rear delts and rotator cuff health.' },
  // ── Back ───────────────────────────────────────────────────────────
  { id:'ex_deadlift',    name:'Deadlift',                 cat:'Back',      type:'weight', desc:'Hip-hinge to lift barbell from floor. Keep back neutral, drive hips forward at the top.' },
  { id:'ex_rdl',         name:'Romanian Deadlift',        cat:'Back',      type:'weight', desc:'Hinge at hip, lower bar along legs. Feel hamstring stretch. Keep back flat.' },
  { id:'ex_pullup',      name:'Pull-up',                  cat:'Back',      type:'weight', desc:'Hang from bar, pull chest to bar. Full range of motion. Use band for assistance.' },
  { id:'ex_chinup',      name:'Chin-up',                  cat:'Back',      type:'weight', desc:'Underhand grip pull-up. More bicep activation. Pull chest to bar.' },
  { id:'ex_row',         name:'Barbell Row',              cat:'Back',      type:'weight', desc:'Bend over, pull barbell to lower chest. Squeeze shoulder blades at the top.' },
  { id:'ex_cable_row',   name:'Cable Row',                cat:'Back',      type:'weight', desc:'Sit at cable station, pull handle to abdomen. Keep torso upright.' },
  { id:'ex_dbrow',       name:'Dumbbell Row',             cat:'Back',      type:'weight', desc:'One knee on bench, row dumbbell to hip. Keep elbow close to body.' },
  { id:'ex_latpull',     name:'Lat Pulldown',             cat:'Back',      type:'weight', desc:'Pull bar to upper chest, lean slightly back. Keep elbows pointing down.' },
  // ── Legs ───────────────────────────────────────────────────────────
  { id:'ex_squat',       name:'Squat',                    cat:'Legs',      type:'weight', desc:'Barbell on upper back, squat until thighs are parallel. Knees track over toes.' },
  { id:'ex_legpress',    name:'Leg Press',                cat:'Legs',      type:'weight', desc:'Push platform away. Do not lock knees at top. Adjust foot position for different areas.' },
  { id:'ex_legcurl',     name:'Leg Curl',                 cat:'Legs',      type:'weight', desc:'Curl weight toward glutes. Targets hamstrings. Control the eccentric phase.' },
  { id:'ex_legext',      name:'Leg Extension',            cat:'Legs',      type:'weight', desc:'Extend knee to straight. Targets quadriceps. Keep back flat against pad.' },
  { id:'ex_calf',        name:'Calf Raise',               cat:'Legs',      type:'weight', desc:'Rise onto toes, pause, lower fully. Full range of motion is key for development.' },
  { id:'ex_lunge',       name:'Lunge',                    cat:'Legs',      type:'weight', desc:'Step forward, lower rear knee toward floor. Keep front shin vertical.' },
  { id:'ex_bulgariansq', name:'Bulgarian Split Squat',    cat:'Legs',      type:'weight', desc:'Rear foot elevated on bench. Lower front leg until thigh is parallel. Great for glutes.' },
  { id:'ex_hipthrust',   name:'Hip Thrust',               cat:'Legs',      type:'weight', desc:'Upper back on bench, barbell on hips. Drive hips to full extension. Excellent glute builder.' },
  { id:'ex_walksit',     name:'Wall Sit',                 cat:'Legs',      type:'time',   desc:'Back against wall, thighs parallel to floor. Isometric quad hold. Record time held.' },
  // ── Biceps ─────────────────────────────────────────────────────────
  { id:'ex_curl',        name:'Barbell Curl',             cat:'Biceps',    type:'weight', desc:'Curl barbell from hips to shoulders. Keep elbows at sides. Squeeze at the top.' },
  { id:'ex_hammer',      name:'Hammer Curl',              cat:'Biceps',    type:'weight', desc:'Neutral grip dumbbell curl. Works brachialis and brachioradialis alongside biceps.' },
  { id:'ex_preacher',    name:'Preacher Curl',            cat:'Biceps',    type:'weight', desc:'Arms resting on preacher pad. Full range curl. Removes cheating from the movement.' },
  { id:'ex_inclinecurl', name:'Incline Dumbbell Curl',    cat:'Biceps',    type:'weight', desc:'Lie back on incline bench, curl dumbbells. Greater stretch on biceps at bottom.' },
  // ── Triceps ────────────────────────────────────────────────────────
  { id:'ex_tricep',      name:'Tricep Pushdown',          cat:'Triceps',   type:'weight', desc:'Push cable bar down until arms straight. Keep elbows at sides. Squeeze at bottom.' },
  { id:'ex_dips',        name:'Dips',                     cat:'Triceps',   type:'weight', desc:'Lower between parallel bars. Elbows tucked. Lean forward for chest, upright for triceps.' },
  { id:'ex_skullcrush',  name:'Skull Crusher',            cat:'Triceps',   type:'weight', desc:'Lie on bench, lower bar toward forehead, extend. Keep elbows pointing up throughout.' },
  { id:'ex_ohtext',      name:'Overhead Tricep Extension',cat:'Triceps',   type:'weight', desc:'Dumbbell overhead, lower behind head, extend. Great long-head tricep activation.' },
  // ── Core ───────────────────────────────────────────────────────────
  { id:'ex_plank',       name:'Plank',                    cat:'Core',      type:'time',   desc:'Forearms on floor, body in straight line. Brace core and glutes. Hold as long as possible.' },
  { id:'ex_sidepl',      name:'Side Plank',               cat:'Core',      type:'time',   desc:'Side-lying, supported on one forearm. Keep hips raised, body in straight line.' },
  { id:'ex_crunch',      name:'Crunch',                   cat:'Core',      type:'weight', desc:'Lie on back, curl shoulders off floor. Do not pull on your neck with your hands.' },
  { id:'ex_legr',        name:'Leg Raise',                cat:'Core',      type:'weight', desc:'Lie flat, raise straight legs to 90°. Lower without touching floor. Press lower back down.' },
  { id:'ex_abwheel',     name:'Ab Wheel Rollout',         cat:'Core',      type:'weight', desc:'On knees with ab wheel, roll forward keeping core braced, pull back. Advanced movement.' },
  { id:'ex_russtwist',   name:'Russian Twist',            cat:'Core',      type:'weight', desc:'Sit with feet off floor, rotate torso side to side. Add weight for more difficulty.' },
  { id:'ex_mountclimb',  name:'Mountain Climbers',        cat:'Core',      type:'time',   desc:'In push-up position, drive knees to chest alternately at pace. Great cardio + core.' },
  // ── Cardio / Time-based ────────────────────────────────────────────
  { id:'ex_run',         name:'Running',                  cat:'Cardio',    type:'time',   desc:'Steady-state or interval running. Record duration per session or interval.' },
  { id:'ex_bike',        name:'Cycling',                  cat:'Cardio',    type:'time',   desc:'Bike or stationary cycle. Good low-impact cardio. Record total time.' },
  { id:'ex_row_erg',     name:'Rowing (Ergometer)',        cat:'Cardio',    type:'time',   desc:'Full-body cardio on rowing machine. Drive with legs, swing back, pull to chest.' },
  { id:'ex_jumprope',    name:'Jump Rope',                cat:'Cardio',    type:'time',   desc:'High-intensity cardio. Great for coordination and agility. Record total duration.' },
  { id:'ex_swim',        name:'Swimming',                 cat:'Cardio',    type:'time',   desc:'Full-body low-impact cardio. Record duration per session.' },
  // ── Full Body ──────────────────────────────────────────────────────
  { id:'ex_burpee',      name:'Burpee',                   cat:'Full Body', type:'weight', desc:'Squat thrust, jump up. Full-body explosive exercise. Count total reps.' },
  { id:'ex_kettleswing', name:'Kettlebell Swing',         cat:'Full Body', type:'weight', desc:'Hip-hinge swing kettlebell to shoulder height. Power from hips, not arms.' },
  { id:'ex_thruster',    name:'Thruster',                 cat:'Full Body', type:'weight', desc:'Front squat directly into overhead press. Barbell or dumbbell. Full-body compound.' },
];

/* ── STORAGE ────────────────────────────────────────────────────────── */
function loadDB() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultDB(); }
  catch(e) { return defaultDB(); }
}
function saveDB() { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }
function defaultDB() {
  return {
    settings: { unit:'kg', username:'', userId: uid(), privacy:'friends', sharedExercises:[] },
    exercises: JSON.parse(JSON.stringify(BUILT_IN_EXERCISES)),
    templates: [],
    workouts:  [],
    prs:       {},
    friends:   [],
    onboarded: false,
  };
}
function uid() {
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  return arr[0].toString(36) + arr[1].toString(36) + Date.now().toString(36);
}

let DB = loadDB();
mergeExerciseDefaults(); // ensure existing saved exercises have desc/type

/* ── TYPE HELPERS ──────────────────────────────────────────────────── */
/** Returns true when the exercise tracks duration (seconds) instead of weight+reps. */
function isTimeEx(exId) {
  const ex = DB.exercises.find(e => e.id === exId);
  if (ex?.type) return ex.type === 'time';
  const built = BUILT_IN_EXERCISES.find(e => e.id === exId);
  return built?.type === 'time';
}

/** Parse "mm:ss", "hh:mm:ss", or plain seconds string → integer seconds. */
function parseDuration(str) {
  str = String(str || '').trim();
  if (!str) return 0;
  const parts = str.split(':');
  if (parts.length === 1) return Math.max(0, parseInt(parts[0]) || 0);
  if (parts.length === 2) return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  return (parseInt(parts[0]) || 0) * 3600 + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
}

/** Merge new desc/type fields into already-saved exercises, add new built-ins. */
function mergeExerciseDefaults() {
  let changed = false;
  DB.exercises = DB.exercises.map(ex => {
    const built = BUILT_IN_EXERCISES.find(b => b.id === ex.id);
    if (!built) return ex;
    const updated = { ...ex };
    if (!updated.type && built.type) { updated.type = built.type; changed = true; }
    if (!updated.desc && built.desc) { updated.desc = built.desc; changed = true; }
    return updated;
  });
  BUILT_IN_EXERCISES.forEach(built => {
    if (!DB.exercises.find(e => e.id === built.id)) {
      DB.exercises.push({ ...built });
      changed = true;
    }
  });
  if (changed) saveDB();
}

/* ── ROUTER ─────────────────────────────────────────────────────────── */
const screens = document.querySelectorAll('.screen');
const nav     = document.getElementById('bottom-nav');
const navBtns = document.querySelectorAll('.nav-btn');
let currentScreen = '';

function showScreen(id, noNav = false) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
  currentScreen = id;
  const hideNav = noNav || ['screen-onboarding','screen-active-workout'].includes(id);
  nav.classList.toggle('hidden', hideNav);
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === id));
  window.scrollTo(0, 0);
}

navBtns.forEach(b => b.addEventListener('click', () => {
  const s = b.dataset.screen;
  if (s === 'screen-home') renderHome();
  if (s === 'screen-templates') renderTemplates();
  if (s === 'screen-friends') renderFriends();
  if (s === 'screen-settings') renderSettings();
  showScreen(s);
}));

/* ── ONBOARDING ─────────────────────────────────────────────────────── */
let onboardStep = 0;

function initOnboarding() {
  if (DB.onboarded) { renderHome(); showScreen('screen-home'); return; }
  showScreen('screen-onboarding', true);
  goOnboardStep(0);
}

function goOnboardStep(n) {
  onboardStep = n;
  document.querySelectorAll('.onboard-step').forEach((el,i) => el.classList.toggle('active', i===n));
}

document.getElementById('ob-unit-kg').addEventListener('click', () => {
  DB.settings.unit = 'kg';
  document.getElementById('ob-unit-kg').classList.add('active');
  document.getElementById('ob-unit-lb').classList.remove('active');
});
document.getElementById('ob-unit-lb').addEventListener('click', () => {
  DB.settings.unit = 'lb';
  document.getElementById('ob-unit-lb').classList.add('active');
  document.getElementById('ob-unit-kg').classList.remove('active');
});
document.getElementById('ob-next-1').addEventListener('click', () => goOnboardStep(1));
document.getElementById('ob-offline').addEventListener('click', finishOnboarding);
document.getElementById('ob-account-form').addEventListener('submit', e => {
  e.preventDefault();
  DB.settings.username = document.getElementById('ob-username').value.trim() || 'Athlete';
  finishOnboarding();
});
document.getElementById('ob-example').addEventListener('click', () => {
  // Create example templates
  DB.templates = [
    { id:uid(), name:'🅰 Push', exercises:[
      {exerciseId:'ex_bench', rest:90}, {exerciseId:'ex_ohp', rest:90}, {exerciseId:'ex_laterals', rest:60}] },
    { id:uid(), name:'🅱 Pull', exercises:[
      {exerciseId:'ex_deadlift', rest:120}, {exerciseId:'ex_row', rest:90}, {exerciseId:'ex_curl', rest:60}] },
    { id:uid(), name:'🅲 Legs', exercises:[
      {exerciseId:'ex_squat', rest:120}, {exerciseId:'ex_legpress', rest:90}, {exerciseId:'ex_legcurl', rest:60}] },
  ];
  finishOnboarding();
});
document.getElementById('ob-blank').addEventListener('click', () => { showScreen('screen-templates'); renderTemplates(); DB.onboarded=true; saveDB(); });

function finishOnboarding() {
  if (!DB.settings.username) DB.settings.username = 'Athlete';
  DB.onboarded = true;
  saveDB();
  renderHome();
  showScreen('screen-home');
}

/* ── HOME ────────────────────────────────────────────────────────────── */
function renderHome() {
  const now  = Date.now();
  const week = 7*24*3600*1000;
  const mon  = 30*24*3600*1000;
  const weekWorkouts = DB.workouts.filter(w => now - new Date(w.date).getTime() < week);
  const weekVolume   = weekWorkouts.reduce((s,w) => s + workoutVolume(w), 0);
  const recentPRs    = countRecentPRs(mon);

  document.getElementById('stat-workouts').textContent = weekWorkouts.length;
  document.getElementById('stat-volume').textContent   = fmtVol(weekVolume);
  // update unit label on volume card & online indicator
  const volCard = document.querySelector('#stat-volume')?.closest('.stat-card');
  if (volCard) { const lbl = volCard.querySelector('.stat-label'); if (lbl) lbl.textContent = 'Volume ('+DB.settings.unit+')'; }
  const ind = document.getElementById('online-indicator');
  if (ind) ind.textContent = navigator.onLine ? '🟢 online' : '⚫ offline';
  document.getElementById('stat-prs').textContent      = recentPRs;

  const last = DB.workouts[DB.workouts.length - 1];
  const lwCard = document.getElementById('last-workout-card');
  if (last) {
    lwCard.classList.remove('hidden');
    document.getElementById('lw-name').textContent = last.templateName || 'Workout';
    document.getElementById('lw-meta').textContent = fmtDate(last.date) + ' · ' + fmtDur(last.duration) + ' · ' + fmtVol(workoutVolume(last)) + ' ' + DB.settings.unit;
    document.getElementById('btn-continue').onclick = () => { /* show detail */ showWorkoutSummary(last.id); };
  } else {
    lwCard.classList.add('hidden');
  }

  const rl = document.getElementById('recent-list');
  const recent = DB.workouts.slice(-10).reverse();
  if (recent.length === 0) {
    rl.innerHTML = '<div class="empty-state"><div class="es-icon">🏋️</div><p>No workouts yet. Start one!</p></div>';
  } else {
    rl.innerHTML = recent.map(w => `
      <div class="recent-item" onclick="showWorkoutSummary('${w.id}')">
        <div class="ri-left">
          <div class="ri-name">${esc(w.templateName||'Workout')}</div>
          <div class="ri-meta">${fmtDate(w.date)} · ${fmtDur(w.duration)} · ${fmtVol(workoutVolume(w))} ${DB.settings.unit}</div>
        </div>
        <div class="ri-right">›</div>
      </div>`).join('');
  }
}

document.getElementById('btn-start-workout').addEventListener('click', openStartModal);

function countRecentPRs(ms) {
  let count = 0;
  const cutoff = Date.now() - ms;
  Object.values(DB.prs).forEach(ex => {
    ['weight','e1rm','volume'].forEach(t => {
      if (ex[t] && new Date(ex[t].date).getTime() > cutoff) count++;
    });
  });
  return count;
}

function workoutVolume(w) {
  return (w.exercises||[]).reduce((s,ex) =>
    s + (ex.sets||[]).filter(st=>st.completed).reduce((a,st)=> a + (st.weight||0)*(st.reps||0), 0), 0);
}

/* ── START WORKOUT MODAL ────────────────────────────────────────────── */
function openStartModal() {
  const list = document.getElementById('start-template-list');
  if (DB.templates.length === 0) {
    list.innerHTML = '<p class="text-muted" style="font-size:13px">No templates yet. Create one first.</p>';
  } else {
    list.innerHTML = DB.templates.map(t => `
      <div class="ex-search-item" onclick="startWorkout('${t.id}'); closeModal('modal-start')">
        <div><div class="esi-name">${esc(t.name)}</div><div class="esi-cat">${t.exercises.length} exercises</div></div>
        <span style="color:var(--accent);font-size:20px">›</span>
      </div>`).join('');
  }
  openModal('modal-start');
}

document.getElementById('btn-empty-workout').addEventListener('click', () => {
  closeModal('modal-start');
  startWorkout(null);
});

/* ── WORKOUT SUMMARY (view past workout) ──────────────────────────── */
function showWorkoutSummary(id) {
  const w = DB.workouts.find(x=>x.id===id);
  if (!w) return;
  const el = document.getElementById('summary-content');
  el.innerHTML = `
    <div class="card" style="gap:6px;display:flex;flex-direction:column">
      <div style="font-size:17px;font-weight:800">${esc(w.templateName||'Workout')}</div>
      <div class="text-muted" style="font-size:13px">${fmtDate(w.date)} · ${fmtDur(w.duration)} · ${fmtVol(workoutVolume(w))} ${DB.settings.unit}</div>
      ${w.notes ? `<div style="font-size:13px;margin-top:4px">${esc(w.notes)}</div>` : ''}
    </div>
    ${(w.exercises||[]).map(ex => {
      const exObj = findExercise(ex.exerciseId);
      return `<div class="card"><div style="font-weight:700;margin-bottom:8px">${esc(exObj?.name||'?')}</div>
        ${ex.sets.filter(s=>s.completed).map((s,i)=>`<div class="text-muted" style="font-size:13px">Set ${i+1}: ${s.weight} ${DB.settings.unit} × ${s.reps}</div>`).join('')}
      </div>`;
    }).join('')}
    <button class="btn btn-danger btn-full" onclick="deleteWorkout('${w.id}')">🗑 Delete workout</button>
  `;
  document.getElementById('topbar-summary').querySelector('h1').textContent = w.templateName||'Workout';
  showScreen('screen-summary', true);
}

document.getElementById('btn-back-summary').addEventListener('click', () => { renderHome(); showScreen('screen-home'); });

function deleteWorkout(id) {
  if (!confirm('Delete this workout?')) return;
  DB.workouts = DB.workouts.filter(w=>w.id!==id);
  recalcAllPRs();
  saveDB();
  renderHome();
  showScreen('screen-home');
}

/* ── ACTIVE WORKOUT ─────────────────────────────────────────────────── */
let activeWorkout = null;  // { id, templateId, templateName, date, exercises, notes, startTime }
let workoutTimerInterval = null;
let restTimerTimeout = null;
let restTimerInterval = null;
let restSeconds = 0;
let restTotal   = 0;
let undoStack   = [];
let undoTimer   = null;

function startWorkout(templateId) {
  const tpl = DB.templates.find(t=>t.id===templateId);
  activeWorkout = {
    id: uid(), templateId, templateName: tpl?.name||'Empty workout',
    date: new Date().toISOString(), exercises: [], notes: '', startTime: Date.now(),
  };
  if (tpl) {
    activeWorkout.exercises = tpl.exercises.map(te => ({
      exerciseId: te.exerciseId,
      defaultRest: te.rest||90,
      sets: []
    }));
  }
  renderActiveWorkout();
  showScreen('screen-active-workout', true);
  startWorkoutTimer();
}

function startWorkoutTimer() {
  clearInterval(workoutTimerInterval);
  workoutTimerInterval = setInterval(() => {
    if (!activeWorkout) return;
    const elapsed = Math.floor((Date.now() - activeWorkout.startTime) / 1000);
    document.getElementById('workout-timer').textContent = fmtDur(elapsed);
  }, 1000);
}

function renderActiveWorkout() {
  if (!activeWorkout) return;
  document.getElementById('workout-name-display').textContent = activeWorkout.templateName;
  document.getElementById('workout-notes-bar').textContent = activeWorkout.notes || '📝 Add notes…';
  const container = document.getElementById('exercises-container');
  container.innerHTML = activeWorkout.exercises.map((ex,ei) => renderExBlock(ex,ei)).join('');
  attachSetListeners();
}

function renderExBlock(ex, ei) {
  const exObj = findExercise(ex.exerciseId);
  const isTime = isTimeEx(ex.exerciseId);
  const rows = ex.sets.map((s,si) => renderSetRow(s,si,ei,ex)).join('');
  const descHtml = exObj?.desc
    ? `<div class="ex-block-desc">${esc(exObj.desc)}</div>` : '';
  return `
    <div class="ex-block animate-in" id="ex-block-${ei}">
      <div class="ex-block-header">
        <div class="ex-block-name" onclick="openExerciseStats('${ex.exerciseId}')">${esc(exObj?.name||'?')} <span style="color:var(--muted);font-size:12px">›</span></div>
        <button class="ex-block-timer-btn" onclick="startRestTimer(${ex.defaultRest||90}, ${ei})">⏱ Rest</button>
        <button class="btn-icon" style="color:var(--danger)" onclick="removeExerciseFromWorkout(${ei})">✕</button>
      </div>
      ${descHtml}
      <table class="sets-table">
        <thead><tr>
          <th>Set</th>
          ${isTime
            ? '<th colspan="2">Time (mm:ss)</th>'
            : `<th>${DB.settings.unit}</th><th>Reps</th>`}
          <th></th><th></th>
        </tr></thead>
        <tbody id="sets-body-${ei}">${rows}</tbody>
      </table>
      <div class="ex-block-footer">
        <button class="btn btn-secondary btn-sm" onclick="addSet(${ei})">+ Set</button>
        ${renderSetPRBadges(ex)}
      </div>
    </div>`;
}

function renderSetRow(s, si, ei, ex) {
  if (isTimeEx(ex.exerciseId)) {
    const prev = getPrevSet(ex.exerciseId, si);
    const phD  = prev?.duration ? fmtDur(prev.duration) : '';
    return `
      <tr class="set-row" id="set-row-${ei}-${si}">
        <td class="set-num">${si+1}</td>
        <td colspan="2"><input class="set-input" type="text"
            value="${s.duration ? fmtDur(s.duration) : ''}" placeholder="${phD||'00:30'}"
            data-ei="${ei}" data-si="${si}" data-field="duration"
            style="text-align:center;font-family:monospace;width:90px"></td>
        <td><button class="set-done-btn ${s.completed?'done':''}"
            onclick="toggleSetDone(${ei},${si})">${s.completed?'✓':''}</button></td>
        <td><button class="set-delete-btn" onclick="deleteSet(${ei},${si})">🗑</button></td>
      </tr>`;
  }
  const prev = getPrevSet(ex.exerciseId, si);
  const phW = prev ? prev.weight : '';
  const phR = prev ? prev.reps   : '';
  return `
    <tr class="set-row" id="set-row-${ei}-${si}">
      <td class="set-num">${si+1}</td>
      <td><input class="set-input" type="number" min="0" step="0.5"
          value="${s.weight||''}" placeholder="${phW}"
          data-ei="${ei}" data-si="${si}" data-field="weight"></td>
      <td><input class="set-input" type="number" min="0" step="1"
          value="${s.reps||''}" placeholder="${phR}"
          data-ei="${ei}" data-si="${si}" data-field="reps"></td>
      <td><button class="set-done-btn ${s.completed?'done':''}"
          onclick="toggleSetDone(${ei},${si})">${s.completed?'✓':''}</button></td>
      <td><button class="set-delete-btn" onclick="deleteSet(${ei},${si})">🗑</button></td>
    </tr>`;
}

function renderSetPRBadges(ex) {
  const pr = DB.prs[ex.exerciseId] || {};
  if (isTimeEx(ex.exerciseId)) {
    const done = ex.sets.filter(s => s.completed && s.duration > 0);
    if (!done.length) return '';
    const best = Math.max(...done.map(s => s.duration));
    if (!pr.duration || best > pr.duration.value) return '<div style="margin-left:auto"><span class="pr-badge weight">PR Time</span></div>';
    return '';
  }
  const bestSets = ex.sets.filter(s=>s.completed && s.weight && s.reps);
  if (!bestSets.length) return '';
  const bestW  = Math.max(...bestSets.map(s=>s.weight));
  const bestE  = Math.max(...bestSets.map(s=>EPLEY(s.weight, s.reps)));
  const bestVol= ex.sets.filter(s=>s.completed).reduce((a,s)=>a+(s.weight*s.reps),0);
  let badges = '';
  if (!pr.weight  || bestW  > pr.weight.value)  badges += '<span class="pr-badge weight">PR Weight</span> ';
  if (!pr.e1rm    || bestE  > pr.e1rm.value)    badges += '<span class="pr-badge e1rm">PR e1RM</span> ';
  if (!pr.volume  || bestVol> pr.volume.value)  badges += '<span class="pr-badge volume">PR Volume</span>';
  return `<div style="margin-left:auto;display:flex;gap:4px;flex-wrap:wrap">${badges}</div>`;
}

function attachSetListeners() {
  document.querySelectorAll('.set-input').forEach(inp => {
    inp.addEventListener('change', e => {
      const ei = +e.target.dataset.ei, si = +e.target.dataset.si, field = e.target.dataset.field;
      if (field === 'duration') {
        const secs = parseDuration(e.target.value);
        activeWorkout.exercises[ei].sets[si].duration = secs;
        e.target.value = secs ? fmtDur(secs) : '';
      } else {
        activeWorkout.exercises[ei].sets[si][field] = parseFloat(e.target.value)||0;
      }
      refreshExBlock(ei);
    });
  });
}

function refreshExBlock(ei) {
  const ex = activeWorkout.exercises[ei];
  const block = document.getElementById(`ex-block-${ei}`);
  if (!block) return;
  block.querySelector('.ex-block-footer').innerHTML = `
    <button class="btn btn-secondary btn-sm" onclick="addSet(${ei})">+ Set</button>
    ${renderSetPRBadges(ex)}`;
  const tbody = document.getElementById(`sets-body-${ei}`);
  if (tbody) tbody.innerHTML = ex.sets.map((s,si)=>renderSetRow(s,si,ei,ex)).join('');
  attachSetListeners();
}

function addSet(ei) {
  const ex = activeWorkout.exercises[ei];
  const prev = ex.sets[ex.sets.length-1];
  if (isTimeEx(ex.exerciseId)) {
    ex.sets.push({ duration: prev?.duration||0, completed:false });
  } else {
    ex.sets.push({ weight: prev?.weight||0, reps: prev?.reps||0, completed:false });
  }
  refreshExBlock(ei);
  // scroll to new row
  setTimeout(()=>{ const rows = document.querySelectorAll(`#sets-body-${ei} tr`); rows[rows.length-1]?.scrollIntoView({block:'nearest'}); }, 50);
}

function toggleSetDone(ei, si) {
  const s     = activeWorkout.exercises[ei].sets[si];
  const exId  = activeWorkout.exercises[ei].exerciseId;
  if (isTimeEx(exId)) {
    const dInp = document.querySelector(`input[data-ei="${ei}"][data-si="${si}"][data-field="duration"]`);
    if (dInp) s.duration = parseDuration(dInp.value) || s.duration;
  } else {
    const wInp = document.querySelector(`input[data-ei="${ei}"][data-si="${si}"][data-field="weight"]`);
    const rInp = document.querySelector(`input[data-ei="${ei}"][data-si="${si}"][data-field="reps"]`);
    if (wInp && rInp) { s.weight = parseFloat(wInp.value)||s.weight; s.reps = parseFloat(rInp.value)||s.reps; }
  }
  s.completed = !s.completed;
  if (s.completed) {
    checkAndSavePR(activeWorkout.exercises[ei], activeWorkout.id, activeWorkout.date);
    startRestTimer(activeWorkout.exercises[ei].defaultRest||90, ei);
  }
  refreshExBlock(ei);
}

function deleteSet(ei, si) {
  const deleted = activeWorkout.exercises[ei].sets.splice(si, 1)[0];
  undoStack.push({ type:'set', ei, si, set: deleted });
  refreshExBlock(ei);
  showUndo();
}

function removeExerciseFromWorkout(ei) {
  if (!confirm('Remove this exercise?')) return;
  activeWorkout.exercises.splice(ei,1);
  renderActiveWorkout();
}

function showUndo() {
  clearTimeout(undoTimer);
  const toast = document.getElementById('undo-toast');
  toast.classList.add('show');
  undoTimer = setTimeout(() => { toast.classList.remove('show'); undoStack=[]; }, 4000);
}

document.getElementById('undo-btn').addEventListener('click', () => {
  if (!undoStack.length) return;
  const action = undoStack.pop();
  if (action.type==='set') {
    activeWorkout.exercises[action.ei].sets.splice(action.si,0,action.set);
    refreshExBlock(action.ei);
  }
  document.getElementById('undo-toast').classList.remove('show');
});

/* Add exercise to active workout */
document.getElementById('btn-add-exercise').addEventListener('click', () => openExercisePicker(ei => {
  activeWorkout.exercises.push({ exerciseId: ei, defaultRest:90, sets:[] });
  renderActiveWorkout();
}));

/* Notes */
document.getElementById('workout-notes-bar').addEventListener('click', () => {
  const n = prompt('Workout notes:', activeWorkout?.notes||'');
  if (n !== null) { activeWorkout.notes = n; document.getElementById('workout-notes-bar').textContent = n||'📝 Add notes…'; }
});

/* Finish workout */
document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);

function finishWorkout() {
  if (!activeWorkout) return;
  if (!activeWorkout.exercises.some(ex=>ex.sets.some(s=>s.completed))) {
    if (!confirm('No completed sets. Finish anyway?')) return;
  }
  clearInterval(workoutTimerInterval);
  activeWorkout.duration = Math.floor((Date.now()-activeWorkout.startTime)/1000);
  activeWorkout.exercises.forEach(ex => checkAndSavePR(ex, activeWorkout.id, activeWorkout.date));
  DB.workouts.push(JSON.parse(JSON.stringify(activeWorkout)));
  saveDB();
  activeWorkout = null;
  renderHome();
  showScreen('screen-home');
  // Show congrats
  showToast('💪 Workout saved!');
}

document.getElementById('btn-cancel-workout').addEventListener('click', () => {
  if (confirm('Cancel workout? Progress will be lost.')) {
    clearInterval(workoutTimerInterval);
    clearRestTimer();
    activeWorkout = null;
    renderHome();
    showScreen('screen-home');
  }
});

/* ── REST TIMER ─────────────────────────────────────────────────────── */
function startRestTimer(seconds, ei) {
  clearRestTimer();
  restSeconds = seconds;
  restTotal   = seconds;
  const overlay = document.getElementById('rest-timer-overlay');
  overlay.classList.add('show');
  updateRestDisplay();
  restTimerInterval = setInterval(() => {
    restSeconds--;
    updateRestDisplay();
    if (restSeconds <= 0) {
      clearRestTimer();
      overlay.classList.remove('show');
      try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=880; g.gain.setValueAtTime(0.3,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5); o.start(); o.stop(ctx.currentTime+0.5); } catch(e){}
      showToast('⏰ Rest complete!');
    }
  }, 1000);
}

function updateRestDisplay() {
  document.getElementById('rest-timer-display').textContent = fmtDur(restSeconds);
  const pct = restSeconds / restTotal * 100;
  document.getElementById('rest-progress-bar').style.width = pct + '%';
}

function clearRestTimer() {
  clearInterval(restTimerInterval);
  clearTimeout(restTimerTimeout);
  restSeconds = 0;
}

document.getElementById('rest-close').addEventListener('click', () => {
  clearRestTimer();
  document.getElementById('rest-timer-overlay').classList.remove('show');
});
document.getElementById('rest-add30').addEventListener('click', () => {
  restSeconds += 30; restTotal = Math.max(restTotal, restSeconds); updateRestDisplay();
});
document.getElementById('rest-skip').addEventListener('click', () => {
  clearRestTimer();
  document.getElementById('rest-timer-overlay').classList.remove('show');
});

/* ── PR DETECTION ───────────────────────────────────────────────────── */
function checkAndSavePR(ex, workoutId, date) {
  const pr = DB.prs[ex.exerciseId] = DB.prs[ex.exerciseId] || {};
  if (isTimeEx(ex.exerciseId)) {
    const done = ex.sets.filter(s => s.completed && s.duration > 0);
    if (!done.length) return;
    const best = Math.max(...done.map(s => s.duration));
    if (!pr.duration || best > pr.duration.value) pr.duration = { value: best, date, workoutId };
    return;
  }
  const completedSets = ex.sets.filter(s=>s.completed && s.weight>0 && s.reps>0);
  if (!completedSets.length) return;
  const bestW   = Math.max(...completedSets.map(s=>s.weight));
  const bestE   = Math.max(...completedSets.map(s=>EPLEY(s.weight, s.reps)));
  const vol     = completedSets.reduce((a,s)=>a+(s.weight*s.reps),0);
  if (!pr.weight  || bestW  > pr.weight.value)  pr.weight  = { value:bestW,  date, workoutId };
  if (!pr.e1rm    || bestE  > pr.e1rm.value)    pr.e1rm    = { value:Math.round(bestE*10)/10, date, workoutId };
  if (!pr.volume  || vol    > pr.volume.value)  pr.volume  = { value:vol,    date, workoutId };
}

function recalcAllPRs() {
  DB.prs = {};
  DB.workouts.forEach(w => w.exercises.forEach(ex => checkAndSavePR(ex, w.id, w.date)));
}

function getPrevSet(exerciseId, setIndex) {
  const prev = [...DB.workouts].reverse().find(w => w.exercises.some(e=>e.exerciseId===exerciseId));
  if (!prev) return null;
  const ex = prev.exercises.find(e=>e.exerciseId===exerciseId);
  return ex?.sets[setIndex]||ex?.sets[ex.sets.length-1]||null;
}

/* ── TEMPLATES ──────────────────────────────────────────────────────── */
function renderTemplates() {
  const list = document.getElementById('templates-list');
  if (DB.templates.length===0) {
    list.innerHTML = '<div class="empty-state"><div class="es-icon">📋</div><p>No templates yet. Create your first workout!</p></div>';
    return;
  }
  list.innerHTML = DB.templates.map(t=>`
    <div class="template-item">
      <div class="ti-info" onclick="openTemplateEditor('${t.id}')">
        <div class="ti-name">${esc(t.name)}</div>
        <div class="ti-count">${t.exercises.length} exercise${t.exercises.length!==1?'s':''}</div>
      </div>
      <div class="ti-actions">
        <button class="btn-icon" onclick="startWorkout('${t.id}');showScreen('screen-active-workout',true)">▶️</button>
        <button class="btn-icon" onclick="openTemplateEditor('${t.id}')">✏️</button>
        <button class="btn-icon" style="color:var(--danger)" onclick="deleteTemplate('${t.id}')">🗑</button>
      </div>
    </div>`).join('');
}

document.getElementById('btn-new-template').addEventListener('click', () => {
  const t = { id:uid(), name:'New Template', exercises:[] };
  DB.templates.push(t);
  saveDB();
  renderTemplates();
  openTemplateEditor(t.id);
});

function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  DB.templates = DB.templates.filter(t=>t.id!==id);
  saveDB();
  renderTemplates();
}

/* Template editor */
let editingTemplateId = null;
let dragSrcIdx = null;

function openTemplateEditor(id) {
  editingTemplateId = id;
  const t = DB.templates.find(x=>x.id===id);
  if (!t) return;
  document.getElementById('tpl-name').value = t.name;
  renderTemplateExercises(t);
  showScreen('screen-template-editor', true);
}

function renderTemplateExercises(t) {
  const list = document.getElementById('tpl-exercise-list');
  list.innerHTML = t.exercises.map((te,i)=>{
    const ex = findExercise(te.exerciseId);
    return `
      <div class="ex-edit-item" draggable="true" data-idx="${i}"
           ondragstart="dragStart(event,${i})" ondragover="dragOver(event)" ondrop="dropEx(event,${i})">
        <span class="drag-handle">⠿</span>
        <span class="ex-edit-name">${esc(ex?.name||'?')}</span>
        <span class="ex-edit-rest">
          <input type="number" class="set-input" style="width:50px" value="${te.rest||90}" min="0" max="600"
            onchange="updateExRest(${i},this.value)"> s
        </span>
        <button class="btn-icon" style="color:var(--danger);font-size:16px" onclick="removeTplEx(${i})">✕</button>
      </div>`;
  }).join('') || '<p class="text-muted" style="font-size:13px;padding:8px 0">No exercises yet.</p>';
}

function dragStart(e, idx) { dragSrcIdx = idx; e.dataTransfer.effectAllowed='move'; }
function dragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function dropEx(e, toIdx) {
  e.preventDefault();
  if (dragSrcIdx===null||dragSrcIdx===toIdx) return;
  const t = DB.templates.find(x=>x.id===editingTemplateId);
  const [moved] = t.exercises.splice(dragSrcIdx,1);
  t.exercises.splice(toIdx,0,moved);
  dragSrcIdx=null;
  renderTemplateExercises(t);
}

function updateExRest(idx, val) {
  const t = DB.templates.find(x=>x.id===editingTemplateId);
  if (t) t.exercises[idx].rest = parseInt(val)||90;
}
function removeTplEx(idx) {
  const t = DB.templates.find(x=>x.id===editingTemplateId);
  if (t) { t.exercises.splice(idx,1); renderTemplateExercises(t); }
}

document.getElementById('tpl-name').addEventListener('input', e => {
  const t = DB.templates.find(x=>x.id===editingTemplateId);
  if (t) t.name = e.target.value;
});

document.getElementById('btn-add-ex-to-tpl').addEventListener('click', () => {
  openExercisePicker(exId => {
    const t = DB.templates.find(x=>x.id===editingTemplateId);
    if (t) { t.exercises.push({exerciseId:exId,rest:90}); renderTemplateExercises(t); }
  });
});

document.getElementById('btn-save-template').addEventListener('click', () => {
  saveDB();
  renderTemplates();
  showScreen('screen-templates');
});

document.getElementById('btn-back-template').addEventListener('click', () => {
  saveDB();
  renderTemplates();
  showScreen('screen-templates');
});

/* ── EXERCISE PICKER MODAL ──────────────────────────────────────────── */
let exercisePickerCallback = null;

function openExercisePicker(cb) {
  exercisePickerCallback = cb;
  document.getElementById('ex-search-input').value = '';
  renderExercisePickerList('');
  openModal('modal-exercise-picker');
}

document.getElementById('ex-search-input').addEventListener('input', e => renderExercisePickerList(e.target.value));

function renderExercisePickerList(query) {
  const q = query.toLowerCase();
  const list = document.getElementById('ex-picker-list');
  const matches = DB.exercises.filter(ex => ex.name.toLowerCase().includes(q) || ex.cat.toLowerCase().includes(q));
  list.innerHTML = matches.map(ex => {
    const badge = ex.type === 'time' ? ' <span class="type-badge">⏱ time</span>' : '';
    const desc  = ex.desc ? `<div class="esi-desc">${esc(ex.desc.length > 70 ? ex.desc.slice(0,70)+'…' : ex.desc)}</div>` : '';
    return `
      <div class="ex-search-item" onclick="pickExercise('${ex.id}')">
        <div>
          <div class="esi-name">${esc(ex.name)}${badge}</div>
          <div class="esi-cat">${esc(ex.cat)}</div>
          ${desc}
        </div>
      </div>`;
  }).join('') || '<div style="padding:16px;text-align:center;color:var(--muted)">No exercises found.</div>';
}

function pickExercise(id) {
  closeModal('modal-exercise-picker');
  if (exercisePickerCallback) exercisePickerCallback(id);
  exercisePickerCallback = null;
}

function createCustomExercise(onCreated) {
  const name = prompt('Exercise name:');
  if (!name?.trim()) return;
  const cat   = prompt('Category (e.g. Chest, Back, Legs, Cardio):')||'Other';
  const typeQ = prompt('Tracking type:\n• Leave blank for weight + reps (default)\n• Type "time" for time-based exercises (plank, running, etc.)')||'';
  const desc  = prompt('Short description / coaching cue (optional):')||'';
  const ex = { id:uid(), name:name.trim(), cat:cat.trim(),
               type: typeQ.trim().toLowerCase() === 'time' ? 'time' : 'weight',
               desc: desc.trim() };
  DB.exercises.push(ex);
  saveDB();
  if (typeof onCreated === 'function') onCreated(ex);
  showToast('Exercise added!');
}

document.getElementById('btn-new-exercise').addEventListener('click', () => {
  createCustomExercise(() => renderExercisePickerList(document.getElementById('ex-search-input').value));
});

/* ── EXERCISE STATS ─────────────────────────────────────────────────── */
let currentExerciseId = null;

function openExerciseStats(exId) {
  currentExerciseId = exId;
  const ex = findExercise(exId);
  document.getElementById('stats-ex-name').textContent = ex?.name||'Exercise';
  renderStatsTab('progress');
  showScreen('screen-exercise-stats', true);
}

document.getElementById('btn-back-stats').addEventListener('click', () => {
  if (activeWorkout) showScreen('screen-active-workout', true);
  else { renderHome(); showScreen('screen-home'); }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderStatsTab(btn.dataset.tab);
  });
});

function renderStatsTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id==='tab-'+tab));
  if (tab==='progress') renderProgressChart();
  if (tab==='prs')      renderPRsTab();
  if (tab==='history')  renderHistoryTab();
}

function renderProgressChart() {
  const wrap = document.getElementById('chart-wrap');
  const note = document.getElementById('chart-note');
  const sessions = getExerciseSessions(currentExerciseId);
  const isTime   = isTimeEx(currentExerciseId);
  if (note) note.textContent = isTime ? 'Best duration per session (seconds)' : 'e1RM over time (Epley formula)';
  if (sessions.length < 2) {
    wrap.innerHTML = '<div class="chart-empty">Need at least 2 sessions to show progress.</div>';
    return;
  }
  const vals  = sessions.map(s=>s.topE1rm);
  const dates = sessions.map(s=>new Date(s.date));
  const minV  = Math.min(...vals)*0.95;
  const maxV  = Math.max(...vals)*1.05;
  const W=320, H=160, PL=40, PR=10, PT=10, PB=30;
  const iw = W-PL-PR, ih = H-PT-PB;
  const toX = i => PL + i/(sessions.length-1)*iw;
  const toY = v => PT + ih - (v-minV)/(maxV-minV)*ih;
  let path = sessions.map((s,i)=>`${i?'L':'M'}${toX(i).toFixed(1)},${toY(vals[i]).toFixed(1)}`).join(' ');
  let dots = sessions.map((s,i)=>`<circle cx="${toX(i).toFixed(1)}" cy="${toY(vals[i]).toFixed(1)}" r="4" fill="var(--accent)"/>`).join('');
  // y-axis labels
  const yMaxLabel = isTime ? fmtDur(Math.round(maxV)) : maxV.toFixed(0);
  const yMinLabel = isTime ? fmtDur(Math.round(minV)) : minV.toFixed(0);
  // x labels (first + last)
  const xl = `<text x="${toX(0)}" y="${H-2}" text-anchor="middle" fill="var(--muted)" font-size="10">${fmtDateShort(dates[0])}</text>
    <text x="${toX(sessions.length-1)}" y="${H-2}" text-anchor="middle" fill="var(--muted)" font-size="10">${fmtDateShort(dates[dates.length-1])}</text>`;
  const yl = `<text x="4" y="${toY(maxV)+4}" fill="var(--muted)" font-size="10">${yMaxLabel}</text>
    <text x="4" y="${toY(minV)+4}" fill="var(--muted)" font-size="10">${yMinLabel}</text>`;
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${path}" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linejoin="round"/>
    ${dots}${xl}${yl}
  </svg>`;
}

function renderPRsTab() {
  const pr   = DB.prs[currentExerciseId]||{};
  const unit = DB.settings.unit;
  if (isTimeEx(currentExerciseId)) {
    document.getElementById('tab-prs').innerHTML = `
      <div class="pr-row"><div class="pr-label">⏱ Best Time</div><div><div class="pr-val">${pr.duration ? fmtDur(pr.duration.value) : '—'}</div><div class="pr-date">${pr.duration ? fmtDate(pr.duration.date) : ''}</div></div></div>`;
    return;
  }
  document.getElementById('tab-prs').innerHTML = `
    <div class="pr-row"><div class="pr-label">🏋️ Best Weight</div><div><div class="pr-val">${pr.weight ? pr.weight.value+' '+unit : '—'}</div><div class="pr-date">${pr.weight ? fmtDate(pr.weight.date):''}</div></div></div>
    <div class="pr-row"><div class="pr-label">📊 Best e1RM</div><div><div class="pr-val">${pr.e1rm ? pr.e1rm.value+' '+unit : '—'}</div><div class="pr-date">${pr.e1rm ? fmtDate(pr.e1rm.date):''}</div></div></div>
    <div class="pr-row"><div class="pr-label">📦 Best Volume</div><div><div class="pr-val">${pr.volume ? fmtVol(pr.volume.value)+' '+unit : '—'}</div><div class="pr-date">${pr.volume ? fmtDate(pr.volume.date):''}</div></div></div>`;
}

function renderHistoryTab() {
  const sessions = getExerciseSessions(currentExerciseId).reverse();
  const el = document.getElementById('tab-history');
  if (!sessions.length) { el.innerHTML='<div class="empty-state"><p>No history yet.</p></div>'; return; }
  const isTime = isTimeEx(currentExerciseId);
  el.innerHTML = sessions.map(s=>`
    <div class="history-item">
      <div class="hi-date">${fmtDate(s.date)}</div>
      <div class="hi-sets">${s.sets.map((st,i) =>
        isTime ? `Set ${i+1}: ${fmtDur(st.duration)}` : `Set ${i+1}: ${st.weight} × ${st.reps}`
      ).join(' · ')}</div>
    </div>`).join('');
}

function getExerciseSessions(exId) {
  if (isTimeEx(exId)) {
    return DB.workouts
      .filter(w => w.exercises.some(e => e.exerciseId === exId))
      .map(w => {
        const ex   = w.exercises.find(e => e.exerciseId === exId);
        const done = ex.sets.filter(s => s.completed && s.duration > 0);
        return { date: w.date, sets: done, topE1rm: done.length ? Math.max(...done.map(s => s.duration)) : 0 };
      })
      .filter(s => s.sets.length > 0);
  }
  return DB.workouts
    .filter(w=>w.exercises.some(e=>e.exerciseId===exId))
    .map(w=>{ const ex=w.exercises.find(e=>e.exerciseId===exId);
      const done=ex.sets.filter(s=>s.completed&&s.weight>0&&s.reps>0);
      return { date:w.date, sets:done, topE1rm:done.length?Math.max(...done.map(s=>EPLEY(s.weight,s.reps))):0 }; })
    .filter(s=>s.sets.length>0);
}

/* ── FRIENDS ────────────────────────────────────────────────────────── */
function renderFriends() {
  const u = DB.settings.username||'Athlete';
  document.getElementById('my-profile-name').textContent = u;
  document.getElementById('my-share-code').textContent   = DB.settings.userId.slice(0,8).toUpperCase();
  const avatar = document.getElementById('my-avatar');
  avatar.textContent = u.charAt(0).toUpperCase();

  renderMyPRsSummary();
  renderFriendList();
}

function renderMyPRsSummary() {
  const pr = DB.prs;
  const unit = DB.settings.unit;
  const shared = DB.settings.sharedExercises;
  const exercisesToShow = shared.length > 0
    ? shared.map(id=>findExercise(id)).filter(Boolean)
    : Object.keys(pr).slice(0,5).map(id=>findExercise(id)).filter(Boolean);

  const el = document.getElementById('my-pr-summary');
  if (!exercisesToShow.length) { el.innerHTML='<p class="text-muted" style="font-size:13px">No PRs yet.</p>'; return; }
  el.innerHTML = exercisesToShow.map(ex=>{
    const p=pr[ex.id];
    return p?.weight ? `<div class="friend-pr-item"><span class="fpi-name">${esc(ex.name)}</span><span class="fpi-val">${p.weight.value} ${unit}</span></div>` : '';
  }).join('');
}

function renderFriendList() {
  const list = document.getElementById('friends-list');
  if (!DB.friends.length) {
    list.innerHTML='<div class="empty-state"><div class="es-icon">👥</div><p>No friends yet. Share your code or add a friend\'s code.</p></div>';
    return;
  }
  list.innerHTML = DB.friends.map(f=>`
    <div class="friend-item" onclick="openFriendProfile('${f.id}')">
      <div class="friend-avatar">👤</div>
      <div class="friend-info">
        <div class="friend-name">${esc(f.username)}</div>
        <div class="friend-pr-count">${Object.keys(f.prs||{}).length} PR(s) shared</div>
      </div>
      <span style="color:var(--muted)">›</span>
    </div>`).join('');
}

document.getElementById('btn-share-my-prs').addEventListener('click', () => {
  const shareData = buildShareData();
  const code = btoa(JSON.stringify(shareData)).replace(/=/g,'');
  document.getElementById('share-link-display').textContent = code.slice(0,20)+'…';
  document.getElementById('share-link-full').value = code;
  openModal('modal-share');
});

document.getElementById('btn-copy-share').addEventListener('click', () => {
  const val = document.getElementById('share-link-full').value;
  navigator.clipboard?.writeText(val).then(()=>showToast('Copied!')).catch(()=>showToast('Copy the code above manually'));
});

document.getElementById('btn-add-friend').addEventListener('click', () => openModal('modal-add-friend'));

document.getElementById('btn-import-friend').addEventListener('click', () => {
  const code = document.getElementById('friend-code-input').value.trim();
  if (!code) return;
  try {
    const data = JSON.parse(atob(code));
    if (!data.username||!data.userId) throw new Error('bad format');
    if (DB.friends.find(f=>f.id===data.userId)) { showToast('Already added!'); return; }
    DB.friends.push({ id:data.userId, username:data.username, prs:data.prs||{}, exercises:data.exercises||[] });
    saveDB();
    renderFriends();
    closeModal('modal-add-friend');
    showToast(`Added ${data.username}!`);
  } catch(e) { alert('Invalid code. Please ask your friend to share again.'); }
});

function buildShareData() {
  const shared = DB.settings.sharedExercises;
  const prKeys = shared.length>0 ? shared : Object.keys(DB.prs);
  const prsToShare = {};
  prKeys.forEach(id => { if (DB.prs[id]) prsToShare[id]=DB.prs[id]; });
  const exercisesToShare = prKeys.map(id=>findExercise(id)).filter(Boolean).map(e=>({id:e.id,name:e.name,cat:e.cat}));
  return { userId:DB.settings.userId, username:DB.settings.username||'Athlete', prs:prsToShare, exercises:exercisesToShare };
}

function openFriendProfile(id) {
  const f = DB.friends.find(x=>x.id===id);
  if (!f) return;
  document.getElementById('friend-profile-name').textContent = f.username;
  const unit = DB.settings.unit;
  const list = document.getElementById('friend-prs-list');
  const exes = f.exercises||[];
  const prs  = f.prs||{};
  const keys = Object.keys(prs);
  if (!keys.length) { list.innerHTML='<p class="text-muted">No PRs shared.</p>'; }
  else {
    list.innerHTML = keys.map(id=>{
      const ex = exes.find(e=>e.id===id)||findExercise(id)||{name:id};
      const p  = prs[id];
      return `<div class="friend-pr-item">
        <div><div class="fpi-name">${esc(ex.name)}</div><div class="text-muted" style="font-size:11px">${p.weight?fmtDate(p.weight.date):''}</div></div>
        <div class="fpi-val">${p.weight ? p.weight.value+' '+unit : '—'}</div>
      </div>`;
    }).join('');
  }
  document.getElementById('btn-remove-friend').onclick = () => {
    if (!confirm(`Remove ${f.username}?`)) return;
    DB.friends = DB.friends.filter(x=>x.id!==id);
    saveDB(); renderFriends(); showScreen('screen-friends');
  };
  showScreen('screen-friend-profile', true);
}

document.getElementById('btn-back-friend').addEventListener('click', () => { renderFriends(); showScreen('screen-friends'); });

/* ── SETTINGS ───────────────────────────────────────────────────────── */
function renderSettings() {
  const username = DB.settings.username||'Athlete';
  document.getElementById('settings-username').textContent = username;
  document.getElementById('settings-unit-select').value = DB.settings.unit;
  document.getElementById('settings-privacy-select').value = DB.settings.privacy;
  document.getElementById('offline-status').textContent = navigator.onLine ? '🟢 Online' : '🔴 Offline';
  renderSharedExercises();
  document.getElementById('settings-userpanel-name').textContent = username;
  document.getElementById('settings-userpanel-id').textContent = 'ID ' + String(DB.settings.userId || 'LOCAL').slice(0,8).toUpperCase();
  document.getElementById('settings-userpanel-workouts').textContent = `${DB.workouts.length} workout${DB.workouts.length !== 1 ? 's' : ''}`;
  document.getElementById('settings-userpanel-unit').textContent = (DB.settings.unit || 'kg').toUpperCase();
  document.getElementById('settings-user-avatar').textContent = username.slice(0,1).toUpperCase();

  // Account section – only visible when using the backend
  const authUser = GymApi.getAuthUser();
  const accountSection = document.getElementById('settings-account-section');
  const accountRow = document.getElementById('settings-account-row');
  if (authUser && API_CONFIG.useBackend) {
    accountSection.style.display = '';
    accountRow.style.display = '';
    document.getElementById('settings-email').textContent = authUser.email || authUser.name;
  } else {
    accountSection.style.display = 'none';
    accountRow.style.display = 'none';
  }
}

document.getElementById('settings-unit-select').addEventListener('change', e => {
  DB.settings.unit = e.target.value; saveDB();
});
document.getElementById('settings-privacy-select').addEventListener('change', e => {
  DB.settings.privacy = e.target.value; saveDB();
});
document.getElementById('btn-change-name').addEventListener('click', () => {
  const n = prompt('Your name:', DB.settings.username);
  if (n?.trim()) { DB.settings.username=n.trim(); saveDB(); renderSettings(); }
});
document.getElementById('btn-userpanel-edit').addEventListener('click', () => {
  document.getElementById('btn-change-name').click();
});
document.getElementById('btn-userpanel-add-exercise').addEventListener('click', () => {
  createCustomExercise();
});
document.getElementById('btn-userpanel-export').addEventListener('click', () => {
  document.getElementById('btn-export-json').click();
});

function renderSharedExercises() {
  const list = document.getElementById('shared-exercises-list');
  const prs  = Object.keys(DB.prs);
  if (!prs.length) { list.innerHTML='<p class="text-muted" style="font-size:13px">No exercises with PRs yet.</p>'; return; }
  list.innerHTML = prs.map(id=>{
    const ex = findExercise(id);
    const checked = DB.settings.sharedExercises.includes(id)||DB.settings.sharedExercises.length===0;
    return `<label style="display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer">
      <input type="checkbox" ${checked?'checked':''} onchange="toggleSharedEx('${id}',this.checked)" style="width:18px;height:18px;accent-color:var(--accent)">
      <span>${esc(ex?.name||id)}</span>
    </label>`;
  }).join('');
}

function toggleSharedEx(id, checked) {
  if (checked) { if (!DB.settings.sharedExercises.includes(id)) DB.settings.sharedExercises.push(id); }
  else { DB.settings.sharedExercises = DB.settings.sharedExercises.filter(x=>x!==id); }
  saveDB();
}

/* Export */
document.getElementById('btn-export-json').addEventListener('click', () => {
  download(JSON.stringify(DB, null, 2), 'gymlog-backup.json', 'application/json');
  showToast('JSON exported!');
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
  const rows = [['Date','Template','Exercise','Set','Weight','Reps','e1RM','Duration(s)']];
  DB.workouts.forEach(w => {
    w.exercises.forEach(ex => {
      const exObj  = findExercise(ex.exerciseId);
      const isTime = isTimeEx(ex.exerciseId);
      ex.sets.filter(s=>s.completed).forEach((s,i)=>{
        if (isTime) {
          rows.push([w.date.slice(0,10), w.templateName||'', exObj?.name||ex.exerciseId, i+1, '', '', '', s.duration||0]);
        } else {
          rows.push([w.date.slice(0,10), w.templateName||'', exObj?.name||ex.exerciseId, i+1, s.weight, s.reps, EPLEY(s.weight,s.reps).toFixed(1), '']);
        }
      });
    });
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  download(csv, 'gymlog-export.csv', 'text/csv');
  showToast('CSV exported!');
});

document.getElementById('btn-reset-data').addEventListener('click', () => {
  if (!confirm('⚠️ This will delete ALL data. Are you sure?')) return;
  if (!confirm('Really delete everything? This cannot be undone.')) return;
  localStorage.removeItem(STORE_KEY);
  location.reload();
});

/* ── MODALS ─────────────────────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target===m) m.classList.remove('show'); });
});
document.querySelectorAll('.btn-modal-close').forEach(b => {
  b.addEventListener('click', () => closeModal(b.closest('.modal-overlay').id));
});

/* ── HELPERS ────────────────────────────────────────────────────────── */
function findExercise(id) { return DB.exercises.find(e=>e.id===id)||null; }

function fmtDur(seconds) {
  if (!seconds && seconds!==0) return '—';
  const h=Math.floor(seconds/3600), m=Math.floor((seconds%3600)/60), s=seconds%60;
  if (h>0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function pad(n) { return String(n).padStart(2,'0'); }
function fmtVol(v) { return v>=1000 ? (v/1000).toFixed(1)+'k' : String(Math.round(v)); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}
function fmtDateShort(d) { return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg) {
  let t = document.getElementById('generic-toast');
  if (!t) { t=document.createElement('div'); t.id='generic-toast'; t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 18px;font-size:14px;z-index:500;transition:opacity .3s;pointer-events:none;white-space:nowrap'; document.body.appendChild(t); }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._timer); t._timer=setTimeout(()=>{ t.style.opacity='0'; },2200);
}

function download(content, filename, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content],{type}));
  a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

/* ── SERVICE WORKER (offline) ───────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

/* ── AUTH SCREENS ───────────────────────────────────────────────────── */

function showAuthScreen(id) {
  document.querySelectorAll('.screen, .auth-screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.getElementById('bottom-nav')?.style && (document.getElementById('bottom-nav').style.display = 'none');
}

function showAuthError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

// Password visibility toggles
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById(btn.dataset.target);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  });
});

// Login form
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showAuthError('auth-error', '');
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const email       = document.getElementById('login-email').value.trim().toLowerCase();
    const passwordRaw = document.getElementById('login-password').value;
    let res = await GymApi.login(email, passwordRaw);
    if (!res?.token && passwordRaw !== passwordRaw.trim()) {
      res = await GymApi.login(email, passwordRaw.trim());
    }
    if (res?.token) {
      DB.settings.username = res.user?.name || email;
      DB.settings.userId   = String(res.user?.id || '');
      saveDB();
      startApp();
    }
  } catch (err) {
    showAuthError('auth-error', err.message || 'Login failed. Check your email and password.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

// Register form
let _regUnit = 'kg';
document.getElementById('reg-unit-kg')?.addEventListener('click', () => {
  _regUnit = 'kg';
  document.getElementById('reg-unit-kg').classList.add('active');
  document.getElementById('reg-unit-lb').classList.remove('active');
});
document.getElementById('reg-unit-lb')?.addEventListener('click', () => {
  _regUnit = 'lb';
  document.getElementById('reg-unit-lb').classList.add('active');
  document.getElementById('reg-unit-kg').classList.remove('active');
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showAuthError('register-error', '');
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pw    = document.getElementById('reg-password').value;
  const pw2   = document.getElementById('reg-password-confirm').value;

  if (pw !== pw2) { showAuthError('register-error', 'Passwords do not match.'); return; }
  if (pw.length < 8) { showAuthError('register-error', 'Password must be at least 8 characters.'); return; }

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Creating account…';
  try {
    const res = await GymApi.register(name, email, pw, _regUnit);
    if (res?.token) {
      DB.settings.username = res.user?.name || name;
      DB.settings.unit     = _regUnit;
      DB.settings.userId   = String(res.user?.id || '');
      saveDB();
      startApp();
    }
  } catch (err) {
    showAuthError('register-error', err.message || 'Registration failed. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create account';
  }
});

// Nav between auth screens
document.getElementById('btn-goto-register')?.addEventListener('click', () => showAuthScreen('screen-register'));
document.getElementById('btn-goto-login')?.addEventListener('click',    () => showAuthScreen('screen-login'));

// Offline mode (skip auth)
document.getElementById('btn-offline-mode')?.addEventListener('click', () => {
  API_CONFIG.useBackend = false;
  startApp();
});

// Logout (in settings)
document.getElementById('btn-logout')?.addEventListener('click', async () => {
  if (!confirm('Sign out?')) return;
  await GymApi.logout();
  // Reload to show login screen
  location.reload();
});

/** Called once auth is confirmed (token found or offline chosen). Shows the app. */
function startApp() {
  document.getElementById('bottom-nav').style.display = '';
  initOnboarding(); // this will show home or onboarding
}

/* ── BOOT ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // If a backend URL is configured and we have a stored token, go straight to the app.
  // Otherwise show the login screen (if backend configured) or go directly offline.
  if (API_CONFIG.useBackend && API_CONFIG.token) {
    // Validate the token silently, then start
    GymApi.me().then(user => {
      if (user) {
        startApp();
      } else {
        // Token expired – clear it and show login
        GymApi.logout();
        showAuthScreen('screen-login');
      }
    }).catch(() => {
      // Network down but token present – start in degraded offline mode
      startApp();
    });
  } else if (API_CONFIG.useBackend && !API_CONFIG.token) {
    // Backend configured but not logged in
    showAuthScreen('screen-login');
  } else {
    // Fully offline mode
    startApp();
  }
});
