// js/enemy.js – Enemy base class + 5 types with A* pathfinding
// Key fix: enemies recalculate paths regularly and detect when stuck,
// avoiding permanently getting trapped inside buildings.
'use strict';

class Enemy {
    constructor(x, y, world, pathfinderRef) {
        this.x = x; this.y = y;
        this.world  = world;
        this.pf     = pathfinderRef;
        this.r      = 13;
        this.angle  = 0;
        this.alive  = true;

        // Stats (overridden by subclasses)
        this.hp         = 50;
        this.maxHp      = 50;
        this.speed      = 80;
        this.dmg        = 12;
        this.fireRange  = 280;
        this.meleeRange = 38;
        this.xpValue    = 20;
        this.scoreValue = 100;
        this.color      = '#AA3333';
        this.eyeColor   = '#FFFF00';

        // Path / navigation
        this.path         = [];
        this.pathTimer    = 0;
        this.pathIdx      = 0;
        this.stuckTimer   = 0;
        this.lastX        = x;
        this.lastY        = y;
        this.stuckCheckT  = 0;

        // State machine
        this.state     = FEATURES.enemyPatrol ? 'patrol' : 'chase';
        this.patrolDst = null;   // patrol waypoint (world coords)
        this.patrolTimer = 0;

        this.alertTimer  = 0;    // shows ! icon
        this.fireTimer   = 0;
        this.fireCooldown = 1.8;

        // Burning (from flamethrower)
        this.burnTimer = 0;
        this.burnDps   = 0;

        // Stun (from EMP grenade)
        this.stunTimer = 0;

        // Called backup yet?
        this.calledBackup = false;
        this.backupTimer  = CFG.BACKUP_DELAY;
    }

    // ── damage ───────────────────────────────────────────────────────────────

