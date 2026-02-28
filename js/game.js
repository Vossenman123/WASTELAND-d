// js/game.js – Main game controller & loop
'use strict';

class Game {
    constructor() {
        this.canvas  = document.getElementById('gameCanvas');
        this.ctx     = this.canvas.getContext('2d');
        this.canvas.width  = CFG.CAM_W;
        this.canvas.height = CFG.CAM_H;

        // Core systems
        this.particles  = new ParticleSystem();
        this.shake      = new ScreenShake();
        this.footprints = new FootprintMgr();
        this.skillTree  = new SkillTreeManager();
        this.world      = null;  // built in init()
        this.player     = null;

        // Entity lists
        this.enemies     = [];
        this.projectiles = [];
        this.items       = [];

        // Game state
        this.state  = 'loading'; // 'loading' | 'playing' | 'paused' | 'dead'
        this.wave   = 0;
        this.spawnTimer = 0;
        this.dayTime    = 0;
        this.difficulty = 'normal';

        // Camera
        this.cam = { x: 0, y: 0 };

        // Input
        this.input = {
            up:false, down:false, left:false, right:false,
            sprint:false, shoot:false, rightClick:false,
        };
        this.mouseX = 0; this.mouseY = 0;  // screen coords

        // UI
        this.hud       = null;
        this.pauseMenu = null;

        // Timing
        this._last = 0;
    }

    // ── initialise ────────────────────────────────────────────────────────────

    init() {
        this.world     = new World();
        const cx       = CFG.WORLD_W / 2, cy = CFG.WORLD_H / 2;
        this.player    = new Player(this.world, this.particles, this.footprints, this.skillTree);
        this.player.x  = cx; this.player.y = cy;
        this.hud       = new HUD(this.player, this.skillTree);
        this.pauseMenu = new PauseMenu(this, this.skillTree);

        this.cam.x = cx - CFG.CAM_W/2;
        this.cam.y = cy - CFG.CAM_H/2;

        this._bindInput();
        this.state = 'playing';
        window._game = this;
    }

    restart() {
        // Hard reset everything
        this.enemies     = [];
        this.projectiles = [];
        this.items       = [];
        this.wave        = 0;
        this.spawnTimer  = 2;
        this.dayTime     = 0;
        this.world       = new World();
        this.skillTree   = new SkillTreeManager();
        const cx         = CFG.WORLD_W/2, cy = CFG.WORLD_H/2;
        this.player      = new Player(this.world, this.particles, this.footprints, this.skillTree);
        this.player.x    = cx; this.player.y = cy;
        this.hud         = new HUD(this.player, this.skillTree);
        this.pauseMenu   = new PauseMenu(this, this.skillTree);
        this.cam.x       = cx - CFG.CAM_W/2;
        this.cam.y       = cy - CFG.CAM_H/2;
        this.state       = 'playing';
        window._game     = this;
        document.getElementById('deathOverlay').classList.remove('visible');
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        // Difficulty affects spawn count/speed – applied at next wave
    }

    resetEnemySpawns() {
        this.enemies     = [];
        this.spawnTimer  = 2;
        this.wave        = Math.max(0, this.wave - 1);
    }

