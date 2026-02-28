// js/config.js – Constants, feature flags & weapon data

'use strict';

// ─── GAME CONSTANTS ──────────────────────────────────────────────────────────
const CFG = {
    TILE: 32,
    MAP_W: 52,
    MAP_H: 52,
    get WORLD_W() { return this.MAP_W * this.TILE; },
    get WORLD_H() { return this.MAP_H * this.TILE; },
    CAM_W: 960,
    CAM_H: 600,

    PLAYER_SPEED: 165,
    SPRINT_MULT: 1.65,
    PLAYER_MAX_HP: 100,
    PLAYER_MAX_SHIELD: 60,
    SHIELD_REGEN_DELAY: 3.5,
    SHIELD_REGEN_RATE: 12,

    DASH_SPEED: 900,
    DASH_DURATION: 0.13,
    DASH_CD: 1.5,

    MELEE_RANGE: 58,
    MELEE_DMG: 30,
    MELEE_CD: 0.6,

    GRENADE_FUSE: 2.6,
    GRENADE_RADIUS: 100,
    GRENADE_DMG: 80,

    COMBO_WINDOW: 3.0,
    COMBO_MULT: [1, 1, 1.1, 1.2, 1.35, 1.5, 2.0],

    DAY_PERIOD: 90,          // seconds per full day/night cycle

    BULLET_TIME_FACTOR: 0.22,
    BULLET_TIME_DURATION: 2.5,

    SPAWN_INTERVAL: 8,       // seconds between auto-waves
    MAX_ENEMIES: 28,
    WAVE_BASE_COUNT: 4,
    WAVE_INCREMENT: 2,

    BARREL_RADIUS: 90,
    BARREL_DMG: 65,

    PATH_RECALC: 1.0,        // seconds between enemy path recalculations
    STUCK_TIME: 1.6,         // seconds to declare enemy "stuck"
    STUCK_DIST: 18,          // pixels moved required to not be stuck

    MINIGUN_SPINUP: 0.85,
    SCOPE_ZOOM: 2.8,

    BOSS_SPAWN_WAVE: 5,
    BACKUP_DELAY: 4.0,       // seconds after which backup enemies arrive
};

// ─── FEATURE FLAGS (all 30) ───────────────────────────────────────────────────
const FEATURES = {
    minimap:           true,
    enemyHealthBars:   true,
    damageNumbers:     true,
    screenShake:       true,
    dayNightCycle:     true,
    rainWeather:       false,
    lootDrops:         true,
    comboMultiplier:   true,
    criticalHits:      true,
    headshotBonus:     true,
    shieldArmor:       true,
    meleeAttack:       true,
    dashAbility:       true,
    grenades:          true,
    explosiveBarrels:  true,
    enemyPatrol:       true,
    enemyBackup:       true,
    bossSpawns:        true,
    waveCounter:       true,
    killStreak:        true,
    bulletTime:        false,
    autoAim:           false,
    bloodEffects:      true,
    muzzleFlash:       true,
    shellCasings:      true,
    weaponRecoil:      true,
    enemyAlerts:       true,
    footprints:        false,
    spawnHighlight:    true,
    ambientCreatures:  true,
};

