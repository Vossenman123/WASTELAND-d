// js/pathfinding.js – A* on a boolean grid (true = walkable)
'use strict';

class MinHeap {
    constructor() { this.d = []; }
    push(item) { this.d.push(item); this._up(this.d.length - 1); }
    pop() {
        const top = this.d[0];
        const last = this.d.pop();
        if (this.d.length > 0) { this.d[0] = last; this._dn(0); }
        return top;
    }
    isEmpty() { return this.d.length === 0; }
    _up(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.d[p].f <= this.d[i].f) break;
            [this.d[p], this.d[i]] = [this.d[i], this.d[p]]; i = p;
        }
    }
    _dn(i) {
        const n = this.d.length;
        for (;;) {
            let s = i, l = 2*i+1, r = 2*i+2;
            if (l < n && this.d[l].f < this.d[s].f) s = l;
            if (r < n && this.d[r].f < this.d[s].f) s = r;
            if (s === i) break;
            [this.d[s], this.d[i]] = [this.d[i], this.d[s]]; i = s;
        }
    }
}

class AStar {
    constructor() { this.grid = null; this.W = 0; this.H = 0; }

    init(grid) {
        this.grid = grid;   // 2-D array of booleans (true = walkable)
        this.H = grid.length;
        this.W = this.H > 0 ? grid[0].length : 0;
    }

    _ok(x, y) {
        return x >= 0 && y >= 0 && x < this.W && y < this.H && this.grid[y][x];
    }

    _nearest(x, y) {
        for (let r = 1; r <= 6; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) === r || Math.abs(dy) === r) {
                        if (this._ok(x + dx, y + dy)) return { x: x+dx, y: y+dy };
                    }
                }
            }
        }
        return null;
    }

    find(sx, sy, ex, ey) {
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        sx = clamp(Math.round(sx), 0, this.W-1);
        sy = clamp(Math.round(sy), 0, this.H-1);
        ex = clamp(Math.round(ex), 0, this.W-1);
        ey = clamp(Math.round(ey), 0, this.H-1);

        if (!this._ok(sx, sy)) { const n = this._nearest(sx, sy); if (!n) return []; sx=n.x; sy=n.y; }
        if (!this._ok(ex, ey)) { const n = this._nearest(ex, ey); if (!n) return []; ex=n.x; ey=n.y; }
        if (sx === ex && sy === ey) return [];

        const W = this.W;
        const key = (x, y) => y * W + x;
        const open = new MinHeap();
        const closed = new Uint8Array(this.W * this.H);
        const gMap = new Float32Array(this.W * this.H).fill(Infinity);
        const from = new Int32Array(this.W * this.H).fill(-1);

        const h = (x, y) => {
            const dx = Math.abs(x - ex), dy = Math.abs(y - ey);
            return dx + dy - 0.586 * Math.min(dx, dy);
        };

        const sk = key(sx, sy);
        gMap[sk] = 0;
        open.push({ x: sx, y: sy, f: h(sx, sy) });

        const DIRS = [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]];
        let iter = 0;

        while (!open.isEmpty() && iter++ < 4000) {
            const cur = open.pop();
            const { x: cx, y: cy } = cur;
            const ck = key(cx, cy);
            if (closed[ck]) continue;
            closed[ck] = 1;

            if (cx === ex && cy === ey) {
                // Reconstruct
                const path = [];
                let k = ck;
                while (k !== sk) {
                    path.unshift({ x: k % W, y: Math.floor(k / W) });
                    k = from[k];
                    if (k < 0) break;
                }
                return path;
            }

            for (const [dx, dy] of DIRS) {
                const nx = cx+dx, ny = cy+dy;
                const nk = key(nx, ny);
                if (!this._ok(nx, ny) || closed[nk]) continue;
                // Diagonal: both cardinal neighbours must be walkable
                if (dx && dy && (!this._ok(cx+dx, cy) || !this._ok(cx, cy+dy))) continue;
                const cost = dx && dy ? 1.414 : 1;
                const tg = gMap[ck] + cost;
                if (tg < gMap[nk]) {
                    gMap[nk] = tg;
                    from[nk] = ck;
                    open.push({ x: nx, y: ny, f: tg + h(nx, ny) });
                }
            }
        }
        return []; // no path
    }
}

const pathfinder = new AStar();
