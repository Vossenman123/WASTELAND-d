/**
 * api.js – GymLog Data Abstraction Layer
 * =========================================
 * This file decouples all data operations from their storage backend.
 *
 * To connect to a Laravel (or any REST) backend:
 *   1. Set  API_CONFIG.useBackend = true
 *   2. Set  API_CONFIG.baseUrl    = 'https://your-laravel-app.test/api'
 *   3. Set  API_CONFIG.token      = '<your Sanctum / Passport token>'
 *
 * Expected Laravel API routes (see bottom of file for full route map):
 *   GET    /api/exercises          – index
 *   POST   /api/exercises          – store
 *   PUT    /api/exercises/{id}     – update
 *   DELETE /api/exercises/{id}     – destroy
 *   GET    /api/workouts           – index
 *   POST   /api/workouts           – store
 *   DELETE /api/workouts/{id}      – destroy
 *   GET    /api/templates          – index
 *   POST   /api/templates          – store
 *   PUT    /api/templates/{id}     – update
 *   DELETE /api/templates/{id}     – destroy
 *   GET    /api/prs                – index (keyed by exercise id)
 *   GET    /api/settings           – show
 *   PUT    /api/settings           – update
 *   GET    /api/friends            – index
 *   POST   /api/friends            – store  { share_code }
 *   DELETE /api/friends/{id}       – destroy
 */

'use strict';

const API_CONFIG = {
  /** Set to true to send all reads/writes to the Laravel backend. */
  useBackend: false,
  /** Base URL of your Laravel API, e.g. 'https://gym.example.com/api' */
  baseUrl: '',
  /**
   * Bearer token for authentication (Laravel Sanctum).
   * Populated automatically after login/register, persisted in localStorage.
   */
  token: null,
};

/* ── Token persistence ─────────────────────────────────────────────── */
const TOKEN_KEY = 'gymlog_api_token';
const AUTH_USER_KEY = 'gymlog_auth_user';

function _loadToken() {
  API_CONFIG.token = localStorage.getItem(TOKEN_KEY) || null;
}
function _saveToken(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    API_CONFIG.token = token;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    API_CONFIG.token = null;
  }
  if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_USER_KEY);
}
function _getAuthUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)) || null; }
  catch (_) { return null; }
}

// Initialise token from storage on page load
_loadToken();

/* ── Internal localStorage helpers ─────────────────────────────────── */
const STORE_KEY_API = 'gymlog_v1';

function _loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY_API)) || null; }
  catch (e) { return null; }
}
function _saveLocal(db) {
  localStorage.setItem(STORE_KEY_API, JSON.stringify(db));
}

