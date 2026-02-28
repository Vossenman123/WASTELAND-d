// js/items.js – Pickups / loot drops
'use strict';

class Item {
    constructor(x, y, type) {
        this.x    = x; this.y = y;
        this.type = type;   // 'health' | 'ammo' | 'shield' | 'grenade'
        this.alive = true;
        this.life  = 18;    // despawn after 18s
        this.bob   = Math.random() * Math.PI*2;
    }
    update(dt) {
        this.bob  += dt * 2.2;
        this.life -= dt;
        if (this.life <= 0) this.alive = false;
    }
    render(ctx, cam) {
        const sx = this.x - cam.x;
        const sy = this.y - cam.y + Math.sin(this.bob)*3;
        if (sx < -30 || sy < -30 || sx > CFG.CAM_W+30 || sy > CFG.CAM_H+30) return;

        const alpha = this.life < 3 ? this.life/3 : 1;
        ctx.save(); ctx.globalAlpha = alpha;

        // Glow
        const glowCol = this.type === 'health'  ? '#FF4444' :
                        this.type === 'shield'  ? '#00BFFF' :
                        this.type === 'grenade' ? '#FFAA00' : '#FFD700';
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = glowCol;
        ctx.beginPath(); ctx.arc(sx, sy, 17, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = alpha;

        // Body
        ctx.fillStyle = glowCol;
        ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI*2); ctx.stroke();

        // Icon
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        const icon = this.type === 'health'  ? '+' :
                     this.type === 'shield'  ? '◈' :
                     this.type === 'grenade' ? '●' : 'A';
        ctx.fillText(icon, sx, sy+4);
        ctx.restore();
    }
}

function spawnLoot(x, y, world) {
    if (!FEATURES.lootDrops) return [];
    const items = [];
    const r = Math.random();
    if (r < 0.35) items.push(new Item(x, y, 'health'));
    else if (r < 0.60) items.push(new Item(x, y, 'ammo'));
    else if (r < 0.75) items.push(new Item(x, y, 'shield'));
    else if (r < 0.82 && FEATURES.grenades) items.push(new Item(x, y, 'grenade'));
    return items;
}