const FEATURE_LABELS = {
    minimap:           'Mini-Map',
    enemyHealthBars:   'Enemy Health Bars',
    damageNumbers:     'Damage Numbers',
    screenShake:       'Screen Shake',
    dayNightCycle:     'Day / Night Cycle',
    rainWeather:       'Rain Weather',
    lootDrops:         'Loot Drops',
    comboMultiplier:   'Combo Multiplier',
    criticalHits:      'Critical Hits',
    headshotBonus:     'Headshot Bonus',
    shieldArmor:       'Shield / Armor',
    meleeAttack:       'Melee Attack',
    dashAbility:       'Dash Ability',
    grenades:          'Grenades',
    explosiveBarrels:  'Explosive Barrels',
    enemyPatrol:       'Enemy Patrol',
    enemyBackup:       'Enemy Backup',
    bossSpawns:        'Boss Spawns',
    waveCounter:       'Wave Counter',
    killStreak:        'Kill Streak',
    bulletTime:        'Bullet Time',
    autoAim:           'Auto-Aim Assist',
    bloodEffects:      'Blood Effects',
    muzzleFlash:       'Muzzle Flash',
    shellCasings:      'Shell Casings',
    weaponRecoil:      'Weapon Recoil',
    enemyAlerts:       'Enemy Alert Icons',
    footprints:        'Footprint Trails',
    spawnHighlight:    'Spawn Highlights',
    ambientCreatures:  'Ambient Creatures',
};