    nearestEnemy(wx, wy, maxDist) {
        let best = null, bd = maxDist * maxDist;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = (e.x-wx)*(e.x-wx) + (e.y-wy)*(e.y-wy);
            if (d < bd) { bd = d; best = e; }
        }
        return best;
    }

    spawnBackup(x, y) {
        if (!FEATURES.enemyBackup) return;
        const count = 2;
        for (let i = 0; i < count; i++) {
            const angle  = Math.random() * Math.PI*2;
            const dist   = 60 + Math.random()*60;
            const bx     = x + Math.cos(angle)*dist;
            const by     = y + Math.sin(angle)*dist;
            const pos    = this.world.nearestWalkableWorld(bx, by);
            if (FEATURES.spawnHighlight) {
                for (let p = 0; p < 6; p++) this.particles.emit(pos.x, pos.y, '#FF8800', 1, 40, 4, 0.6);
            }
            this.enemies.push(spawnEnemy('scout', pos.x, pos.y, this.world));
        }
    }

    onEnemyDied(enemy, player) {
        this.particles.blood(enemy.x, enemy.y, 10);
        this.shake.add(4);
        player.onKill(enemy);
        const drops = spawnLoot(enemy.x, enemy.y, this.world);
        this.items.push(...drops);
        // Chance to drop a new weapon
        if (Math.random() < 0.06 && WEAPON_DEFS.length) {
            const wdef = WEAPON_DEFS[Math.floor(Math.random() * WEAPON_DEFS.length)];
            player.addWeapon(wdef);
        }
    }

    // ── spawn wave ────────────────────────────────────────────────────────────

    _spawnWave() {
        this.wave++;
        const diffMult = this.difficulty === 'easy' ? 0.6 : this.difficulty === 'hard' ? 1.5 : 1;
        const count    = Math.round((CFG.WAVE_BASE_COUNT + (this.wave-1)*CFG.WAVE_INCREMENT) * diffMult);
        const alive    = this.enemies.filter(e => e.alive).length;
        const toSpawn  = Math.min(count, CFG.MAX_ENEMIES - alive);

        for (let i = 0; i < toSpawn; i++) {
            const sp  = this.world.spawnPoints[Math.floor(Math.random()*this.world.spawnPoints.length)];
            const pos = this.world.nearestWalkableWorld(
                sp.x + (Math.random()-0.5)*32, sp.y + (Math.random()-0.5)*32);

            // Pick type
            let type = 'grunt';
            const r  = Math.random();
            if (this.wave >= 2 && r < 0.15) type = 'heavy';
            else if (this.wave >= 2 && r < 0.30) type = 'scout';
            else if (this.wave >= 3 && r < 0.42) type = 'sniper';

            const enemy = spawnEnemy(type, pos.x, pos.y, this.world);
            // Scale stats with wave
            const hpScale = 1 + (this.wave-1)*0.08 * diffMult;
            enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * hpScale);
            this.enemies.push(enemy);

            if (FEATURES.spawnHighlight) {
                this.particles.emit(pos.x, pos.y, '#FF4444', 8, 50, 5, 0.8);
            }
        }

        // Boss every N waves
        if (FEATURES.bossSpawns && this.wave % CFG.BOSS_SPAWN_WAVE === 0) {
            const sp  = this.world.spawnPoints[0];
            const pos = this.world.nearestWalkableWorld(sp.x, sp.y);
            const boss = spawnEnemy('boss', pos.x, pos.y, this.world);
            boss.maxHp = boss.hp = Math.round(700 * (1 + (this.wave/CFG.BOSS_SPAWN_WAVE - 1)*0.25));
            this.enemies.push(boss);
            this.particles.emit(pos.x, pos.y, '#FF0000', 20, 80, 8, 1.0);
        }
    }

    // ── update ────────────────────────────────────────────────────────────────

    _update(dt) {
        if (this.state !== 'playing') return;

        const p    = this.player;
        const ts   = p.bulletTimeOn ? CFG.BULLET_TIME_FACTOR : 1;
        const sdt  = dt * ts;

        this.dayTime += dt;

        // Camera
        const targetCX = p.x - CFG.CAM_W/2;
        const targetCY = p.y - CFG.CAM_H/2;
        this.cam.x += (targetCX - this.cam.x) * Math.min(1, dt*8);
        this.cam.y += (targetCY - this.cam.y) * Math.min(1, dt*8);
        this.cam.x  = Math.max(0, Math.min(CFG.WORLD_W - CFG.CAM_W, this.cam.x));
        this.cam.y  = Math.max(0, Math.min(CFG.WORLD_H - CFG.CAM_H, this.cam.y));

        // Mouse → world coords
        const mouseWorldX = this.mouseX / p.scopeZoom + this.cam.x + (p.scopeZoom > 1 ? (CFG.CAM_W/2*(1 - 1/p.scopeZoom)) : 0);
        const mouseWorldY = this.mouseY / p.scopeZoom + this.cam.y + (p.scopeZoom > 1 ? (CFG.CAM_H/2*(1 - 1/p.scopeZoom)) : 0);

        // Player update
        p.update(sdt, this.input, mouseWorldX, mouseWorldY, this.projectiles);

        if (this.input.shoot) p.shoot(mouseWorldX, mouseWorldY, this.projectiles);

        // Enemy spawn timer
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = CFG.SPAWN_INTERVAL;
            this._spawnWave();
        }

        // Enemies
        const aliveEnemies = this.enemies.filter(e => e.alive);
        for (const e of aliveEnemies) {
            e.update(sdt, p, this.projectiles, this);
        }
        // Separation force between enemies
        for (let i = 0; i < aliveEnemies.length; i++) {
            for (let j = i+1; j < aliveEnemies.length; j++) {
                const a = aliveEnemies[i], b = aliveEnemies[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d  = Math.hypot(dx, dy);
                const minD = a.r + b.r + 2;
                if (d < minD && d > 0) {
                    const push = (minD - d) / 2;
                    const px   = (dx/d)*push, py = (dy/d)*push;
                    if (this.world.isWalkable(a.x-px, a.y-py)) { a.x -= px; a.y -= py; }
                    if (this.world.isWalkable(b.x+px, b.y+py)) { b.x += px; b.y += py; }
                }
            }
        }

        // Remove dead enemies
        for (let i = this.enemies.length-1; i >= 0; i--) {
            if (!this.enemies[i].alive) this.enemies.splice(i, 1);
        }

        // Projectiles
        for (const proj of this.projectiles) proj.update(sdt);

        // Projectile–enemy collision
        for (const proj of this.projectiles) {
            if (!proj.alive) continue;
            if (proj.owner !== 'player') continue;

            // Barrel hits
            for (const barrel of this.world.barrels) {
                if (barrel.exploded) continue;
                if (Math.hypot(proj.x-barrel.x, proj.y-barrel.y) < 14) {
                    const exploded = this.world.damageBarrel(barrel, proj.dmg, this.particles);
                    if (exploded) {
                        this.shake.add(14);
                        this._barrelBlast(barrel);
                    }
                    if (!proj.pierce) proj.alive = false;
                    break;
                }
            }

            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (proj.hitSet.has(enemy)) continue;
                const d = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (d > enemy.r + 5) continue;

                // Hit!
                let dmg = proj.dmg;
                let crit = false, headshot = false;

                // Headshot (enemy "head" is upper portion of hitbox)
                if (FEATURES.headshotBonus && (proj.y - enemy.y) < -enemy.r * 0.3) {
                    headshot = true;
                    dmg = Math.round(dmg * 1.8);
                }
                // Critical hit
                if (FEATURES.criticalHits) {
                    const chance = (this.skillTree.bonuses.critChance || 0.05);
                    if (Math.random() < chance) {
                        crit = true;
                        dmg  = Math.round(dmg * (1 + (this.skillTree.bonuses.critDmg || 1.0)));
                    }
                }

                // Flame DoT
                if (proj.projType === 'flame') {
                    enemy.burnTimer = Math.max(enemy.burnTimer, 2.5);
                    enemy.burnDps   = proj.def.dot || 2;
                }
                // EMP stun
                if (proj.projType === 'grenade' && FEATURES.grenades && this.skillTree.bonuses.empGrenades) {
                    enemy.stunTimer = Math.max(enemy.stunTimer, 2.0);
                }

                const killed = enemy.takeDamage(dmg);
                this.particles.blood(proj.x, proj.y, 6);
                this.hud.addDmgNumber(enemy.x, enemy.y - enemy.r - 12, dmg, crit, headshot);
                this.shake.add(crit ? 6 : 3);

                if (killed) {
                    enemy.alive = false;
                    this.onEnemyDied(enemy, p);
                }

                if (!proj.pierce) { proj.alive = false; break; }
                proj.hitSet.add(enemy);
            }
        }

        // Projectile–player collision (enemy bullets)
        for (const proj of this.projectiles) {
            if (!proj.alive || proj.owner !== 'enemy') continue;
            const d = Math.hypot(proj.x - p.x, proj.y - p.y);
            if (d < p.r + 4) {
                const dead = p.takeDamage(proj.dmg);
                this.shake.add(8);
                this.particles.blood(p.x, p.y, 4);
                proj.alive = false;
                if (dead) { this.state = 'dead'; this._showDeath(); }
            }
        }

        // Grenade & rocket AoE
        for (const proj of this.projectiles) {
            if (!proj.alive && proj.explosive) {
                const radius = proj.def.id === 12 ? 100 : CFG.GRENADE_RADIUS;
                const dmg    = proj.dmg * (1 + (this.skillTree.bonuses.explDmg||0));
                this.particles.explosion(proj.x, proj.y, radius);
                this.shake.add(18);
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    const d = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                    if (d < radius) {
                        const falloff = 1 - (d / radius) * 0.7;
                        const killed  = enemy.takeDamage(Math.round(dmg * falloff));
                        this.hud.addDmgNumber(enemy.x, enemy.y-20, Math.round(dmg*falloff));
                        if (killed) { enemy.alive=false; this.onEnemyDied(enemy, p); }
                        if (proj.projType === 'grenade' && this.skillTree.bonuses.empGrenades) {
                            enemy.stunTimer = Math.max(enemy.stunTimer, 2.0);
                        }
                    }
                }
                // Damage player if too close
                const dpd = Math.hypot(proj.x - p.x, proj.y - p.y);
                if (dpd < radius * 0.5 && proj.owner === 'player') {
                    const dead = p.takeDamage(Math.round(dmg * 0.3));
                    if (dead) { this.state='dead'; this._showDeath(); }
                }
            }
        }

        // Remove dead projectiles (but keep explosive ones alive for 1 frame for AoE above)
        for (let i = this.projectiles.length-1; i >= 0; i--) {
            if (!this.projectiles[i].alive) this.projectiles.splice(i, 1);
        }

        // Items pickup
        for (let i = this.items.length-1; i >= 0; i--) {
            const it = this.items[i];
            it.update(sdt);
            if (!it.alive) { this.items.splice(i,1); continue; }
            const d = Math.hypot(it.x - p.x, it.y - p.y);
            if (d < p.r + 14) {
                this._pickupItem(it, p);
                this.items.splice(i,1);
            }
        }

        // Particles & effects
        this.particles.update(sdt);
        this.shake.update(dt);
        this.footprints.update(sdt);
        this.world.update(sdt);
        this.hud.update(sdt);
    }

    _barrelBlast(barrel) {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x-barrel.x, e.y-barrel.y);
            if (d < CFG.BARREL_RADIUS) {
                const killed = e.takeDamage(Math.round(CFG.BARREL_DMG * (1-d/CFG.BARREL_RADIUS*0.6)));
                if (killed) { e.alive=false; this.onEnemyDied(e, this.player); }
            }
        }
    }

    _pickupItem(item, player) {
        switch (item.type) {
            case 'health': {
                const heal = 30 * (1 + (this.skillTree.bonuses.healBonus||0));
                player.hp  = Math.min(player.maxHp + (this.skillTree.bonuses.maxHp||0), player.hp + heal);
                this.hud.addDmgNumber(item.x, item.y, `+${Math.round(heal)}HP`);
                break;
            }
            case 'ammo': {
                const w    = player.weapon;
                const cap  = Math.round(w.magSize * (1+(this.skillTree.bonuses.ammoCapacity||0)));
                player.ammo[w.id] = Math.min(cap, player.ammo[w.id] + Math.ceil(cap*0.5));
                break;
            }
            case 'shield':
                player.shield = Math.min(player.maxShield, player.shield + 25);
                break;
            case 'grenade':
                player.grenades += 1;
                break;
        }
        this.particles.emit(item.x, item.y, '#FFFFFF', 6, 40, 3, 0.5);
    }

    // ── render ────────────────────────────────────────────────────────────────

    _render() {
        const ctx  = this.ctx;
        const cam  = { x: this.cam.x + this.shake.dx, y: this.cam.y + this.shake.dy };

        // Day/night tint
        let nightAlpha = 0;
        if (FEATURES.dayNightCycle) {
            const phase = (this.dayTime % CFG.DAY_PERIOD) / CFG.DAY_PERIOD;
            nightAlpha  = phase < 0.5
                ? Math.sin(phase * Math.PI*2) * 0.5
                : Math.sin((1-phase) * Math.PI*2) * 0.5;
        }

        ctx.fillStyle = '#0a0800';
        ctx.fillRect(0, 0, CFG.CAM_W, CFG.CAM_H);

        // Scope zoom transform
        if (this.player.scopeZoom > 1.01) {
            ctx.save();
            const z = this.player.scopeZoom;
            ctx.translate(CFG.CAM_W/2, CFG.CAM_H/2);
            ctx.scale(z, z);
            ctx.translate(-CFG.CAM_W/2, -CFG.CAM_H/2);
        }

        this.world.render(ctx, cam);
        this.footprints.render(ctx, cam);
        this.particles.render(ctx, cam);

        // Items
        for (const it of this.items) it.render(ctx, cam);

        // Enemies
        const thermalOptics = this.skillTree.bonuses.thermalOptics;
        for (const e of this.enemies) e.render(ctx, cam, thermalOptics);

        // Projectiles
        for (const p of this.projectiles) p.render(ctx, cam);

        // Player
        this.player.render(ctx, cam);

        if (this.player.scopeZoom > 1.01) ctx.restore();

        // Night overlay
        if (nightAlpha > 0.02) {
            ctx.save();
            ctx.globalAlpha = nightAlpha;
            ctx.fillStyle   = '#000033';
            ctx.fillRect(0, 0, CFG.CAM_W, CFG.CAM_H);
            ctx.restore();
        }

        // Bullet-time vignette
        if (this.player.bulletTimeOn) {
            ctx.save(); ctx.globalAlpha = 0.22;
            const grad = ctx.createRadialGradient(CFG.CAM_W/2,CFG.CAM_H/2,CFG.CAM_H*0.3,CFG.CAM_W/2,CFG.CAM_H/2,CFG.CAM_H*0.7);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, '#002244');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, CFG.CAM_W, CFG.CAM_H);
            ctx.restore();
        }

        // Scope crosshair overlay
        if (this.player.scopeZoom > 1.01) {
            ctx.save(); ctx.globalAlpha = 0.35;
            ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(CFG.CAM_W/2-40, CFG.CAM_H/2); ctx.lineTo(CFG.CAM_W/2+40, CFG.CAM_H/2);
            ctx.moveTo(CFG.CAM_W/2, CFG.CAM_H/2-40); ctx.lineTo(CFG.CAM_W/2, CFG.CAM_H/2+40);
            ctx.stroke();
            ctx.beginPath(); ctx.arc(CFG.CAM_W/2, CFG.CAM_H/2, 20, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }

        // HUD (always on top of game world)
        this.hud.render(ctx, cam, this);
    }

    // ── main loop ─────────────────────────────────────────────────────────────

    _loop(ts) {
        const dt  = Math.min(0.05, (ts - this._last) / 1000);
        this._last = ts;
        if (this.state === 'playing') {
            this._update(dt);
            this._render();
        }
        requestAnimationFrame(ts2 => this._loop(ts2));
    }

    start() {
        requestAnimationFrame(ts => { this._last = ts; this._loop(ts); });
    }

    // ── death screen ──────────────────────────────────────────────────────────

    _showDeath() {
        const o = document.getElementById('deathOverlay');
        o.querySelector('#deathKills').textContent = this.player.kills;
        o.querySelector('#deathScore').textContent = this.player.score;
        o.querySelector('#deathWave').textContent  = this.wave;
        o.querySelector('#deathLevel').textContent = this.player.level;
        o.classList.add('visible');
    }

    // ── input ─────────────────────────────────────────────────────────────────

    _bindInput() {
        const keyMap = {
            KeyW:'up', KeyS:'down', KeyA:'left', KeyD:'right',
            ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right',
            ShiftLeft:'sprint', ShiftRight:'sprint',
        };

        document.addEventListener('keydown', e => {
            if (e.code === 'Escape') {
                if (this.state === 'playing') {
                    this.state = 'paused';
                    this.pauseMenu.show();
                } else if (this.state === 'paused') {
                    this.state = 'playing';
                    this.pauseMenu.hide();
                }
                return;
            }
            if (this.state !== 'playing') return;
            if (keyMap[e.code]) this.input[keyMap[e.code]] = true;

            // Weapon switch 1–0
            if (e.code.startsWith('Digit')) {
                const n = parseInt(e.key);
                const idx = n === 0 ? 9 : n - 1;
                this.player.switchTo(idx);
            }
            // R – reload
            if (e.code === 'KeyR') this.player._reload();
            // E – melee
            if (e.code === 'KeyE') this.player.melee(this.enemies, this.particles);
            // Space – dash
            if (e.code === 'Space') {
                const md = this._moveDir();
                this.player.dash(md.x, md.y);
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', e => {
            if (keyMap[e.code]) this.input[keyMap[e.code]] = false;
        });

        this.canvas.addEventListener('mousedown', e => {
            if (this.state !== 'playing') return;
            if (e.button === 0) {
                this.input.shoot = true;
                // Grenade on right-click handled below
            }
            if (e.button === 2) {
                if (e.shiftKey) {
                    this.player.throwGrenade(
                        this.mouseX + this.cam.x,
                        this.mouseY + this.cam.y,
                        this.projectiles
                    );
                } else {
                    this.input.rightClick = true;
                }
            }
        });

        this.canvas.addEventListener('mouseup', e => {
            if (e.button === 0) this.input.shoot = false;
            if (e.button === 2) this.input.rightClick = false;
        });

        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Grenade – Q key
        document.addEventListener('keydown', e => {
            if (e.code === 'KeyQ' && this.state === 'playing') {
                const wx = this.mouseX + this.cam.x;
                const wy = this.mouseY + this.cam.y;
                this.player.throwGrenade(wx, wy, this.projectiles);
            }
        });
    }

    _moveDir() {
        let x = 0, y = 0;
        if (this.input.up)    y -= 1;
        if (this.input.down)  y += 1;
        if (this.input.left)  x -= 1;
        if (this.input.right) x += 1;
        if (!x && !y) { x = Math.cos(this.player.angle); y = Math.sin(this.player.angle); }
        return { x, y };
    }
}