/* ── HTTP helper ────────────────────────────────────────────────────── */
async function _http(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (API_CONFIG.token) headers['Authorization'] = 'Bearer ' + API_CONFIG.token;
  const res = await fetch(API_CONFIG.baseUrl + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try { const json = await res.clone().json(); detail = json.message || JSON.stringify(json); }
    catch (_) { try { detail = await res.text(); } catch (__) {} }
    throw new Error(`API error ${res.status} (${path}): ${detail || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════════
   PUBLIC API CLIENT
   ═══════════════════════════════════════════════════════════════════ */

const GymApi = {

  /* ── EXERCISES ──────────────────────────────────────────────────── */

  async getExercises() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.exercises) || [];
    return _http('GET', '/exercises');
  },

  async createExercise(data) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.exercises.push(data); _saveLocal(db); return data;
    }
    return _http('POST', '/exercises', data);
  },

  async updateExercise(id, data) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      const i = db.exercises.findIndex(e => e.id === id);
      if (i === -1) throw new Error('Exercise not found');
      db.exercises[i] = { ...db.exercises[i], ...data }; _saveLocal(db);
      return db.exercises[i];
    }
    return _http('PUT', '/exercises/' + id, data);
  },

  async deleteExercise(id) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.exercises = db.exercises.filter(e => e.id !== id); _saveLocal(db); return null;
    }
    return _http('DELETE', '/exercises/' + id);
  },

  /* ── WORKOUTS ───────────────────────────────────────────────────── */

  async getWorkouts() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.workouts) || [];
    return _http('GET', '/workouts');
  },

  async getWorkout(id) {
    if (!API_CONFIG.useBackend) {
      return ((_loadLocal()?.workouts) || []).find(w => w.id === id) || null;
    }
    return _http('GET', '/workouts/' + id);
  },

  async createWorkout(data) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.workouts.push(data); _saveLocal(db); return data;
    }
    return _http('POST', '/workouts', data);
  },

  async deleteWorkout(id) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.workouts = db.workouts.filter(w => w.id !== id); _saveLocal(db); return null;
    }
    return _http('DELETE', '/workouts/' + id);
  },

  /* ── TEMPLATES ──────────────────────────────────────────────────── */

  async getTemplates() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.templates) || [];
    return _http('GET', '/templates');
  },

  async createTemplate(data) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.templates.push(data); _saveLocal(db); return data;
    }
    return _http('POST', '/templates', data);
  },

  async updateTemplate(id, data) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      const i = db.templates.findIndex(t => t.id === id);
      if (i === -1) throw new Error('Template not found');
      db.templates[i] = { ...db.templates[i], ...data }; _saveLocal(db);
      return db.templates[i];
    }
    return _http('PUT', '/templates/' + id, data);
  },

  async deleteTemplate(id) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.templates = db.templates.filter(t => t.id !== id); _saveLocal(db); return null;
    }
    return _http('DELETE', '/templates/' + id);
  },

  /* ── PRs ────────────────────────────────────────────────────────── */

  async getPRs() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.prs) || {};
    return _http('GET', '/prs');
  },

  async savePRs(prs) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.prs = prs; _saveLocal(db); return prs;
    }
    /* In a backend scenario PRs are typically computed server-side
       from workout data; this endpoint may not be needed. */
    return _http('PUT', '/prs', prs);
  },

  /* ── SETTINGS ───────────────────────────────────────────────────── */

  async getSettings() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.settings) || {};
    return _http('GET', '/settings');
  },

  async updateSettings(data) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.settings = { ...db.settings, ...data }; _saveLocal(db); return db.settings;
    }
    return _http('PUT', '/settings', data);
  },

  /* ── FRIENDS ────────────────────────────────────────────────────── */

  async getFriends() {
    if (!API_CONFIG.useBackend) return (_loadLocal()?.friends) || [];
    return _http('GET', '/friends');
  },

  async addFriend(shareCode) {
    if (!API_CONFIG.useBackend) {
      /* Handled inline in app.js (decoding share code) */
      return null;
    }
    return _http('POST', '/friends', { share_code: shareCode });
  },

  async removeFriend(id) {
    if (!API_CONFIG.useBackend) {
      const db = _loadLocal(); if (!db) throw new Error('No DB');
      db.friends = db.friends.filter(f => f.id !== id); _saveLocal(db); return null;
    }
    return _http('DELETE', '/friends/' + id);
  },

  /* ── AUTH (backend only) ────────────────────────────────────────── */

  /**
   * Register a new account.
   * POST /api/register  { name, email, password, password_confirmation, unit }
   * → { user, token }
   */
  async register(name, email, password, unit = 'kg') {
    if (!API_CONFIG.useBackend) return null;
    const res = await _http('POST', '/register', {
      name,
      email,
      password,
      password_confirmation: password,
      unit,
    });
    if (res?.token) _saveToken(res.token, res.user);
    return res;
  },

  /**
   * Login via Laravel Sanctum.
   * POST /api/login  { email, password }  → { user, token }
   */
  async login(email, password) {
    if (!API_CONFIG.useBackend) return null;
    const res = await _http('POST', '/login', { email, password });
    if (res?.token) _saveToken(res.token, res.user);
    return res;
  },

  async logout() {
    if (!API_CONFIG.useBackend) return;
    try { await _http('POST', '/logout'); } catch (_) {}
    _saveToken(null, null);
    API_CONFIG.useBackend = false;
  },

  /** GET /api/me – verify the stored token is still valid. */
  async me() {
    if (!API_CONFIG.useBackend || !API_CONFIG.token) return null;
    return _http('GET', '/me');
  },

  /** Returns the cached auth user (no network call). */
  getAuthUser() {
    return _getAuthUser();
  },

  /** Returns true when a token is stored (user is "logged in"). */
  isAuthenticated() {
    return !!API_CONFIG.token;
  },
};

/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  LARAVEL ROUTE MAP  (see backend/routes/api.php)               ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  POST   /api/register    – register (name, email, password, …) ║
 * ║  POST   /api/login       – login → { user, token }             ║
 * ║  POST   /api/logout      – revoke token  [auth:sanctum]        ║
 * ║  GET    /api/me          – current user  [auth:sanctum]        ║
 * ║                                                                  ║
 * ║  All routes below require auth:sanctum middleware               ║
 * ║                                                                  ║
 * ║  GET    /api/exercises          – index                         ║
 * ║  POST   /api/exercises          – store                         ║
 * ║  PUT    /api/exercises/{id}     – update                        ║
 * ║  DELETE /api/exercises/{id}     – destroy                       ║
 * ║  GET    /api/workouts           – index                         ║
 * ║  POST   /api/workouts           – store                         ║
 * ║  GET    /api/workouts/{id}      – show                          ║
 * ║  DELETE /api/workouts/{id}      – destroy                       ║
 * ║  GET    /api/templates          – index                         ║
 * ║  POST   /api/templates          – store                         ║
 * ║  PUT    /api/templates/{id}     – update                        ║
 * ║  DELETE /api/templates/{id}     – destroy                       ║
 * ║  GET    /api/prs                – computed PRs                  ║
 * ║  GET    /api/settings           – show                          ║
 * ║  PUT    /api/settings           – update                        ║
 * ║  GET    /api/friends            – index                         ║
 * ║  POST   /api/friends            – store { user_id }            ║
 * ║  DELETE /api/friends/{id}       – destroy                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