// ─── WEAPON DEFINITIONS ───────────────────────────────────────────────────────
// id, name, dmg, spread(rad), firerate(s), magSize, reloadTime(s),
// range(px), auto, projSpeed, color, pellets?, burst?, burstDelay?,
// projType('bullet'|'grenade'|'rocket'|'flame'), scoped?, pierce?,
// chargeTime?, spinup?, explosive?
// anim: { type, kickBack, kickSide, duration, pumpDur?, boltDur?, burstKick? }
const WEAPON_DEFS = [
    {
        id: 0,  name: 'Pistol',      dmg: 18, spread: 0.05, firerate: 0.38,
        magSize: 15, reloadTime: 1.2, range: 460, auto: false, projSpeed: 820,
        color: '#AAAAAA', desc: 'Reliable sidearm. Unlimited carry.',
        anim: { type: 'recoil', kickBack: 8,  kickSide: 3,  duration: 0.12 },
    },
    {
        id: 1,  name: 'Revolver',    dmg: 50, spread: 0.035, firerate: 0.65,
        magSize: 6, reloadTime: 2.4, range: 510, auto: false, projSpeed: 860,
        color: '#B8860B', desc: 'High damage, slow. Iconic.',
        anim: { type: 'recoil', kickBack: 18, kickSide: 5,  duration: 0.18 },
    },
    {
        id: 2,  name: 'Mach.Pistol', dmg: 11, spread: 0.15, firerate: 0.07,
        magSize: 32, reloadTime: 1.4, range: 270, auto: true, projSpeed: 750,
        color: '#888888', desc: 'Very fast fire rate; low accuracy.',
        anim: { type: 'vibrate', kickBack: 3, kickSide: 3, duration: 0.06 },
    },
    {
        id: 3,  name: 'Pump Shotgun', dmg: 10, spread: 0.26, firerate: 0.85,
        magSize: 8, reloadTime: 2.3, range: 210, auto: false, projSpeed: 700,
        color: '#8B4513', pellets: 8, desc: 'Devastating close range.',
        anim: { type: 'pump', kickBack: 24, kickSide: 0, duration: 0.25, pumpDur: 0.32 },
    },
    {
        id: 4,  name: 'Cbt.Shotgun', dmg: 12, spread: 0.19, firerate: 0.55,
        magSize: 6, reloadTime: 2.4, range: 290, auto: false, projSpeed: 720,
        color: '#A0522D', pellets: 6, desc: 'Semi-auto shotgun, faster ROF.',
        anim: { type: 'pump', kickBack: 16, kickSide: 2, duration: 0.20, pumpDur: 0.20 },
    },
    {
        id: 5,  name: 'SMG',         dmg: 13, spread: 0.10, firerate: 0.09,
        magSize: 40, reloadTime: 1.7, range: 340, auto: true, projSpeed: 780,
        color: '#9370DB', desc: 'Lightweight, fast, decent range.',
        anim: { type: 'vibrate', kickBack: 3, kickSide: 2, duration: 0.07 },
    },
    {
        id: 6,  name: 'Aslt.Rifle',  dmg: 22, spread: 0.07, firerate: 0.13,
        magSize: 30, reloadTime: 2.0, range: 510, auto: true, projSpeed: 900,
        color: '#228B22', desc: 'Versatile workhorse of the wasteland.',
        anim: { type: 'vibrate', kickBack: 5, kickSide: 2, duration: 0.10 },
    },
    {
        id: 7,  name: 'Burst Rifle', dmg: 28, spread: 0.06, firerate: 0.48,
        magSize: 24, reloadTime: 2.1, range: 490, auto: false, projSpeed: 890,
        color: '#3CB371', burst: 3, burstDelay: 0.07,
        desc: '3-round burst, good accuracy.',
        anim: { type: 'burst', kickBack: 10, kickSide: 2, duration: 0.12, burstKick: 5 },
    },
    {
        id: 8,  name: 'Sniper',      dmg: 95, spread: 0.008, firerate: 1.9,
        magSize: 5, reloadTime: 3.0, range: 1300, auto: false, projSpeed: 1600,
        color: '#4169E1', scoped: true, desc: 'Long-range bolt-action precision.',
        anim: { type: 'bolt', kickBack: 32, kickSide: 1, duration: 0.3, boltDur: 0.42 },
    },
    {
        id: 9,  name: 'Marksman',    dmg: 60, spread: 0.028, firerate: 0.62,
        magSize: 10, reloadTime: 2.5, range: 820, auto: false, projSpeed: 1100,
        color: '#6495ED', desc: 'Semi-auto precision rifle.',
        anim: { type: 'recoil', kickBack: 20, kickSide: 3, duration: 0.22 },
    },
    {
        id: 10, name: 'Minigun',     dmg: 9,  spread: 0.13, firerate: 0.048,
        magSize: 150, reloadTime: 4.0, range: 400, auto: true, projSpeed: 850,
        color: '#FF6347', spinup: CFG.MINIGUN_SPINUP,
        desc: 'Needs spin-up; then overwhelming fire.',
        anim: { type: 'spin', kickBack: 2, kickSide: 1, duration: 0.04 },
    },
    {
        id: 11, name: 'Grn.Launcher',dmg: 82, spread: 0.04, firerate: 1.3,
        magSize: 6, reloadTime: 3.0, range: 600, auto: false, projSpeed: 420,
        color: '#DAA520', explosive: true, projType: 'grenade',
        desc: 'Bouncing grenades; watch your feet.',
        anim: { type: 'recoil', kickBack: 28, kickSide: 1, duration: 0.30 },
    },
    {
        id: 12, name: 'Rkt.Launcher',dmg: 135, spread: 0.02, firerate: 2.6,
        magSize: 3, reloadTime: 4.0, range: 800, auto: false, projSpeed: 500,
        color: '#DC143C', explosive: true, projType: 'rocket',
        desc: 'Massive AoE. Do not fire at close range.',
        anim: { type: 'recoil', kickBack: 42, kickSide: 2, duration: 0.40 },
    },
    {
        id: 13, name: 'Flamethrower',dmg: 3,  spread: 0.22, firerate: 0.055,
        magSize: 100, reloadTime: 3.5, range: 190, auto: true, projSpeed: 340,
        color: '#FF4500', projType: 'flame', dot: 2,
        desc: 'Area denial. Ignites enemies over time.',
        anim: { type: 'flame', kickBack: 1, kickSide: 1, duration: 0.05 },
    },
    {
        id: 14, name: 'Railgun',     dmg: 230, spread: 0.0, firerate: 3.5,
        magSize: 4, reloadTime: 4.5, range: 1500, auto: false, projSpeed: 3200,
        color: '#00BFFF', pierce: true, chargeTime: 1.0,
        desc: 'Charge to fire; pierces all enemies.',
        anim: { type: 'charge', kickBack: 30, kickSide: 0, duration: 0.40, chargeTime: 1.0 },
    },
];
