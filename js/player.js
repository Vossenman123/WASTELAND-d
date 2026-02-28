// js/player.js – Player class
'use strict';

class Player {
    constructor(world, particles, footprints, skillTree) {
        this.world      = world;
        this.particles  = particles;
        this.footprints = footprints;
        this.skillTree  = skillTree;

        // Position / physics
        this.x = CFG.WORLD_W / 2;
        this.y = CFG.WORLD_H / 2;
        this.r = 14;
        this.angle = 0;

        // Health / shield
        this.hp         = CFG.PLAYER_MAX_HP;
        this.maxHp      = CFG.PLAYER_MAX_HP;
        this.shield     = CFG.PLAYER_MAX_SHIELD;
        this.maxShield  = CFG.PLAYER_MAX_SHIELD;
        this.shieldCD   = 0;
        this.armor      = 0;

        // Weapons – start with Pistol + Assault Rifle
        this.weaponSlots  = [WEAPON_DEFS[0], WEAPON_DEFS[6]];
        this.weaponIdx    = 0;
        this.ammo         = new Array(WEAPON_DEFS.length).fill(0);
        this.ammo[0]      = 15;
        this.ammo[6]      = 30;

        this.fireTimer    = 0;
        this.reloading    = false;
        this.reloadTimer  = 0;
        this.burstCount   = 0;
        this.burstTimer   = 0;
        this.overChargeT  = 0;

        // Minigun / railgun state
        this.minigunSpin  = 0;
        this.minigunRate  = 0;
        this.railCharging = false;
        this.railCharge   = 0;

        // Abilities
        this.dashing     = false;
        this.dashTimer   = 0;
        this.dashCD      = 0;
        this.dashVx      = 0; this.dashVy = 0;

        this.meleeCD     = 0;
        this.meleeAnim   = 0;

        this.grenades    = 3;
        this.grenadeCD   = 0;

        // Scope
        this.scopeZoom   = 1;
        this.scopeTarget = 1;
        this.scoped      = false;

        // Footprint timer
        this.fpTimer     = 0;

        // XP / level
        this.xp         = 0;
        this.level      = 1;
        this.xpToNext   = this._xpForLevel(2);
        this.levelUpAnim = 0;

        // Combat counters
        this.kills       = 0;
        this.score       = 0;
        this.comboCount  = 0;
        this.comboTimer  = 0;
        this.streakCount = 0;
        this.streakTimer = 0;

        // Visual state
        this.damageFlash     = 0;
        this.invincibleTimer = 0;
        this.bulletTimeTimer = 0;
        this.bulletTimeOn    = false;

        // Weapon animation state (reset per weapon)
        this.animKickBack = 0;
        this.animKickSide = 0;
        this.animPump     = 0;  // seconds remaining for pump / bolt anim
        this.animSpin     = 0;  // minigun barrel angle
        this.animCharge   = 0;  // railgun charge 0-1
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    get weapon() { return this.weaponSlots[this.weaponIdx]; }

    _xpForLevel(lvl) { return Math.round(100 * Math.pow(lvl - 1, 1.6) + 50); }

    addWeapon(def) {
        if (!this.weaponSlots.find(w => w.id === def.id)) this.weaponSlots.push(def);
        this.ammo[def.id] = Math.max(this.ammo[def.id], def.magSize);
    }

    switchTo(idx) {
        if (idx < 0 || idx >= this.weaponSlots.length) return;
        this.weaponIdx   = idx;
        this.reloading   = false;
        this.reloadTimer = 0;
        this.scoped      = false;
        this.scopeTarget = 1;
        this.railCharging = false;
        this.railCharge   = 0;
    }

    _reload() {
        if (this.reloading) return;
        const w = this.weapon;
        const cap = Math.round(w.magSize * (1 + (this.skillTree.bonuses.ammoCapacity||0)));
        if (this.ammo[w.id] >= cap) return;
        this.reloading   = true;
        const bonus = Math.min(0.65, (this.skillTree.bonuses.reloadSpeed||0));
        this.reloadTimer = w.reloadTime * (1 - bonus);
    }

    takeDamage(raw, ignoreInvincible = false) {
        if (this.invincibleTimer > 0 && !ignoreInvincible) return;

        const armor = this.armor + (this.skillTree.bonuses.armor||0);
        const dmg   = Math.max(1, raw - armor * 0.35);

        // Shield absorbs first
        if (FEATURES.shieldArmor && this.shield > 0) {
            const shieldAbs = Math.min(this.shield, dmg);
            this.shield  -= shieldAbs;
            const rest    = dmg - shieldAbs;
            this.hp      -= rest;
            this.shieldCD = CFG.SHIELD_REGEN_DELAY;
        } else {
            this.hp -= dmg;
        }

        this.damageFlash = 0.2;

        if (this.hp <= 0) {
            // Last Stand
            if (this.skillTree.bonuses.lastStand && this.skillTree.bonuses.lastStandReady) {
                this.hp = 5;
                this.skillTree.bonuses.lastStandReady = false;
                this.skillTree.bonuses.lastStandCD    = 90;
                this.invincibleTimer = 2.0;
            } else {
                this.hp = 0;
                return true;  // dead
            }
        }
        return false;
    }

    addXP(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToNext) {
            this.xp       -= this.xpToNext;
            this.level    += 1;
            this.xpToNext  = this._xpForLevel(this.level + 1);
            this.skillTree.points += 1;
            this.levelUpAnim = 2.5;
            // Restore HP on level up
            this.hp = Math.min(this.maxHp + (this.skillTree.bonuses.maxHp||0), this.hp + 30);
        }
    }

