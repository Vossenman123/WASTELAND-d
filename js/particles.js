// js/particles.js – Particles, screen-shake, damage numbers
'use strict';

// ─── Particle ─────────────────────────────────────────────────────────────────
class Particle {
    constructor(x, y, vx, vy, color, size, life, gravity = 0) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.color = color; this.size = size;
        this.life = life; this.maxLife = life;
        this.gravity = gravity;
        this.alive = true;
    }
    update(dt) {
        this.x  += this.vx * dt;
        this.y  += this.vy * dt;
        this.vy += this.gravity * dt;
        this.vx *= Math.pow(0.94, dt * 60);
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }
    render(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y - cam.y;
        if (sx < -20 || sy < -20 || sx > CFG.CAM_W+20 || sy > CFG.CAM_H+20) return;
        const a = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, this.size * a), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

// ─── Shockwave ────────────────────────────────────────────────────────────────
class Shockwave {
    constructor(x, y, maxR) {
        this.x = x; this.y = y; this.maxR = maxR;
        this.r = 0; this.life = 0.28; this.maxLife = 0.28; this.alive = true;
    }
    update(dt) {
        this.life -= dt;
        this.r = this.maxR * (1 - this.life / this.maxLife);
        if (this.life <= 0) this.alive = false;
    }
    render(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y - cam.y;
        ctx.save();
        ctx.globalAlpha = (this.life / this.maxLife) * 0.65;
        ctx.strokeStyle = '#FF8800';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, this.r, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
    }
}

// ─── RailBeam ─────────────────────────────────────────────────────────────────
class RailBeam {
    constructor(x1, y1, x2, y2) {
        this.x1=x1; this.y1=y1; this.x2=x2; this.y2=y2;
        this.life=0.18; this.maxLife=0.18; this.alive=true;
    }
    update(dt) { this.life-=dt; if(this.life<=0) this.alive=false; }
    render(ctx, cam) {
        const a = this.life/this.maxLife;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowColor = '#00BFFF'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#00BFFF'; ctx.lineWidth = 4*a;
        ctx.beginPath();
        ctx.moveTo(this.x1-cam.x, this.y1-cam.y);
        ctx.lineTo(this.x2-cam.x, this.y2-cam.y);
        ctx.stroke();
        ctx.restore();
    }
}

// ─── ParticleSystem ───────────────────────────────────────────────────────────
class ParticleSystem {
    constructor() { this.items = []; }

    _add(p) { this.items.push(p); }

    emit(x, y, color, count, speed, size, life, grav = 0) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI*2;
            const s = speed * (0.4 + Math.random() * 0.8);
            this._add(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, color,
                size*(0.6 + Math.random()*0.8), life*(0.6 + Math.random()*0.8), grav));
        }
    }

    muzzleFlash(x, y, angle) {
        if (!FEATURES.muzzleFlash) return;
        for (let i = 0; i < 7; i++) {
            const a = angle + (Math.random()-0.5)*0.45;
            const s = 180 + Math.random()*160;
            this._add(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s,
                i < 3 ? '#FFFFFF' : '#FFA040', 3+Math.random()*3, 0.055+Math.random()*0.035));
        }
    }

    shellCasing(x, y, angle) {
        if (!FEATURES.shellCasings) return;
        const a = angle - Math.PI/2 + (Math.random()-0.5)*0.6;
        const s = 70 + Math.random()*70;
        this._add(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, '#DAA520', 2.5, 0.9, 200));
    }

    blood(x, y, count = 8) {
        if (!FEATURES.bloodEffects) return;
        this.emit(x, y, '#8B0000', count,    80, 3.0, 0.55, 120);
        this.emit(x, y, '#CC0000', Math.ceil(count/2), 50, 2.0, 0.40, 120);
    }

    explosion(x, y, radius) {
        this.emit(x, y, '#FF6600', 22, 200, 8, 0.80,   0);
        this.emit(x, y, '#FFAA00', 16, 150, 5, 0.60,   0);
        this.emit(x, y, '#FF2200', 10, 130, 6, 0.50,   0);
        this.emit(x, y, '#888888', 28, 180, 4, 1.10,  60);
        this._add(new Shockwave(x, y, radius));
    }

    railBeam(x1, y1, x2, y2) {
        this._add(new RailBeam(x1, y1, x2, y2));
    }

    flameParticle(x, y, angle) {
        const a = angle + (Math.random()-0.5)*0.35;
        const s = 120 + Math.random()*100;
        const hue = 10 + Math.floor(Math.random()*30);
        this._add(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s,
            `hsl(${hue},100%,55%)`, 6+Math.random()*5, 0.18+Math.random()*0.14, -80));
    }

    update(dt) {
        for (let i = this.items.length-1; i >= 0; i--) {
            this.items[i].update(dt);
            if (!this.items[i].alive) this.items.splice(i, 1);
        }
    }

    render(ctx, cam) {
        for (const p of this.items) p.render(ctx, cam);
    }
}

