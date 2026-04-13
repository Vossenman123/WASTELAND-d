/**
 * api.js – GymLog Data Abstraction Layer
 * =========================================
 * Supports 3 providers:
 *  - local     : localStorage only (offline)
 *  - laravel   : REST API (Sanctum/Bearer)
 *  - firebase  : Firebase Auth + Firestore
 */

'use strict';

const API_PROVIDER_KEY = 'gymlog_api_provider';
const API_BASE_URL_KEY = 'gymlog_api_base_url';
const API_BACKEND_ENABLED_KEY = 'gymlog_api_use_backend';
const FIREBASE_CONFIG_KEY = 'gymlog_firebase_config';

const API_CONFIG = {
  /** True = use configured backend provider, false = local-only */
  useBackend: false,
  /** 'laravel' | 'firebase' */
  provider: 'firebase',
  /** Base URL for Laravel REST API, e.g. https://your-app.test/api */
  baseUrl: '',
  /** Auth token (Laravel bearer token or Firebase ID token) */
  token: null,
  /** Firebase project config (Web App config from Firebase console) */
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
    storageBucket: '',
    messagingSenderId: '',
  },
};

/* ── Token persistence ─────────────────────────────────────────────── */
const TOKEN_KEY = 'gymlog_api_token';
const AUTH_USER_KEY = 'gymlog_auth_user';
let _authUserCache = null;

function _loadToken() {
  if (API_CONFIG.provider === 'firebase') {
    API_CONFIG.token = null;
    _authUserCache = null;
    return;
  }
  API_CONFIG.token = localStorage.getItem(TOKEN_KEY) || null;
  try { _authUserCache = JSON.parse(localStorage.getItem(AUTH_USER_KEY)) || null; }
  catch (_) { _authUserCache = null; }
}
function _saveLaravelToken(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    API_CONFIG.token = token;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    API_CONFIG.token = null;
  }
  if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_USER_KEY);
  _authUserCache = user || null;
}
function _saveFirebaseSession(token, user) {
  API_CONFIG.token = token || null;
  _authUserCache = user || null;
}
function _getAuthUser() {
  if (API_CONFIG.provider === 'firebase') return _authUserCache;
  try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)) || null; }
  catch (_) { return null; }
}

/* ── API config persistence ─────────────────────────────────────────── */
function _loadApiConfig() {
  const storedProvider = String(localStorage.getItem(API_PROVIDER_KEY) || '').trim().toLowerCase();
  if (storedProvider === 'firebase' || storedProvider === 'laravel') {
    API_CONFIG.provider = storedProvider;
  }

  const storedBase = String(localStorage.getItem(API_BASE_URL_KEY) || '').trim();
  if (storedBase) API_CONFIG.baseUrl = storedBase;

  const storedBackendFlag = localStorage.getItem(API_BACKEND_ENABLED_KEY);
  if (storedBackendFlag === '1') API_CONFIG.useBackend = true;
  if (storedBackendFlag === '0') API_CONFIG.useBackend = false;

  const storedFirebaseCfg = String(localStorage.getItem(FIREBASE_CONFIG_KEY) || '').trim();
  if (storedFirebaseCfg) {
    try {
      const parsed = JSON.parse(storedFirebaseCfg);
      API_CONFIG.firebase = { ...API_CONFIG.firebase, ...(parsed || {}) };
    } catch (_) {}
  }
}

function _persistApiConfig() {
  localStorage.setItem(API_PROVIDER_KEY, API_CONFIG.provider === 'laravel' ? 'laravel' : 'firebase');
  localStorage.setItem(API_BASE_URL_KEY, String(API_CONFIG.baseUrl || '').trim());
  localStorage.setItem(API_BACKEND_ENABLED_KEY, API_CONFIG.useBackend ? '1' : '0');
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(API_CONFIG.firebase || {}));
}

/* ── Internal localStorage helpers ─────────────────────────────────── */
const STORE_KEY_API = 'gymlog_v1';

function _loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY_API)) || null; }
  catch (e) { return null; }
}
function _saveLocal(db) {
  localStorage.setItem(STORE_KEY_API, JSON.stringify(db));
}

function _emptyDb() {
  return {
    settings: {},
    exercises: [],
    templates: [],
    workouts: [],
    prs: {},
    friends: [],
    onboarded: false,
  };
}