    shoot(targetX, targetY, projectiles) {
        const w = this.weapon;
        if (this.reloading || this.fireTimer > 0) return;
        if (this.ammo[w.id] <= 0) { this._reload(); return; }

        // Minigun spin-up gate
        if (w.id === 10 && this.minigunRate < 0.85) return;

        // Railgun: must charge first
        if (w.id === 14) {
            if (!this.railCharging) { this.railCharging = true; this.railCharge = 0; return; }
            if (this.railCharge < 1.0) return;
            this.railCharging = false; this.railCharge = 0;
        }

        let angle = Math.atan2(targetY - this.y, targetX - this.x);

        // Auto-aim
        if (FEATURES.autoAim && window._game) {
            const en = window._game.nearestEnemy(this.x, this.y, 220);
            if (en) {
                const ta = Math.atan2(en.y - this.y, en.x - this.x);
                let diff = ta - angle;
                while (diff >  Math.PI) diff -= Math.PI*2;
                while (diff < -Math.PI) diff += Math.PI*2;
                if (Math.abs(diff) < 0.28) angle += diff * 0.45;
            }
        }

        const spreadMult = 1 - Math.min(0.8, this.skillTree.bonuses.accuracy||0);
        const spread = w.spread * spreadMult;
        const dmgMult = 1 + (this.skillTree.bonuses.damage||0)
                          + (this.overChargeT > 0 ? (this.skillTree.bonuses.overcharge||0) : 0);
        const mfx = this.x + Math.cos(this.angle)*20;
        const mfy = this.y + Math.sin(this.angle)*20;

        const makeProj = (a) => {
            const def = { ...w, dmg: Math.round(w.dmg * dmgMult) };
            if (w.projType === 'grenade') return new GrenadeProj(mfx, mfy, a, def, 'player', this.world);
            return new Projectile(mfx, mfy, a, def, 'player', this.world);
        };

        if (w.pellets) {
            for (let i = 0; i < w.pellets; i++) {
                projectiles.push(makeProj(angle + (Math.random()-0.5)*spread*2.8));
            }
        } else {
            projectiles.push(makeProj(angle + (Math.random()-0.5)*spread));
        }

        this.ammo[w.id]--;
        const frMult = 1 - Math.min(0.5, this.skillTree.bonuses.fireRate||0);
        this.fireTimer   = w.firerate * frMult;
        this.overChargeT = 0;

        // Burst fire
        if (w.burst && this.burstCount < w.burst - 1) {
            this.burstCount++;
            this.fireTimer = w.burstDelay;
        } else {
            this.burstCount = 0;
        }

        // Railgun – special beam effect for piercing
        if (w.id === 14 && window._game) {
            const far  = 1500;
            const x2   = this.x + Math.cos(angle)*far;
            const y2   = this.y + Math.sin(angle)*far;
            this.particles.railBeam(mfx, mfy, x2, y2);
        }

        // Weapon animation
        if (FEATURES.weaponRecoil) {
            const rm = 1 + (this.skillTree.bonuses.recoil||0);
            this.animKickBack = (w.anim.kickBack||8)  * rm;
            this.animKickSide = ((Math.random()-0.5)*(w.anim.kickSide||3)) * rm;
        }
        if (w.anim.type === 'pump' || w.anim.type === 'bolt') {
            this.animPump = w.anim.pumpDur || w.anim.boltDur || 0.3;
        }

        // Effects
        this.particles.muzzleFlash(mfx, mfy, this.angle);
        if (w.id !== 13 && w.id !== 14) this.particles.shellCasing(mfx, mfy, this.angle);

        if (this.ammo[w.id] <= 0) this._reload();
    }