    takeDamage(dmg) {
        if (this.stunTimer > 0) dmg *= 1.25; // bonus damage while stunned
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp    = 0;
            this.alive = false;
            return true;
        }
        return false;
    }

    // ── pathfinding ──────────────────────────────────────────────────────────

    _calcPath(player) {
        const T   = CFG.TILE;
        const sx  = Math.floor(this.x / T);
        const sy  = Math.floor(this.y / T);
        const ex  = Math.floor(player.x / T);
        const ey  = Math.floor(player.y / T);
        this.path = this.pf.find(sx, sy, ex, ey);
        this.pathIdx = 0;
    }

    _followPath(dt) {
        if (!this.path || this.pathIdx >= this.path.length) return;
        const T    = CFG.TILE;
        const node = this.path[this.pathIdx];
        const wx   = (node.x + 0.5) * T;
        const wy   = (node.y + 0.5) * T;
        const dx   = wx - this.x;
        const dy   = wy - this.y;
        const d    = Math.hypot(dx, dy);
        if (d < 8) {
            this.pathIdx++;
        } else {
            const spd  = this.speed;
            const nx   = this.x + (dx/d)*spd*dt;
            const ny   = this.y + (dy/d)*spd*dt;
            // Slide along walls instead of stopping dead
            if (this.world.isWalkable(nx, this.y)) this.x = nx; else this.x += 0;
            if (this.world.isWalkable(this.x, ny)) this.y = ny; else this.y += 0;
            this.angle = Math.atan2(dy, dx);
        }
    }

    _patrolStep(dt) {
        if (!this.patrolDst) {
            this.patrolTimer -= dt;
            if (this.patrolTimer > 0) return;
            // Pick a random walkable destination nearby
            const T = CFG.TILE;
            for (let tries = 0; tries < 12; tries++) {
                const tx = Math.floor(this.x/T) + Math.floor((Math.random()-0.5)*10);
                const ty = Math.floor(this.y/T) + Math.floor((Math.random()-0.5)*10);
                if (tx > 0 && ty > 0 && tx < CFG.MAP_W-1 && ty < CFG.MAP_H-1
                        && this.world.walkable[ty] && this.world.walkable[ty][tx]) {
                    this.patrolDst = { x:(tx+0.5)*T, y:(ty+0.5)*T };
                    const sx = Math.floor(this.x/T), sy = Math.floor(this.y/T);
                    this.path = this.pf.find(sx, sy, tx, ty);
                    this.pathIdx = 0;
                    break;
                }
            }
        } else {
            this._followPath(dt);
            if (Math.hypot(this.patrolDst.x-this.x, this.patrolDst.y-this.y) < 20 || this.pathIdx >= this.path.length) {
                this.patrolDst  = null;
                this.patrolTimer = 1.5 + Math.random()*2.5;
            }
        }
    }

    // ── check stuck & fix ────────────────────────────────────────────────────

    _stuckCheck(dt, player) {
        this.stuckCheckT -= dt;
        if (this.stuckCheckT > 0) return;
        this.stuckCheckT = CFG.STUCK_TIME;

        const moved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
        if (moved < CFG.STUCK_DIST) {
            // Stuck! Push out of wall and recalculate path with jitter
            const pos = this.world.nearestWalkableWorld(this.x, this.y);
            this.x = pos.x + (Math.random()-0.5)*CFG.TILE;
            this.y = pos.y + (Math.random()-0.5)*CFG.TILE;
            if (!this.world.isWalkable(this.x, this.y)) { this.x = pos.x; this.y = pos.y; }
            this._calcPath(player);
        }
        this.lastX = this.x; this.lastY = this.y;
    }

    // ── update (base) ─────────────────────────────────────────────────────────

    update(dt, player, projectiles, game) {
        if (!this.alive) return;
        if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

        // Burning DoT
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            if (this.takeDamage(this.burnDps * dt)) {
                game.onEnemyDied(this, player);
                return;
            }
        }

        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

        // State transitions
        if (this.state === 'patrol' && distToPlayer < 300) {
            this.state      = 'chase';
            this.alertTimer = 1.2;
            this._calcPath(player);
        }
        if (this.state === 'chase' && distToPlayer > 480 && FEATURES.enemyPatrol) {
            this.state      = 'patrol';
            this.patrolDst  = null;
            this.patrolTimer = 0;
        }

        // Timers
        if (this.pathTimer  > 0) this.pathTimer  -= dt;
        if (this.alertTimer > 0) this.alertTimer -= dt;
        if (this.fireTimer  > 0) this.fireTimer  -= dt;

        // Backup call
        if (FEATURES.enemyBackup && !this.calledBackup && this.hp < this.maxHp * 0.4) {
            this.backupTimer -= dt;
            if (this.backupTimer <= 0) {
                this.calledBackup = true;
                game.spawnBackup(this.x, this.y);
            }
        }

        if (this.state === 'patrol') {
            this._patrolStep(dt);
        } else {
            // Recalculate path periodically
            if (this.pathTimer <= 0) {
                this._calcPath(player);
                this.pathTimer = CFG.PATH_RECALC + Math.random()*0.4;
            }
            this._followPath(dt);
        }

        this._stuckCheck(dt, player);
        this._subclassUpdate(dt, player, projectiles, game);
    }

    /** Override in subclasses for special behaviour */
    _subclassUpdate(dt, player, projectiles, game) {
        this._basicAttack(dt, player, projectiles);
    }

    _basicAttack(dt, player, projectiles) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.meleeRange) {
            if (this.fireTimer <= 0) {
                this.fireTimer = this.fireCooldown;
                player.takeDamage(this.dmg);
            }
        } else if (dist < this.fireRange) {
            if (this.fireTimer <= 0) {
                this.fireTimer = this.fireCooldown;
                this._shootAt(player, projectiles, 0.12);
            }
        }
    }

    _shootAt(player, projectiles, spread = 0.1) {
        const a   = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random()-0.5)*spread;
        const def = { id:-1, dmg:this.dmg, projSpeed:500, range:this.fireRange+50, color:'#FF6666',
                      spread:0, pellets:0, pierce:false, explosive:false, projType:'bullet',
                      anim:{} };
        projectiles.push(new Projectile(this.x, this.y, a, def, 'enemy', this.world));
    }

    // ── render ────────────────────────────────────────────────────────────────

    render(ctx, cam, thermalOptics) {
        const sx = this.x - cam.x, sy = this.y - cam.y;
        if (sx < -40 || sy < -40 || sx > CFG.CAM_W+40 || sy > CFG.CAM_H+40) return;

        // Thermal vision outline
        if (thermalOptics) {
            ctx.save();
            ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(sx, sy, this.r + 4, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }

        ctx.save(); ctx.translate(sx, sy);

        // Stun indicator
        if (this.stunTimer > 0) {
            ctx.save(); ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath(); ctx.arc(0, -this.r-10, 6, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0, this.r, this.r*0.8, this.r*0.28, 0, 0, Math.PI*2); ctx.fill();

        this._renderBody(ctx);

        // Burn glow
        if (this.burnTimer > 0) {
            ctx.save(); ctx.globalAlpha = 0.45;
            ctx.fillStyle = `hsl(${20+Math.random()*30},100%,55%)`;
            ctx.beginPath(); ctx.arc(0, 0, this.r + 4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // Health bar
        if (FEATURES.enemyHealthBars) {
            const bw = this.r * 2 + 4, bx = sx - bw/2, by = sy - this.r - 10;
            ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, 5);
            const pct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = pct > 0.5 ? '#44CC44' : pct > 0.25 ? '#FFAA00' : '#FF2222';
            ctx.fillRect(bx, by, bw*pct, 5);
        }

        // Alert icon
        if (FEATURES.enemyAlerts && this.alertTimer > 0) {
            ctx.save(); ctx.globalAlpha = Math.min(1, this.alertTimer);
            ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
            ctx.fillText('!', sx, sy - this.r - 14);
            ctx.restore();
        }
    }

    _renderBody(ctx) {
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.stroke();
        // Eye
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath(); ctx.arc(this.r*0.5, -this.r*0.3, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.r*0.5,  this.r*0.3, 3, 0, Math.PI*2); ctx.fill();
    }
}

// ─── GRUNT ────────────────────────────────────────────────────────────────────
class Grunt extends Enemy {
    constructor(x, y, world, pf) {
        super(x, y, world, pf);
        this.hp = this.maxHp = 50; this.speed = 85; this.dmg = 12;
        this.color = '#AA3333'; this.xpValue = 20; this.scoreValue = 100;
        this.fireCooldown = 1.6;
    }
}

// ─── HEAVY ────────────────────────────────────────────────────────────────────
class Heavy extends Enemy {
    constructor(x, y, world, pf) {
        super(x, y, world, pf);
        this.hp = this.maxHp = 180; this.speed = 52; this.dmg = 22; this.r = 17;
        this.color = '#885500'; this.eyeColor = '#FF4444'; this.xpValue = 50; this.scoreValue = 300;
        this.fireRange = 200; this.fireCooldown = 2.2;
    }
    _renderBody(ctx) {
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#442200'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.stroke();
        // Armor plates
        ctx.fillStyle = '#666'; ctx.fillRect(-this.r+2, -4, (this.r-2)*2, 8);
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath(); ctx.arc(this.r*0.5, 0, 4, 0, Math.PI*2); ctx.fill();
    }
}

// ─── SCOUT ────────────────────────────────────────────────────────────────────
class Scout extends Enemy {
    constructor(x, y, world, pf) {
        super(x, y, world, pf);
        this.hp = this.maxHp = 30; this.speed = 145; this.dmg = 8; this.r = 10;
        this.color = '#336699'; this.xpValue = 25; this.scoreValue = 150;
        this.fireRange = 200; this.fireCooldown = 0.9;
    }
}

// ─── SNIPER ───────────────────────────────────────────────────────────────────
class EnemySniper extends Enemy {
    constructor(x, y, world, pf) {
        super(x, y, world, pf);
        this.hp = this.maxHp = 45; this.speed = 55; this.dmg = 40; this.r = 11;
        this.color = '#556B2F'; this.eyeColor = '#88FF88'; this.xpValue = 40; this.scoreValue = 250;
        this.fireRange = 600; this.meleeRange = 80; this.fireCooldown = 3.5;
        this.preferDist = 350;  // tries to maintain this distance
    }
    _subclassUpdate(dt, player, projectiles, game) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        // Back up if player gets too close
        if (dist < this.preferDist * 0.6) {
            const ax = (this.x - player.x) / dist;
            const ay = (this.y - player.y) / dist;
            const nx = this.x + ax * this.speed * dt;
            const ny = this.y + ay * this.speed * dt;
            if (this.world.isWalkable(nx, this.y)) this.x = nx;
            if (this.world.isWalkable(this.x, ny)) this.y = ny;
        }
        // Shoot from range
        if (dist < this.fireRange && this.fireTimer <= 0) {
            this.fireTimer = this.fireCooldown;
            this._shootAt(player, projectiles, 0.03);
        }
    }
}

// ─── BOSS ─────────────────────────────────────────────────────────────────────
class Boss extends Enemy {
    constructor(x, y, world, pf) {
        super(x, y, world, pf);
        this.hp = this.maxHp = 700; this.speed = 60; this.dmg = 35; this.r = 26;
        this.color = '#8B0000'; this.eyeColor = '#FF0000'; this.xpValue = 250; this.scoreValue = 2000;
        this.fireRange = 380; this.fireCooldown = 0.7;
        this.phase = 1;
        this.spinTimer = 0;
        this.bossName  = 'WARLORD';
    }
    _subclassUpdate(dt, player, projectiles, game) {
        // Phase 2 at 50% HP
        if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
            this.phase    = 2;
            this.speed    = 88;
            this.fireCooldown = 0.45;
        }
        this.spinTimer -= dt;
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.fireRange && this.fireTimer <= 0) {
            this.fireTimer = this.fireCooldown;
            if (this.phase === 2 && this.spinTimer <= 0) {
                // Burst of 6 in a ring
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI*2/6)*i;
                    const def = { id:-1, dmg:this.dmg*0.6, projSpeed:420, range:350, color:'#FF0000',
                                  spread:0, pellets:0, pierce:false, explosive:false, projType:'bullet', anim:{} };
                    projectiles.push(new Projectile(this.x, this.y, a, def, 'enemy', this.world));
                }
                this.spinTimer = 3.0;
            } else {
                this._shootAt(player, projectiles, 0.07);
            }
        }
    }
    _renderBody(ctx) {
        ctx.rotate(this.angle);
        ctx.fillStyle = '#8B0000';
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI*2); ctx.stroke();
        // Skull detail
        ctx.fillStyle = '#FF3333';
        ctx.beginPath(); ctx.arc(this.r*0.35, -this.r*0.35, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.r*0.35,  this.r*0.35, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${this.r}px Arial`; ctx.textAlign = 'center';
        ctx.fillText('☠', 0, this.r*0.4);
        // HP bar above (boss-specific, larger)
        if (FEATURES.enemyHealthBars) {
            ctx.restore();
            // drawn externally after transform restored
        }
    }
    render(ctx, cam, thermalOptics) {
        super.render(ctx, cam, thermalOptics);
        // Big boss HP bar at top of screen when visible
        const sx = this.x - cam.x, sy = this.y - cam.y;
        if (sx < -60 || sy < -60 || sx > CFG.CAM_W+60 || sy > CFG.CAM_H+60) return;
        const bw = 140, bx = sx - bw/2, by = sy - this.r - 18;
        ctx.fillStyle = '#111'; ctx.fillRect(bx-1, by-1, bw+2, 9);
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = this.phase === 2 ? '#FF2200' : '#CC0000';
        ctx.fillRect(bx, by, bw*pct, 7);
        ctx.strokeStyle = '#880000'; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, 7);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(`☠ ${this.bossName}  ${Math.ceil(this.hp)}/${this.maxHp}`, sx, by - 3);
    }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function spawnEnemy(type, x, y, world) {
    switch (type) {
        case 'heavy':  return new Heavy(x, y, world, pathfinder);
        case 'scout':  return new Scout(x, y, world, pathfinder);
        case 'sniper': return new EnemySniper(x, y, world, pathfinder);
        case 'boss':   return new Boss(x, y, world, pathfinder);
        default:       return new Grunt(x, y, world, pathfinder);
    }
}