function _normalizeDb(db) {
  const src = db || {};
  return {
    settings: src.settings || {},
    exercises: Array.isArray(src.exercises) ? src.exercises : [],
    templates: Array.isArray(src.templates) ? src.templates : [],
    workouts: Array.isArray(src.workouts) ? src.workouts : [],
    prs: src.prs && typeof src.prs === 'object' ? src.prs : {},
    friends: Array.isArray(src.friends) ? src.friends : [],
    onboarded: !!src.onboarded,
  };
}

function _isFirebaseBackend() {
  return API_CONFIG.useBackend && API_CONFIG.provider === 'firebase';
}

function _isLaravelBackend() {
  return API_CONFIG.useBackend && API_CONFIG.provider !== 'firebase';
}

/* ── HTTP helper (Laravel / REST) ───────────────────────────────────── */
async function _http(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (API_CONFIG.token) headers['Authorization'] = 'Bearer ' + API_CONFIG.token;
  const res = await fetch(API_CONFIG.baseUrl + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let json = null;
    let detail = '';
    try {
      json = await res.clone().json();
      detail = json.message || JSON.stringify(json);
    } catch (_) {
      try { detail = await res.text(); } catch (__) {}
    }

    const err = new Error(`API error ${res.status} (${path}): ${detail || res.statusText}`);
    err.status = res.status;
    err.path = path;
    err.payload = json;

    if (path === '/login' && (res.status === 401 || res.status === 422)) {
      err.message = 'Incorrect email or password.';
    }
    if (path === '/register' && res.status === 422) {
      err.message = 'Registration failed. Please check your details and try again.';
    }

    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ── Firebase provider helper ───────────────────────────────────────── */
let _firebaseCtxPromise = null;

async function _firebaseCtx() {
  if (!_firebaseCtxPromise) {
    _firebaseCtxPromise = (async () => {
      const cfg = API_CONFIG.firebase || {};
      if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
        throw new Error('Firebase is selected, but API_CONFIG.firebase is incomplete (apiKey, authDomain, projectId, appId are required).');
      }

      const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
      ]);

      const app = initializeApp(cfg);
      const auth = authMod.getAuth(app);
      const db = firestoreMod.getFirestore(app);

      const authReady = new Promise(resolve => {
        const unsub = authMod.onAuthStateChanged(auth, () => {
          unsub();
          resolve();
        });
      });

      return {
        auth,
        db,
        authReady,
        ...authMod,
        ...firestoreMod,
      };
    })();
  }
  return _firebaseCtxPromise;
}

async function _firebaseUser(required = true) {
  const ctx = await _firebaseCtx();
  await ctx.authReady;
  const user = ctx.auth.currentUser;
  if (required && !user) throw new Error('Please sign in first.');
  return { ctx, user };
}

async function _firebaseGetDb() {
  const { ctx, user } = await _firebaseUser(true);
  const ref = ctx.doc(ctx.db, 'gymlog_users', user.uid);
  const snap = await ctx.getDoc(ref);
  if (!snap.exists()) {
    const seeded = _normalizeDb(_loadLocal() || _emptyDb());
    if (!seeded.settings) seeded.settings = {};
    seeded.settings.userId = seeded.settings.userId || user.uid;
    seeded.settings.username = seeded.settings.username || user.displayName || user.email || 'Athlete';
    await ctx.setDoc(ref, { ...seeded, updatedAt: ctx.serverTimestamp() }, { merge: true });
    return seeded;
  }
  const db = _normalizeDb(snap.data());
  return db;
}

async function _firebaseSetDb(db) {
  const { ctx, user } = await _firebaseUser(true);
  const normalized = _normalizeDb(db);
  const ref = ctx.doc(ctx.db, 'gymlog_users', user.uid);
  await ctx.setDoc(ref, { ...normalized, updatedAt: ctx.serverTimestamp() }, { merge: true });
  return normalized;
}

async function _firebaseMutate(mutator) {
  const db = await _firebaseGetDb();
  const next = await mutator(db) || db;
  return _firebaseSetDb(next);
}

/* ═══════════════════════════════════════════════════════════════════
   PUBLIC API CLIENT
   ═══════════════════════════════════════════════════════════════════ */

