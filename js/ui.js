// js/ui.js – HUD + Pause-menu (canvas-drawn HUD, HTML-div menu)
'use strict';

class HUD {
    constructor(player, skillTree) {
        this.player    = player;
        this.skillTree = skillTree;
        this.dmgNumbers = [];
    }

    addDmgNumber(x, y, value, crit = false, headshot = false) {
        if (!FEATURES.damageNumbers) return;
        this.dmgNumbers.push(new DmgNumber(x, y, value, crit, headshot));
    }

    update(dt) {
        for (let i = this.dmgNumbers.length-1; i >= 0; i--) {
            this.dmgNumbers[i].update(dt);
            if (!this.dmgNumbers[i].alive) this.dmgNumbers.splice(i, 1);
        }
    }

    render(ctx, cam, game) {
        // Damage numbers
        for (const d of this.dmgNumbers) d.render(ctx, cam);

        // ── Bottom bar background ─────────────────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, CFG.CAM_H - 58, CFG.CAM_W, 58);

        const p   = this.player;
        const w   = p.weapon;
        const sk  = this.skillTree;

        // ── Health bar ────────────────────────────────────────────────────
        this._drawBar(ctx, 16, CFG.CAM_H-50, 160, 12, p.hp,
            p.maxHp + (sk.bonuses.maxHp||0),
            p.hp > 50 ? '#44CC44' : p.hp > 25 ? '#FFAA00' : '#FF2222',
            '❤', '#FF4444');

        // Shield bar
        if (FEATURES.shieldArmor) {
            this._drawBar(ctx, 16, CFG.CAM_H-32, 160, 9, p.shield, p.maxShield,
                '#00BFFF', '🛡', '#00BFFF');
        }

        // ── Ammo ──────────────────────────────────────────────────────────
        const ammoX = 200;
        ctx.fillStyle = '#999';
        ctx.font = '11px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(w.name, ammoX, CFG.CAM_H-44);

        const ammo = p.ammo[w.id];
        const maxA = Math.round(w.magSize * (1 + (sk.bonuses.ammoCapacity||0)));
        ctx.fillStyle = ammo < 5 ? '#FF4444' : '#DDCC88';
        ctx.font = 'bold 22px Courier New';
        ctx.fillText(p.reloading ? 'RELOAD...' : `${ammo}/${maxA}`, ammoX, CFG.CAM_H-22);

        // Minigun spin indicator
        if (w.id === 10) {
            ctx.fillStyle = p.minigunRate > 0.85 ? '#44FF44' : '#FFAA00';
            ctx.font = '11px Courier New';
            ctx.fillText(`⚙ ${Math.round(p.minigunRate*100)}%`, ammoX, CFG.CAM_H-8);
        }

        // Railgun charge indicator
        if (w.id === 14 && p.railCharging) {
            ctx.fillStyle = '#00BFFF';
            ctx.font = '11px Courier New';
            ctx.fillText(`⚡ ${Math.round(p.railCharge*100)}%`, ammoX, CFG.CAM_H-8);
        }

        // ── Grenades ──────────────────────────────────────────────────────
        if (FEATURES.grenades) {
            ctx.fillStyle = '#FFAA00';
            ctx.font = '13px Courier New'; ctx.textAlign = 'left';
            ctx.fillText(`💥 ${p.grenades}`, 380, CFG.CAM_H-22);
        }

        // ── Weapon slots ──────────────────────────────────────────────────
        let slotX = 440;
        for (let i = 0; i < p.weaponSlots.length; i++) {
            const sl = p.weaponSlots[i];
            const active = i === p.weaponIdx;
            ctx.fillStyle = active ? 'rgba(80,70,30,0.8)' : 'rgba(30,28,18,0.6)';
            ctx.fillRect(slotX, CFG.CAM_H-52, 46, 46);
            if (active) {
                ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 1.5;
                ctx.strokeRect(slotX, CFG.CAM_H-52, 46, 46);
            }
            // Color dot
            ctx.fillStyle = sl.color;
            ctx.beginPath(); ctx.arc(slotX+7, CFG.CAM_H-38, 5, 0, Math.PI*2); ctx.fill();
            // Name
            ctx.fillStyle = active ? '#e8c060' : '#776655';
            ctx.font = '9px Courier New'; ctx.textAlign = 'center';
            ctx.fillText(sl.name.substring(0,7), slotX+23, CFG.CAM_H-28);
            // Key
            ctx.fillStyle = '#555';
            ctx.fillText(`[${i+1}]`, slotX+23, CFG.CAM_H-12);
            slotX += 50;
        }

        // ── Dash cooldown ─────────────────────────────────────────────────
        if (FEATURES.dashAbility) {
            const dc = p.dashCD / CFG.DASH_CD;
            ctx.fillStyle = dc <= 0 ? '#44CCFF' : '#335566';
            ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'right';
            ctx.fillText(dc > 0 ? `⚡${dc.toFixed(1)}` : '⚡DASH', CFG.CAM_W - 16, CFG.CAM_H - 40);
        }

        // ── Combo ─────────────────────────────────────────────────────────
        if (FEATURES.comboMultiplier && p.comboCount >= 2) {
            const idx = Math.min(p.comboCount, CFG.COMBO_MULT.length-1);
            const mult = CFG.COMBO_MULT[idx];
            ctx.font = 'bold 18px Courier New'; ctx.textAlign = 'right';
            ctx.fillStyle = `hsl(${60-p.comboCount*8},100%,60%)`;
            ctx.fillText(`x${mult.toFixed(1)} COMBO  ${p.comboCount}`, CFG.CAM_W - 16, CFG.CAM_H - 56);
        }

        // ── Kill streak ───────────────────────────────────────────────────
        if (FEATURES.killStreak && p.streakCount >= 3) {
            ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'right';
            ctx.fillStyle = '#FF8800';
            ctx.fillText(`🔥 ${p.streakCount} STREAK`, CFG.CAM_W - 16, CFG.CAM_H - 72);
        }

        // ── Top HUD ───────────────────────────────────────────────────────
        // XP bar
        const xpW = 260;
        const xpX = CFG.CAM_W/2 - xpW/2;
        const xpPct = p.xpToNext > 0 ? Math.min(1, p.xp / p.xpToNext) : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(xpX-2, 6, xpW+4, 14);
        ctx.fillStyle = '#225522';
        ctx.fillRect(xpX, 8, xpW, 10);
        ctx.fillStyle = '#44EE44';
        ctx.fillRect(xpX, 8, xpW * xpPct, 10);
        ctx.fillStyle = '#e8c060'; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(`LVL ${p.level}  XP: ${p.xp}/${p.xpToNext}  SP: ${this.skillTree.points}`, CFG.CAM_W/2, 19);

        // Wave / kills
        if (FEATURES.waveCounter) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(CFG.CAM_W-130, 5, 124, 28);
            ctx.fillStyle = '#AAAAAA'; ctx.font = '11px Courier New'; ctx.textAlign = 'right';
            ctx.fillText(`WAVE  ${game.wave}`, CFG.CAM_W-10, 18);
            ctx.fillText(`KILLS ${p.kills}`, CFG.CAM_W-10, 30);
        }