    dash(mx, my) {
        if (!FEATURES.dashAbility) return;
        if (this.dashCD > 0 || this.dashing) return;
        const len = Math.hypot(mx, my);
        const dx  = len > 0 ? mx/len : Math.cos(this.angle);
        const dy  = len > 0 ? my/len : Math.sin(this.angle);
        this.dashing   = true;
        this.dashTimer = CFG.DASH_DURATION;
        this.dashCD    = CFG.DASH_CD;
        this.dashVx    = dx * CFG.DASH_SPEED;
        this.dashVy    = dy * CFG.DASH_SPEED;
    }

    melee(enemies, particles) {
        if (!FEATURES.meleeAttack) return;
        if (this.meleeCD > 0) return;
        this.meleeCD  = CFG.MELEE_CD;
        this.meleeAnim = 0.25;
        let hit = false;
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < CFG.MELEE_RANGE + e.r) {
                const killed = e.takeDamage(CFG.MELEE_DMG + (this.skillTree.bonuses.damage||0)*CFG.MELEE_DMG);
                particles.blood(e.x, e.y, 6);
                if (killed) {
                    this.onKill(e);
                }
                hit = true;
            }
        }
        if (hit) particles.muzzleFlash(this.x + Math.cos(this.angle)*30, this.y + Math.sin(this.angle)*30, this.angle);
    }

    throwGrenade(targetX, targetY, projectiles) {
        if (!FEATURES.grenades) return;
        if (this.grenadeCD > 0 || this.grenades <= 0) return;
        this.grenades--;
        this.grenadeCD = 0.8;
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const def = { ...WEAPON_DEFS[11], dmg: Math.round(CFG.GRENADE_DMG * (1+(this.skillTree.bonuses.explDmg||0))) };
        projectiles.push(new GrenadeProj(this.x, this.y, angle, def, 'player', this.world));
    }

    onKill(enemy) {
        this.kills++;
        this.score += enemy.scoreValue || 100;

        // Combo
        if (FEATURES.comboMultiplier) {
            this.comboCount++;
            this.comboTimer = CFG.COMBO_WINDOW;
        }

        // Kill streak
        if (FEATURES.killStreak) {
            this.streakCount++;
            this.streakTimer = 5.0;
        }

        // Bullet time on 3+ streak
        if (FEATURES.bulletTime && this.streakCount >= 3 && !this.bulletTimeOn) {
            this.bulletTimeOn    = true;
            this.bulletTimeTimer = CFG.BULLET_TIME_DURATION;
        }

        // XP
        const baseXP = enemy.xpValue || 25;
        const mult   = FEATURES.comboMultiplier
            ? (CFG.COMBO_MULT[Math.min(this.comboCount, CFG.COMBO_MULT.length-1)] || 2)
            : 1;
        this.addXP(Math.round(baseXP * mult));
    }

    // ── update ────────────────────────────────────────────────────────────────

    update(dt, input, mouseWorldX, mouseWorldY, projectiles) {
        const sk = this.skillTree;

        // Timers
        if (this.fireTimer   > 0) this.fireTimer   -= dt;
        if (this.dashCD      > 0) this.dashCD       -= dt;
        if (this.meleeCD     > 0) this.meleeCD      -= dt;
        if (this.meleeAnim   > 0) this.meleeAnim    -= dt;
        if (this.grenadeCD   > 0) this.grenadeCD    -= dt;
        if (this.damageFlash > 0) this.damageFlash  -= dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.levelUpAnim > 0) this.levelUpAnim  -= dt;
        if (this.overChargeT > 0) this.overChargeT  -= dt;
        if (this.dashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) { this.dashing = false; }
        }

        // Combo decay
        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
        if (this.streakTimer > 0) { this.streakTimer -= dt; if (this.streakTimer <= 0) this.streakCount = 0; }

        // Bullet time
        if (this.bulletTimeOn) {
            this.bulletTimeTimer -= dt;
            if (this.bulletTimeTimer <= 0) { this.bulletTimeOn = false; }
        }

        // Reload
        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.reloading = false;
                const w   = this.weapon;
                const cap = Math.round(w.magSize * (1 + (sk.bonuses.ammoCapacity||0)));
                this.ammo[w.id] = cap;
                this.overChargeT = 3.0;  // overcharge window after reload
            }
        }

        // Shield regen
        if (FEATURES.shieldArmor) {
            if (this.shieldCD > 0) this.shieldCD -= dt;
            else this.shield = Math.min(this.maxShield, this.shield + CFG.SHIELD_REGEN_RATE * dt);
        }

        // HP regen (skill)
        if (sk.bonuses.hpRegen > 0) {
            this.hp = Math.min(this.maxHp + (sk.bonuses.maxHp||0), this.hp + sk.bonuses.hpRegen * dt);
        }

        sk.update(dt);

        // Minigun spin
        const w = this.weapon;
        if (w.id === 10 && input.shoot) {
            this.minigunRate = Math.min(1, this.minigunRate + dt / CFG.MINIGUN_SPINUP);
        } else {
            this.minigunRate = Math.max(0, this.minigunRate - dt / 1.8);
        }
        this.minigunSpin  += this.minigunRate * dt * 22;
        this.animSpin      = this.minigunSpin;

        // Railgun charge
        if (w.id === 14 && this.railCharging) {
            this.railCharge = Math.min(1, this.railCharge + dt / (w.chargeTime || 1.0));
            this.animCharge = this.railCharge;
        } else if (w.id !== 14) {
            this.railCharging = false; this.railCharge = 0; this.animCharge = 0;
        }

        // Movement
        const maxSpd = CFG.PLAYER_SPEED
            * (input.sprint ? CFG.SPRINT_MULT : 1)
            * (1 + (this.hp / (this.maxHp||1) < 0.3 ? (sk.bonuses.adrenaline||0) : 0));

        let mx = 0, my = 0;
        if (input.up)    my -= 1;
        if (input.down)  my += 1;
        if (input.left)  mx -= 1;
        if (input.right) mx += 1;
        if (mx && my) { mx *= 0.707; my *= 0.707; }

        // Footprints
        if (FEATURES.footprints && (mx||my)) {
            this.fpTimer -= dt;
            if (this.fpTimer <= 0) { this.fpTimer = 0.28; this.footprints.add(this.x, this.y, this.angle); }
        }

        if (this.dashing) {
            const nx = this.x + this.dashVx*dt, ny = this.y + this.dashVy*dt;
            if (this.world.isWalkable(nx, this.y)) this.x = nx;
            if (this.world.isWalkable(this.x, ny)) this.y = ny;
        } else {
            const nx = this.x + mx*maxSpd*dt, ny = this.y + my*maxSpd*dt;
            if (this.world.isWalkable(nx - this.r+2, this.y) && this.world.isWalkable(nx + this.r-2, this.y)) this.x = nx;
            if (this.world.isWalkable(this.x, ny - this.r+2) && this.world.isWalkable(this.x, ny + this.r-2)) this.y = ny;
        }

        // Aim
        this.angle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);

        // Scope
        const canScope = w.scoped && input.rightClick;
        this.scopeTarget = canScope ? CFG.SCOPE_ZOOM : 1;
        this.scopeZoom   = this.scopeZoom + (this.scopeTarget - this.scopeZoom) * Math.min(1, dt*8);

        // Weapon anim decay
        this.animKickBack = Math.max(0, this.animKickBack - dt*90);
        this.animKickSide = this.animKickSide * Math.pow(0.85, dt*60);
        if (this.animPump > 0) this.animPump -= dt;
    }

    // ── render ────────────────────────────────────────────────────────────────

    render(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y - cam.y;

        // Damage flash overlay
        if (this.damageFlash > 0) {
            ctx.save(); ctx.globalAlpha = this.damageFlash / 0.2 * 0.35;
            ctx.fillStyle = '#FF0000';
            ctx.beginPath(); ctx.arc(sx, sy, this.r + 8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Melee arc
        if (this.meleeAnim > 0 && FEATURES.meleeAttack) {
            ctx.save(); ctx.globalAlpha = this.meleeAnim / 0.25 * 0.4;
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sx, sy, CFG.MELEE_RANGE, this.angle - 0.7, this.angle + 0.7);
            ctx.stroke(); ctx.restore();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(sx, sy+this.r, this.r, this.r*0.35, 0, 0, Math.PI*2); ctx.fill();

        // Body
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);

        // Legs (simple)
        ctx.fillStyle = '#556B2F';
        ctx.fillRect(-this.r+2, -4, this.r*2-4, 8);

        // Torso
        ctx.fillStyle = this.invincibleTimer > 0 ? '#FFFF88' : '#4a7a3a';
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#2a4a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.stroke();

        // Head
        ctx.fillStyle = '#c8a060';
        ctx.beginPath(); ctx.arc(0, 0, this.r * 0.55, 0, Math.PI*2); ctx.fill();

        // Weapon arm + gun
        this._renderWeapon(ctx);

        ctx.restore();

        // Shield arc
        if (FEATURES.shieldArmor && this.shield > 0) {
            ctx.save();
            ctx.globalAlpha = 0.25 + (this.shield / this.maxShield) * 0.35;
            ctx.strokeStyle = '#00BFFF'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(sx, sy, this.r + 5, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }

        // Railgun charge glow
        if (this.railCharging && this.railCharge > 0) {
            ctx.save();
            ctx.globalAlpha = this.railCharge * 0.6;
            ctx.strokeStyle = '#00BFFF'; ctx.lineWidth = 3;
            ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(sx, sy, this.r + 3 + this.railCharge*8, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }

        // Level-up burst
        if (this.levelUpAnim > 0) {
            const t = this.levelUpAnim / 2.5;
            ctx.save(); ctx.globalAlpha = t * 0.7;
            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx, sy, this.r + 8 + (1-t)*30, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
    }

    _renderWeapon(ctx) {
        const w = this.weapon;
        const kickBack  = this.animKickBack;
        const kickSide  = this.animKickSide;
        const pumpState = this.animPump > 0 ? Math.sin(this.animPump * Math.PI / 0.3) * 6 : 0;

        ctx.save();
        ctx.translate(8 - kickBack, kickSide);

        if (w.anim.type === 'spin') {
            // Minigun – rotating barrels
            ctx.save(); ctx.translate(12, 0); ctx.rotate(this.animSpin);
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI*2/6)*i;
                ctx.fillStyle = '#888';
                ctx.beginPath(); ctx.arc(Math.cos(a)*5, Math.sin(a)*5, 2.5, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
            ctx.fillStyle = '#999';
            ctx.fillRect(0, -4, 22, 8);
        } else if (w.anim.type === 'charge') {
            // Railgun
            ctx.fillStyle = '#336688';
            ctx.fillRect(0, -3, 26, 6);
            if (this.animCharge > 0) {
                ctx.save();
                ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 10 * this.animCharge;
                ctx.fillStyle = `rgba(0,190,255,${this.animCharge})`;
                ctx.fillRect(0, -3, 26 * this.animCharge, 6);
                ctx.restore();
            }
        } else if (w.anim.type === 'flame') {
            // Flamethrower – wide nozzle
            ctx.fillStyle = '#555';
            ctx.fillRect(0, -4, 18, 8);
            ctx.fillStyle = '#333';
            ctx.fillRect(16, -6, 6, 12);
        } else if (w.anim.type === 'pump') {
            // Pump shotgun – barrel slides
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0 + pumpState, -3, 20, 6);
            ctx.fillStyle = '#6B3410';
            ctx.fillRect(-2, -2, 8, 4);
        } else if (w.anim.type === 'bolt') {
            // Sniper – bolt slides back
            ctx.fillStyle = '#4169E1';
            ctx.fillRect(0, -2.5, 28, 5);
            ctx.fillStyle = '#2248A0';
            ctx.fillRect(8 - pumpState, -4, 5, 3);
        } else {
            // Generic gun
            const col = w.color || '#888';
            const len = w.id === 8 || w.id === 9 ? 24 : 16;
            ctx.fillStyle = col;
            ctx.fillRect(0, -3, len, 6);
            // Grip
            ctx.fillStyle = '#555';
            ctx.fillRect(3, 3, 5, 7);
        }

        ctx.restore();
    }
}
