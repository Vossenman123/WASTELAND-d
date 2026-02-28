// js/projectile.js – Bullet, GrenadeProj, RocketProj
'use strict';

class Projectile {
    constructor(x, y, angle, weaponDef, owner, world) {
        this.x = x; this.y = y;
        this.angle  = angle;
        this.def    = weaponDef;
        this.owner  = owner;   // 'player' or 'enemy'
        this.world  = world;
        this.speed  = weaponDef.projSpeed;
        this.dmg    = weaponDef.dmg;
        this.vx     = Math.cos(angle) * this.speed;
        this.vy     = Math.sin(angle) * this.speed;
        this.alive  = true;
        this.range  = weaponDef.range;
        this.dist   = 0;
        this.pierce = weaponDef.pierce || false;
        this.explosive = weaponDef.explosive || false;
        this.projType  = weaponDef.projType || 'bullet';
        this.hitSet    = new Set();  // enemies already pierced
        this.trail     = [];
    }

    update(dt) {
        const mx = this.vx * dt, my = this.vy * dt;
        this.x += mx; this.y += my;
        this.dist += Math.hypot(mx, my);

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();

        if (this.dist > this.range) { this.alive = false; return; }
        if (!this.world.isWalkable(this.x, this.y)) {
            this.alive = false;
        }
    }

    render(ctx, cam) {
        // Trail
        if (this.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = this.def.color;
            ctx.lineWidth   = this.projType === 'rocket' ? 3 : 1.5;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            for (let i = 0; i < this.trail.length; i++) {
                const tx = this.trail[i].x - cam.x, ty = this.trail[i].y - cam.y;
                i === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty);
            }
            ctx.stroke();
            ctx.restore();
        }

        const sx = this.x - cam.x, sy = this.y - cam.y;
        if (sx < -30 || sy < -30 || sx > CFG.CAM_W+30 || sy > CFG.CAM_H+30) return;

        ctx.save();
        if (this.projType === 'rocket') {
            ctx.translate(sx, sy); ctx.rotate(this.angle);
            ctx.fillStyle = '#DC143C';
            ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-6,-4); ctx.lineTo(-6,4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#FF6347';
            ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-14,-3); ctx.lineTo(-14,3); ctx.closePath(); ctx.fill();
        } else if (this.projType === 'flame') {
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = `hsl(${15+Math.random()*35},100%,55%)`;
            ctx.beginPath(); ctx.arc(sx, sy, 5+Math.random()*4, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.translate(sx, sy); ctx.rotate(this.angle);
            const len = (this.def.id === 8 || this.def.id === 14) ? 14 : 7;
            if (this.def.id === 14) {
                ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 10;
                ctx.fillStyle = '#88DDFF';
            } else {
                ctx.fillStyle = this.def.color;
            }
            ctx.fillRect(-len/2, -1.8, len, 3.6);
        }
        ctx.restore();
    }
}

class GrenadeProj {
    constructor(x, y, angle, weaponDef, owner, world) {
        const speed = weaponDef.projSpeed;
        this.x = x; this.y = y;
        this.def   = weaponDef;
        this.owner = owner;
        this.world = world;
        this.vx = Math.cos(angle)*speed;
        this.vy = Math.sin(angle)*speed;
        this.dmg    = weaponDef.dmg;
        this.fuse   = CFG.GRENADE_FUSE;
        this.alive  = true;
        this.bounces = 3;
        this.projType = 'grenade';
        this.explosive = true;
        this.trail  = [];
        this.angle  = angle;
    }

    update(dt) {
        this.fuse -= dt;
        const friction = Math.pow(0.96, dt*60);
        const nx = this.x + this.vx*dt;
        const ny = this.y + this.vy*dt;

        const walkX = this.world.isWalkable(nx, this.y);
        const walkY = this.world.isWalkable(this.x, ny);

        if (walkX) this.x = nx; else if (this.bounces > 0) { this.vx *= -0.5; this.bounces--; }
        if (walkY) this.y = ny; else if (this.bounces > 0) { this.vy *= -0.5; this.bounces--; }

        this.vx *= friction; this.vy *= friction;
        if (this.fuse <= 0) this.alive = false;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
    }

    render(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y - cam.y;
        if (sx < -20 || sy < -20 || sx > CFG.CAM_W+20 || sy > CFG.CAM_H+20) return;

        // Fuse indicator blink
        const blink = this.fuse < 1.0 ? Math.sin(this.fuse * 20) > 0 : true;
        ctx.fillStyle = blink ? '#DAA520' : '#FF4400';
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.stroke();

        if (this.fuse < 1.5) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = '#FF4400'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx, sy, CFG.GRENADE_RADIUS * (1-this.fuse/CFG.GRENADE_FUSE)*0.5, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
    }
}