        // Score
        ctx.fillStyle = '#e8c060'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`${p.score}`, 10, 20);

        // ── Day/night ─────────────────────────────────────────────────────
        if (FEATURES.dayNightCycle) {
            const phase  = (game.dayTime % CFG.DAY_PERIOD) / CFG.DAY_PERIOD;
            const isDark = phase > 0.5;
            const icon   = isDark ? '🌙' : '☀';
            ctx.font = '16px Arial'; ctx.textAlign = 'left';
            ctx.fillText(icon, 10, 40);
        }

        // ── Bullet time label ─────────────────────────────────────────────
        if (p.bulletTimeOn) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#44AAFF';
            ctx.font = 'bold 20px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('● BULLET TIME ●', CFG.CAM_W/2, 50);
            ctx.restore();
        }

        // ── Overcharge ────────────────────────────────────────────────────
        if (p.overChargeT > 0) {
            ctx.fillStyle = '#FFAA00'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'left';
            ctx.fillText(`⚡OVERCHARGE ${p.overChargeT.toFixed(1)}s`, 200, 20);
        }

        // ── Mini-map ──────────────────────────────────────────────────────
        if (FEATURES.minimap && game.world) {
            game.world.renderMinimap(ctx, CFG.CAM_W-156, CFG.CAM_H-160, 144, 144,
                game.player, game.enemies);
        }

        // ── Level-up flash ────────────────────────────────────────────────
        if (p.levelUpAnim > 0) {
            const a = Math.min(1, p.levelUpAnim * 0.6);
            ctx.save(); ctx.globalAlpha = a;
            ctx.fillStyle = '#FFD700'; ctx.font = 'bold 30px Courier New'; ctx.textAlign = 'center';
            ctx.fillText(`⬆  LEVEL ${p.level}  ⬆`, CFG.CAM_W/2, CFG.CAM_H/2 - 60);
            ctx.font = '14px Courier New';
            ctx.fillText(`+1 Skill Point  (${this.skillTree.points} available)`, CFG.CAM_W/2, CFG.CAM_H/2 - 28);
            ctx.restore();
        }
    }

    _drawBar(ctx, x, y, w, h, val, max, fillCol, icon, iconCol) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = fillCol;
        ctx.fillRect(x, y, Math.max(0, w * (val/max)), h);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = iconCol || '#fff';
        ctx.font = '10px Arial'; ctx.textAlign = 'left';
        ctx.fillText(`${icon} ${Math.ceil(val)}/${Math.ceil(max)}`, x + w + 5, y + h - 1);
    }
}

