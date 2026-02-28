// js/world.js – Map generation, rendering, barrels, ambient creatures
'use strict';

class World {
    constructor() {
        this.T  = CFG.TILE;
        this.MW = CFG.MAP_W;
        this.MH = CFG.MAP_H;

        // Uint8 grids: 0=floor, 1=wall
        this.tiles    = Array.from({length: this.MH}, () => new Uint8Array(this.MW));
        this.walkable = Array.from({length: this.MH}, () => new Uint8Array(this.MW).fill(1));

        this.buildings = [];   // {tx,ty,tw,th}
        this.spawnPoints = [];
        this.barrels = [];
        this.ambientCreatures = [];
        this.rainDrops = [];

        this._generate();
    }

    // ── internal helpers ─────────────────────────────────────────────────────

    _setWall(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.MW || ty >= this.MH) return;
        this.tiles[ty][tx]    = 1;
        this.walkable[ty][tx] = 0;
    }

    _openDoor(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.MW || ty >= this.MH) return;
        this.tiles[ty][tx]    = 0;
        this.walkable[ty][tx] = 1;
    }

    _building(tx, ty, tw, th) {
        if (tx < 1 || ty < 1 || tx+tw > this.MW-1 || ty+th > this.MH-1) return;
        this.buildings.push({tx, ty, tw, th});

        // Hollow rectangle of walls
        for (let x = tx; x < tx+tw; x++) {
            for (let y = ty; y < ty+th; y++) {
                if (x === tx || x === tx+tw-1 || y === ty || y === ty+th-1) {
                    this._setWall(x, y);
                }
            }
        }

        // Doors: at least 2 per building so enemies can always enter & exit
        const doorCount = (tw >= 5 || th >= 5) ? 2 : 1;
        const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        for (let d = 0; d < doorCount; d++) {
            const s = sides[d];
            if (s === 0 && tw > 2) {
                this._openDoor(tx + 1 + Math.floor(Math.random() * (tw-2)), ty);
            } else if (s === 1 && tw > 2) {
                this._openDoor(tx + 1 + Math.floor(Math.random() * (tw-2)), ty+th-1);
            } else if (s === 2 && th > 2) {
                this._openDoor(tx, ty + 1 + Math.floor(Math.random() * (th-2)));
            } else if (th > 2) {
                this._openDoor(tx+tw-1, ty + 1 + Math.floor(Math.random() * (th-2)));
            }
        }
    }

    _generate() {
        // Border walls
        for (let x = 0; x < this.MW; x++) { this._setWall(x, 0); this._setWall(x, this.MH-1); }
        for (let y = 0; y < this.MH; y++) { this._setWall(0, y); this._setWall(this.MW-1, y); }

        // Pre-placed buildings (tx,ty,tw,th) – designed to leave corridors
        const defs = [
            [5,5,6,4],  [14,5,5,5],  [23,4,7,4],  [34,5,5,6],  [42,5,6,4],
            [5,14,4,6], [13,13,6,5], [22,14,5,4], [31,13,5,5], [40,14,8,5],
            [5,24,7,5], [16,23,4,6], [25,24,6,5], [35,23,5,5], [43,23,5,6],
            [5,34,5,5], [13,33,6,5], [22,34,7,4], [33,33,5,6], [42,33,5,5],
            [5,42,6,5], [14,42,5,5], [24,41,6,6], [34,41,5,5], [42,41,6,6],
        ];
        for (const d of defs) this._building(...d);

        // Initialise pathfinder with fresh walkable grid
        pathfinder.init(this.walkable.map(r => Array.from(r).map(v => v === 1)));

        // Spawn points (corners + edge mids)
        const T = this.T;
        this.spawnPoints = [
            { x: 3*T, y: 3*T }, { x: (this.MW-4)*T, y: 3*T },
            { x: 3*T, y: (this.MH-4)*T }, { x: (this.MW-4)*T, y: (this.MH-4)*T },
            { x: 26*T, y: 3*T }, { x: 26*T, y: (this.MH-4)*T },
            { x: 3*T, y: 26*T }, { x: (this.MW-4)*T, y: 26*T },
        ];

        if (FEATURES.explosiveBarrels) this._placeBarrels();
        if (FEATURES.ambientCreatures) this._spawnAmbient();

        // Rain pool (static positions, toggled at runtime)
        for (let i = 0; i < 120; i++) {
            this.rainDrops.push({
                x: Math.random() * CFG.WORLD_W,
                y: Math.random() * CFG.WORLD_H,
                len: 8 + Math.random() * 10,
            });
        }
    }

    _placeBarrels() {
        const pos = [
            [9,9],[19,8],[29,8],[38,9],
            [8,18],[17,20],[29,19],[39,19],
            [9,29],[21,29],[31,28],[39,29],
            [9,39],[21,38],[31,38],[39,39],
        ];
        for (const [tx,ty] of pos) {
            if (ty < this.MH && tx < this.MW && this.walkable[ty][tx]) {
                this.barrels.push({
                    x: tx*this.T + this.T/2, y: ty*this.T + this.T/2,
                    hp: 30, maxHp: 30, exploded: false,
                    glowTimer: 0,
                });
            }
        }
    }

    _spawnAmbient() {
        for (let i = 0; i < 10; i++) {
            for (let t = 0; t < 30; t++) {
                const tx = 2 + Math.floor(Math.random() * (this.MW-4));
                const ty = 2 + Math.floor(Math.random() * (this.MH-4));
                if (this.walkable[ty][tx]) {
                    this.ambientCreatures.push({
                        x: tx*this.T + this.T/2, y: ty*this.T + this.T/2,
                        vx: (Math.random()-0.5)*50, vy: (Math.random()-0.5)*50,
                        angle: Math.random()*Math.PI*2,
                        size: 5 + Math.random()*5,
                        color: ['#8B4513','#6B8E23','#556B2F'][Math.floor(Math.random()*3)],
                        timer: Math.random()*3,
                    });
                    break;
                }
            }
        }
    }

    // ── public API ───────────────────────────────────────────────────────────

    isWalkable(wx, wy) {
        const tx = Math.floor(wx / this.T);
        const ty = Math.floor(wy / this.T);
        if (tx < 0 || ty < 0 || tx >= this.MW || ty >= this.MH) return false;
        return this.walkable[ty][tx] === 1;
    }

    /** Nearest walkable world-coord position to (wx,wy) */
    nearestWalkableWorld(wx, wy) {
        let tx = Math.floor(wx / this.T);
        let ty = Math.floor(wy / this.T);
        for (let r = 0; r <= 8; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) === r || Math.abs(dy) === r || r === 0) {
                        const nx = tx+dx, ny = ty+dy;
                        if (nx >= 0 && ny >= 0 && nx < this.MW && ny < this.MH && this.walkable[ny][nx]) {
                            return { x: (nx+0.5)*this.T, y: (ny+0.5)*this.T };
                        }
                    }
                }
            }
        }
        return { x: wx, y: wy };
    }

    damageBarrel(barrel, dmg, particles) {
        barrel.hp -= dmg;
        barrel.glowTimer = 0.3;
        if (barrel.hp <= 0 && !barrel.exploded) {
            barrel.exploded = true;
            particles.explosion(barrel.x, barrel.y, CFG.BARREL_RADIUS);
            return true; // caller handles blast damage
        }
        return false;
    }

    // ── update ───────────────────────────────────────────────────────────────

    update(dt) {
        // Barrel glow decay
        for (const b of this.barrels) {
            if (b.glowTimer > 0) b.glowTimer -= dt;
        }

        // Ambient creatures wander
        if (FEATURES.ambientCreatures) {
            for (const c of this.ambientCreatures) {
                c.timer -= dt;
                if (c.timer <= 0) {
                    c.vx = (Math.random()-0.5)*55;
                    c.vy = (Math.random()-0.5)*55;
                    c.timer = 1 + Math.random()*3;
                }
                const nx = c.x + c.vx*dt, ny = c.y + c.vy*dt;
                if (this.isWalkable(nx, ny)) {
                    c.x = nx; c.y = ny;
                    if (c.vx||c.vy) c.angle = Math.atan2(c.vy, c.vx);
                } else { c.vx *= -1; c.vy *= -1; }
            }
        }

        // Rain movement
        if (FEATURES.rainWeather) {
            for (const r of this.rainDrops) {
                r.y += 300*dt;
                r.x += 40*dt;
                if (r.y > CFG.WORLD_H) { r.y = 0; r.x = Math.random() * CFG.WORLD_W; }
            }
        }
    }

    // ── render ───────────────────────────────────────────────────────────────

    render(ctx, cam) {
        const T = this.T;
        const startTX = Math.max(0, Math.floor(cam.x / T));
        const startTY = Math.max(0, Math.floor(cam.y / T));
        const endTX   = Math.min(this.MW, Math.ceil((cam.x + CFG.CAM_W) / T) + 1);
        const endTY   = Math.min(this.MH, Math.ceil((cam.y + CFG.CAM_H) / T) + 1);

        const FLOOR_COLS = ['#3a3528','#352f22','#3d3830','#38332a','#3c3630','#362e25','#403c30','#342d22'];

        for (let ty = startTY; ty < endTY; ty++) {
            for (let tx = startTX; tx < endTX; tx++) {
                const sx = tx*T - cam.x, sy = ty*T - cam.y;
                if (this.tiles[ty][tx] === 1) {
                    ctx.fillStyle = '#45413a';
                    ctx.fillRect(sx, sy, T, T);
                    ctx.fillStyle = '#5a5545';
                    ctx.fillRect(sx, sy, T, 3);
                    ctx.fillStyle = '#35312c';
                    ctx.fillRect(sx, sy+T-3, T, 3);
                    ctx.fillStyle = '#524e46';
                    ctx.fillRect(sx, sy, 3, T);
                } else {
                    ctx.fillStyle = FLOOR_COLS[(tx*7+ty*13) & 7];
                    ctx.fillRect(sx, sy, T, T);
                }
            }
        }

        // Barrels
        if (FEATURES.explosiveBarrels) {
            for (const b of this.barrels) {
                if (b.exploded) continue;
                const sx = b.x - cam.x, sy = b.y - cam.y;
                if (sx < -30 || sy < -30 || sx > CFG.CAM_W+30 || sy > CFG.CAM_H+30) continue;

                if (b.glowTimer > 0) {
                    ctx.save();
                    ctx.globalAlpha = b.glowTimer / 0.3 * 0.5;
                    ctx.fillStyle = '#FF4400';
                    ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = '#8B0000';
                ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#AA2222'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI*2); ctx.stroke();
                // Bands
                ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx-12, sy-4); ctx.lineTo(sx+12, sy-4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(sx-12, sy+4); ctx.lineTo(sx+12, sy+4); ctx.stroke();
                ctx.fillStyle = '#FFD700';
                ctx.font = '11px Arial'; ctx.textAlign = 'center';
                ctx.fillText('⚠', sx, sy+4);
                if (b.hp < b.maxHp) {
                    ctx.fillStyle = '#333'; ctx.fillRect(sx-12, sy-22, 24, 4);
                    ctx.fillStyle = '#FF4400'; ctx.fillRect(sx-12, sy-22, 24*(b.hp/b.maxHp), 4);
                }
            }
        }

        // Ambient creatures
        if (FEATURES.ambientCreatures) {
            for (const c of this.ambientCreatures) {
                const sx = c.x - cam.x, sy = c.y - cam.y;
                if (sx < -20 || sy < -20 || sx > CFG.CAM_W+20 || sy > CFG.CAM_H+20) continue;
                ctx.save();
                ctx.translate(sx, sy); ctx.rotate(c.angle);
                ctx.fillStyle = c.color;
                ctx.beginPath(); ctx.ellipse(0, 0, c.size, c.size*0.55, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#FF2200';
                ctx.beginPath(); ctx.arc(c.size*0.65, -c.size*0.2, 1.5, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            }
        }

        // Rain
        if (FEATURES.rainWeather) {
            ctx.save();
            ctx.strokeStyle = 'rgba(140,180,255,0.35)';
            ctx.lineWidth = 1;
            for (const r of this.rainDrops) {
                const sx = r.x - cam.x, sy = r.y - cam.y;
                if (sx < -20 || sy < -20 || sx > CFG.CAM_W+20 || sy > CFG.CAM_H+20) continue;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + 2, sy + r.len);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    renderMinimap(ctx, x, y, w, h, player, enemies) {
        const scaleX = w / CFG.WORLD_W;
        const scaleY = h / CFG.WORLD_H;
        const T = this.T;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, y, w, h);

        // Draw walls
        ctx.fillStyle = '#5a5545';
        for (let ty = 0; ty < this.MH; ty++) {
            for (let tx = 0; tx < this.MW; tx++) {
                if (this.tiles[ty][tx] === 1) {
                    ctx.fillRect(
                        x + tx*T*scaleX, y + ty*T*scaleY,
                        T*scaleX + 0.5, T*scaleY + 0.5
                    );
                }
            }
        }

        // Enemies
        ctx.fillStyle = '#FF4444';
        for (const e of enemies) {
            if (!e.alive) continue;
            ctx.beginPath();
            ctx.arc(x + e.x*scaleX, y + e.y*scaleY, 2, 0, Math.PI*2);
            ctx.fill();
        }

        // Player
        ctx.fillStyle = '#44FF44';
        ctx.beginPath();
        ctx.arc(x + player.x*scaleX, y + player.y*scaleY, 3, 0, Math.PI*2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#665533';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }
}