const GymApi = {

  /* ── EXERCISES ──────────────────────────────────────────────────── */

  async getExercises() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.exercises) || [];
    if (_isFirebaseBackend()) return (await _firebaseGetDb()).exercises;
    return _http('GET', '/exercises');
  },

  async createExercise(data) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.exercises.push(data);
      _saveLocal(db);
      return data;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => { db.exercises.push(data); return db; });
      return data;
    }
    return _http('POST', '/exercises', data);
  },

  async updateExercise(id, data) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      const i = db.exercises.findIndex(e => e.id === id);
      if (i === -1) throw new Error('Exercise not found');
      db.exercises[i] = { ...db.exercises[i], ...data };
      _saveLocal(db);
      return db.exercises[i];
    }
    if (_isFirebaseBackend()) {
      let updated = null;
      await _firebaseMutate(db => {
        const i = db.exercises.findIndex(e => e.id === id);
        if (i === -1) throw new Error('Exercise not found');
        db.exercises[i] = { ...db.exercises[i], ...data };
        updated = db.exercises[i];
        return db;
      });
      return updated;
    }
    return _http('PUT', '/exercises/' + id, data);
  },

  async deleteExercise(id) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.exercises = db.exercises.filter(e => e.id !== id);
      _saveLocal(db);
      return null;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => {
        db.exercises = db.exercises.filter(e => e.id !== id);
        return db;
      });
      return null;
    }
    return _http('DELETE', '/exercises/' + id);
  },

  /* ── WORKOUTS ───────────────────────────────────────────────────── */

  async getWorkouts() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.workouts) || [];
    if (_isFirebaseBackend()) return (await _firebaseGetDb()).workouts;
    return _http('GET', '/workouts');
  },

  async getWorkout(id) {
    if (!API_CONFIG.useBackend) {
      return ((_loadLocal()?.workouts) || []).find(w => w.id === id) || null;
    }
    if (_isFirebaseBackend()) {
      return (await _firebaseGetDb()).workouts.find(w => w.id === id) || null;
    }
    return _http('GET', '/workouts/' + id);
  },

  async createWorkout(data) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.workouts.push(data);
      _saveLocal(db);
      return data;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => { db.workouts.push(data); return db; });
      return data;
    }
    return _http('POST', '/workouts', data);
  },

  async deleteWorkout(id) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.workouts = db.workouts.filter(w => w.id !== id);
      _saveLocal(db);
      return null;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => {
        db.workouts = db.workouts.filter(w => w.id !== id);
        return db;
      });
      return null;
    }
    return _http('DELETE', '/workouts/' + id);
  },

  /* ── TEMPLATES ──────────────────────────────────────────────────── */

  async getTemplates() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.templates) || [];
    if (_isFirebaseBackend()) return (await _firebaseGetDb()).templates;
    return _http('GET', '/templates');
  },

  async createTemplate(data) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.templates.push(data);
      _saveLocal(db);
      return data;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => { db.templates.push(data); return db; });
      return data;
    }
    return _http('POST', '/templates', data);
  },

  async updateTemplate(id, data) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      const i = db.templates.findIndex(t => t.id === id);
      if (i === -1) throw new Error('Template not found');
      db.templates[i] = { ...db.templates[i], ...data };
      _saveLocal(db);
      return db.templates[i];
    }
    if (_isFirebaseBackend()) {
      let updated = null;
      await _firebaseMutate(db => {
        const i = db.templates.findIndex(t => t.id === id);
        if (i === -1) throw new Error('Template not found');
        db.templates[i] = { ...db.templates[i], ...data };
        updated = db.templates[i];
        return db;
      });
      return updated;
    }
    return _http('PUT', '/templates/' + id, data);
  },

  async deleteTemplate(id) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.templates = db.templates.filter(t => t.id !== id);
      _saveLocal(db);
      return null;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => {
        db.templates = db.templates.filter(t => t.id !== id);
        return db;
      });
      return null;
    }
    return _http('DELETE', '/templates/' + id);
  },

  /* ── PRs ────────────────────────────────────────────────────────── */

  async getPRs() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.prs) || {};
    if (_isFirebaseBackend()) return (await _firebaseGetDb()).prs || {};
    return _http('GET', '/prs');
  },

  async savePRs(prs) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.prs = prs;
      _saveLocal(db);
      return prs;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => { db.prs = prs || {}; return db; });
      return prs;
    }
    return _http('PUT', '/prs', prs);
  },

  /* ── SETTINGS ───────────────────────────────────────────────────── */

  async getSettings() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.settings) || {};
    if (_isFirebaseBackend()) return (await _firebaseGetDb()).settings || {};
    return _http('GET', '/settings');
  },

  async updateSettings(data) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.settings = { ...db.settings, ...data };
      _saveLocal(db);
      return db.settings;
    }
    if (_isFirebaseBackend()) {
      let settings = null;
      await _firebaseMutate(db => {
        db.settings = { ...db.settings, ...data };
        settings = db.settings;
        return db;
      });
      return settings;
    }
    return _http('PUT', '/settings', data);
  },

  /* ── FRIENDS ────────────────────────────────────────────────────── */

  async getFriends() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.friends) || [];
    if (_isFirebaseBackend()) return (await _firebaseGetDb()).friends || [];
    return _http('GET', '/friends');
  },

  async addFriend(shareCode) {
    if (!API_CONFIG.useBackend) {
      /* Handled inline in app.js (decoding share code) */
      return null;
    }
    if (_isFirebaseBackend()) {
      /* Friend import/share remains handled in app.js for now */
      return null;
    }
    return _http('POST', '/friends', { share_code: shareCode });
  },

  async removeFriend(id) {
    if (!API_CONFIG.useBackend) {
      const db = _normalizeDb(_loadLocal());
      db.friends = db.friends.filter(f => f.id !== id);
      _saveLocal(db);
      return null;
    }
    if (_isFirebaseBackend()) {
      await _firebaseMutate(db => {
        db.friends = db.friends.filter(f => f.id !== id);
        return db;
      });
      return null;
    }
    return _http('DELETE', '/friends/' + id);
  },

  /* ── AUTH ────────────────────────────────────────────────────────── */

  async register(name, email, password, unit = 'kg') {
    if (!API_CONFIG.useBackend) return null;

    if (_isFirebaseBackend()) {
      const ctx = await _firebaseCtx();
      const cred = await ctx.createUserWithEmailAndPassword(ctx.auth, email, password);
      if (name) await ctx.updateProfile(cred.user, { displayName: name });

      const token = await cred.user.getIdToken();
      const user = {
        id: cred.user.uid,
        name: cred.user.displayName || name || email,
        email: cred.user.email || email,
      };
      _saveFirebaseSession(token, user);

      const seeded = _normalizeDb(_loadLocal() || _emptyDb());
      seeded.settings = { ...seeded.settings, username: user.name, userId: user.id, unit };
      await _firebaseSetDb(seeded);

      _persistApiConfig();
      return { user, token };
    }

    const res = await _http('POST', '/register', {
      name,
      email,
      password,
      password_confirmation: password,
      unit,
    });
    if (res?.token) _saveLaravelToken(res.token, res.user);
    _persistApiConfig();
    return res;
  },

  async login(email, password) {
    if (!API_CONFIG.useBackend) return null;

    if (_isFirebaseBackend()) {
      const ctx = await _firebaseCtx();
      const cred = await ctx.signInWithEmailAndPassword(ctx.auth, email, password);
      const token = await cred.user.getIdToken();
      const user = {
        id: cred.user.uid,
        name: cred.user.displayName || email,
        email: cred.user.email || email,
      };
      _saveFirebaseSession(token, user);
      await _firebaseGetDb();
      _persistApiConfig();
      return { user, token };
    }

    const res = await _http('POST', '/login', { email, password });
    if (res?.token) _saveLaravelToken(res.token, res.user);
    _persistApiConfig();
    return res;
  },

  async logout() {
    if (!API_CONFIG.useBackend) return;

    if (_isFirebaseBackend()) {
      try {
        const ctx = await _firebaseCtx();
        await ctx.signOut(ctx.auth);
      } catch (_) {}
      _saveFirebaseSession(null, null);
      _persistApiConfig();
      return;
    }

    try { await _http('POST', '/logout'); } catch (_) {}
    _saveLaravelToken(null, null);
    _persistApiConfig();
  },

  async me() {
    if (!API_CONFIG.useBackend || !API_CONFIG.token) return null;

    if (_isFirebaseBackend()) {
      const { user } = await _firebaseUser(false);
      if (!user) return null;
      const token = await user.getIdToken();
      const payload = { id: user.uid, name: user.displayName || user.email, email: user.email || '' };
      _saveFirebaseSession(token, payload);
      return payload;
    }

    return _http('GET', '/me');
  },

  getAuthUser() {
    return _getAuthUser();
  },

  isAuthenticated() {
    return !!API_CONFIG.token;
  },
};

_loadApiConfig();
_loadToken();
_persistApiConfig();