// ─── PauseMenu ────────────────────────────────────────────────────────────────
class PauseMenu {
    constructor(game, skillTree) {
        this.game       = game;
        this.skillTree  = skillTree;
        this.activeTab  = 'game';  // 'game' | 'features' | 'skills' | 'armory'
        this.visible    = false;
        this.hoveredSkill = null;

        // Skill canvas
        this.skillCanvas = null;
        this.skillCtx    = null;

        this._build();
    }

    _build() {
        const overlay = document.getElementById('pauseOverlay');
        if (!overlay) return;

        // Tab buttons
        const tabs = ['game', 'features', 'skills', 'armory'];
        const labels = { game:'⚙ GAME', features:'⚡ FEATURES', skills:'🌟 SKILL TREE', armory:'🔫 ARMORY' };
        const tabBar = document.getElementById('tabBar');
        tabBar.innerHTML = '';
        for (const t of tabs) {
            const btn = document.createElement('button');
            btn.className = `tab-btn${t === this.activeTab ? ' active' : ''}`;
            btn.textContent = labels[t];
            btn.dataset.tab = t;
            btn.addEventListener('click', () => this._switchTab(t));
            tabBar.appendChild(btn);
        }

        this._buildGameTab();
        this._buildFeaturesTab();
        this._buildSkillTab();
        this._buildArmoryTab();

        this._switchTab('game');
    }