// ─── Screen Shake ─────────────────────────────────────────────────────────────
class ScreenShake {
    constructor() { this.intensity = 0; this.dx = 0; this.dy = 0; }
    add(amt) { if (FEATURES.screenShake) this.intensity = Math.max(this.intensity, amt); }
    update(dt) {
        this.intensity = Math.max(0, this.intensity - dt * 32);
        this.dx = (Math.random()-0.5) * this.intensity;
        this.dy = (Math.random()-0.5) * this.intensity;
    }
}

// ─── Damage Number ────────────────────────────────────────────────────────────
class DmgNumber {
    constructor(x, y, value, crit = false, headshot = false) {
        this.x = x; this.y = y;
        this.vy = -75 - Math.random()*25;
        this.value = value; this.crit = crit; this.headshot = headshot;
        this.life = 0.95; this.maxLife = 0.95; this.alive = true;
    }
    update(dt) {
        this.y  += this.vy * dt;
        this.vy *= Math.pow(0.88, dt*60);
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }
    render(ctx, cam) {
        if (!FEATURES.damageNumbers) return;
        const sx = this.x - cam.x, sy = this.y - cam.y;
        const a = Math.min(1, this.life / this.maxLife * 2.2);
        const scale = this.headshot ? 1.4 : (this.crit ? 1.35 : 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `bold ${Math.round(15*scale)}px Courier New`;
        ctx.textAlign = 'center';
        const col = this.headshot ? '#FF0066' : (this.crit ? '#FF8800' : '#FFEE44');
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        const txt = this.headshot ? `💀${this.value}` : (this.crit ? `★${this.value}` : `${this.value}`);
        ctx.strokeText(txt, sx, sy);
        ctx.fillStyle = col; ctx.fillText(txt, sx, sy);
        ctx.restore();
    }
}

// ─── Footprint Manager ────────────────────────────────────────────────────────
class FootprintMgr {
    constructor() { this.list = []; }
    add(x, y, angle) {
        if (!FEATURES.footprints) return;
        this.list.push({ x, y, angle, life: 3.0 });
    }
    update(dt) {
        for (let i = this.list.length-1; i >= 0; i--) {
            this.list[i].life -= dt;
            if (this.list[i].life <= 0) this.list.splice(i, 1);
        }
    }
    render(ctx, cam) {
        if (!FEATURES.footprints) return;
        for (const f of this.list) {
            const sx = f.x - cam.x, sy = f.y - cam.y;
            if (sx < -10 || sy < -10 || sx > CFG.CAM_W+10 || sy > CFG.CAM_H+10) continue;
            ctx.save();
            ctx.globalAlpha = Math.max(0, f.life/3.0*0.45);
            ctx.fillStyle = '#2a2015';
            ctx.translate(sx, sy); ctx.rotate(f.angle + Math.PI/2);
            ctx.beginPath(); ctx.ellipse(-2.5,-3,1.5,2.5,0,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(2.5, 3,1.5,2.5,0,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
}