    _switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `tab-${tab}`);
        });
        if (tab === 'skills') this._drawSkillTree();
    }

    _buildGameTab() {
        const panel = document.getElementById('tab-game');
        panel.innerHTML = `
            <div class="section-title">GAME</div>
            <button class="pause-btn" id="btnResume">▶  RESUME</button>
            <button class="pause-btn" id="btnResetSpawns">🔄  RESET ENEMY SPAWNS</button>

            <div class="section-title">DIFFICULTY</div>
            <button class="pause-btn" id="btnDiffEasy">EASY  – fewer, weaker enemies</button>
            <button class="pause-btn" id="btnDiffNorm">NORMAL  – default settings</button>
            <button class="pause-btn" id="btnDiffHard">HARD  – more, tougher enemies</button>

            <div class="section-title">SESSION</div>
            <button class="pause-btn danger" id="btnRestart">↩  RESTART GAME</button>
        `;
        panel.querySelector('#btnResume').addEventListener('click', () => this.hide());
        panel.querySelector('#btnResetSpawns').addEventListener('click', () => {
            this.game.resetEnemySpawns(); this.hide();
        });
        panel.querySelector('#btnDiffEasy').addEventListener('click', () => this.game.setDifficulty('easy'));
        panel.querySelector('#btnDiffNorm').addEventListener('click', () => this.game.setDifficulty('normal'));
        panel.querySelector('#btnDiffHard').addEventListener('click', () => this.game.setDifficulty('hard'));
        panel.querySelector('#btnRestart').addEventListener('click', () => {
            this.hide(); this.game.restart();
        });
    }

    _buildFeaturesTab() {
        const panel = document.getElementById('tab-features');
        panel.innerHTML = '<div class="section-title">TOGGLE FEATURES</div><div class="feat-grid" id="featGrid"></div>';
        const grid = panel.querySelector('#featGrid');
        for (const [key, label] of Object.entries(FEATURE_LABELS)) {
            const el = document.createElement('div');
            el.className = `feat-toggle${FEATURES[key] ? ' on' : ''}`;
            el.id = `feat-${key}`;
            el.innerHTML = `<div class="dot"></div><span class="feat-label">${label}</span>`;
            el.addEventListener('click', () => {
                FEATURES[key] = !FEATURES[key];
                el.classList.toggle('on', FEATURES[key]);
            });
            grid.appendChild(el);
        }
    }

    _buildSkillTab() {
        const panel = document.getElementById('tab-skills');
        panel.innerHTML = `
            <div id="pointsDisplay">SKILL POINTS: <span id="spCount">0</span></div>
            <canvas id="skillCanvas" width="620" height="300"></canvas>
            <div id="skillInfo">Hover a node to see details. Click to purchase.</div>
        `;
        this.skillCanvas = panel.querySelector('#skillCanvas');
        this.skillCtx    = this.skillCanvas.getContext('2d');
        this.skillCanvas.addEventListener('click', (e) => this._onSkillClick(e));
        this.skillCanvas.addEventListener('mousemove', (e) => this._onSkillHover(e));
        this.skillCanvas.addEventListener('mouseleave', () => {
            this.hoveredSkill = null;
            this._drawSkillTree();
        });
    }

    _buildArmoryTab() {
        const panel = document.getElementById('tab-armory');
        let html = '<div class="section-title">WEAPONS</div>';
        for (const w of WEAPON_DEFS) {
            const owned = this.game.player && this.game.player.weaponSlots.find(s => s.id === w.id);
            html += `
            <div class="weapon-card${owned?' owned':''}">
                <div class="wc-color" style="background:${w.color}"></div>
                <div class="wc-name">${w.name}</div>
                <div class="wc-stats">DMG:${w.dmg} | ROF:${(1/w.firerate).toFixed(1)}/s | Range:${w.range} | Mag:${w.magSize}</div>
                ${owned ? '<span class="wc-badge">EQUIPPED</span>' : ''}
            </div>`;
        }
        panel.innerHTML = html;
    }

    // ── Skill tree drawing ───────────────────────────────────────────────────

    _skillNodePos(branchIdx, skillIdx) {
        const cw = 620, ch = 300;
        const cols = 3;
        const branchW = cw / cols;
        const cx = branchW * branchIdx + branchW / 2;
        const yStart = 40, yStep = 36;
        const cy = yStart + skillIdx * yStep;
        return { x: cx, y: cy };
    }

    _drawSkillTree() {
        const canvas = this.skillCanvas;
        if (!canvas) return;
        const ctx = this.skillCtx;
        const sk  = this.skillTree;

        document.getElementById('spCount').textContent = sk.points;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0e0c06'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        const branches = SKILL_TREE.branches;
        for (let bi = 0; bi < branches.length; bi++) {
            const b = branches[bi];

            // Branch title
            const bx = (canvas.width/3)*bi + (canvas.width/3)/2;
            ctx.fillStyle = b.color; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center';
            ctx.fillText(`${b.icon} ${b.name}`, bx, 18);

            for (let si = 0; si < b.skills.length; si++) {
                const skill = b.skills[si];
                const pos   = this._skillNodePos(bi, si);

                // Connection line to next
                if (si < b.skills.length - 1) {
                    const next = this._skillNodePos(bi, si+1);
                    const purch = sk.isPurchased(skill.id);
                    ctx.strokeStyle = purch ? b.color : '#333';
                    ctx.lineWidth = purch ? 2 : 1;
                    ctx.beginPath(); ctx.moveTo(pos.x, pos.y+12); ctx.lineTo(next.x, next.y-12); ctx.stroke();
                }

                const purchased  = sk.isPurchased(skill.id);
                const canBuy     = sk.canBuy(skill);
                const hovered    = this.hoveredSkill && this.hoveredSkill.id === skill.id;

                // Node circle
                let fill = '#1a1810';
                if (purchased)       fill = b.color;
                else if (canBuy)     fill = '#2a2820';
                else                 fill = '#111';

                ctx.beginPath(); ctx.arc(pos.x, pos.y, 13, 0, Math.PI*2);
                ctx.fillStyle = fill; ctx.fill();

                ctx.strokeStyle = hovered ? '#FFFFFF' : (purchased ? b.color : (canBuy ? '#665' : '#333'));
                ctx.lineWidth   = hovered ? 2.5 : 1.5;
                ctx.beginPath(); ctx.arc(pos.x, pos.y, 13, 0, Math.PI*2); ctx.stroke();

                // Cost badge
                ctx.fillStyle = purchased ? '#000' : (canBuy ? '#FFD700' : '#555');
                ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center';
                ctx.fillText(purchased ? '✓' : skill.cost, pos.x, pos.y + 4);

                // Label
                ctx.fillStyle = purchased ? '#fff' : (canBuy ? '#ccc' : '#444');
                ctx.font = '9px Courier New'; ctx.textAlign = 'center';
                ctx.fillText(skill.name, pos.x, pos.y + 25);

                // Hover glow
                if (hovered) {
                    ctx.save(); ctx.globalAlpha = 0.25;
                    ctx.fillStyle = b.color;
                    ctx.beginPath(); ctx.arc(pos.x, pos.y, 18, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }
            }
        }
    }

    _skillAtPos(mouseX, mouseY) {
        for (let bi = 0; bi < SKILL_TREE.branches.length; bi++) {
            const b = SKILL_TREE.branches[bi];
            for (let si = 0; si < b.skills.length; si++) {
                const pos = this._skillNodePos(bi, si);
                if (Math.hypot(mouseX - pos.x, mouseY - pos.y) < 16) return b.skills[si];
            }
        }
        return null;
    }

    _onSkillHover(e) {
        const rect = this.skillCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const skill = this._skillAtPos(mx, my);
        this.hoveredSkill = skill;
        this._drawSkillTree();
        const info = document.getElementById('skillInfo');
        if (skill) {
            const canBuy    = this.skillTree.canBuy(skill);
            const purchased = this.skillTree.isPurchased(skill.id);
            info.innerHTML = `<b>${skill.name}</b> – ${skill.desc}<br>Cost: ${skill.cost} pt${skill.cost>1?'s':''}${skill.req?' | Requires: '+skill.req:''}`
                + (purchased ? '  <span style="color:#4f4">✓ Purchased</span>' : canBuy ? '  <span style="color:#fd4">Click to buy</span>' : '  <span style="color:#844">Cannot afford / locked</span>');
        } else {
            info.textContent = 'Hover a node to see details. Click to purchase.';
        }
    }

    _onSkillClick(e) {
        const rect = this.skillCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const skill = this._skillAtPos(mx, my);
        if (!skill) return;
        if (this.skillTree.buy(skill)) {
            // Refresh armory (HP might have changed)
            this._buildArmoryTab();
            this._drawSkillTree();
            document.getElementById('spCount').textContent = this.skillTree.points;
            document.getElementById('skillInfo').innerHTML =
                `<span style="color:#4f4">✓ Purchased: ${skill.name}!</span>  ${skill.desc}`;
        }
    }

    // ── show / hide ──────────────────────────────────────────────────────────

    show() {
        this.visible = true;
        const o = document.getElementById('pauseOverlay');
        o.classList.add('visible');
        this._buildArmoryTab();
        if (this.activeTab === 'skills') this._drawSkillTree();
        document.getElementById('spCount').textContent = this.skillTree.points;
    }

    hide() {
        this.visible = false;
        document.getElementById('pauseOverlay').classList.remove('visible');
    }
}
