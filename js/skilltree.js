// js/skilltree.js – Skill tree data + manager
'use strict';

const SKILL_TREE = {
    branches: [
        {
            name: 'GUNSLINGER', color: '#FF5555', icon: '🔫',
            desc: 'Master of weapons and raw damage.',
            skills: [
                { id:'gs1', name:'Dead Eye',    cost:1,            desc:'+15% accuracy (less spread)',       effect:{ accuracy:0.15 } },
                { id:'gs2', name:'Quick Draw',  cost:1, req:'gs1', desc:'-20% reload time',                  effect:{ reloadSpeed:0.20 } },
                { id:'gs3', name:'Hollow Pts',  cost:1, req:'gs2', desc:'+20% weapon damage',                effect:{ damage:0.20 } },
                { id:'gs4', name:'Steady Hand', cost:1, req:'gs3', desc:'-30% recoil kick',                  effect:{ recoil:-0.30 } },
                { id:'gs5', name:'Assassin',    cost:2, req:'gs4', desc:'+50% critical hit chance',          effect:{ critChance:0.50 } },
                { id:'gs6', name:'Spray&Pray',  cost:2, req:'gs5', desc:'+25% fire rate',                   effect:{ fireRate:0.25 } },
                { id:'gs7', name:'Overkill',    cost:3, req:'gs6', desc:'+100% critical hit damage',         effect:{ critDmg:1.00 } },
            ],
        },
        {
            name: 'SURVIVOR', color: '#55FF55', icon: '🛡',
            desc: 'Toughness, resilience and scavenging.',
            skills: [
                { id:'sv1', name:'Iron Skin',   cost:1,            desc:'+30 max HP',                        effect:{ maxHp:30 } },
                { id:'sv2', name:'Scavenger',   cost:1, req:'sv1', desc:'+30% loot drop rate',               effect:{ lootRate:0.30 } },
                { id:'sv3', name:'Field Medic', cost:1, req:'sv2', desc:'Health packs restore +50% more',    effect:{ healBonus:0.50 } },
                { id:'sv4', name:'Adrenaline',  cost:1, req:'sv3', desc:'+25% speed when below 30% HP',      effect:{ adrenaline:0.25 } },
                { id:'sv5', name:'Last Stand',  cost:2, req:'sv4', desc:'Survive one lethal hit (90s cd)',   effect:{ lastStand:true } },
                { id:'sv6', name:'Regeneration',cost:2, req:'sv5', desc:'+3 HP per second',                  effect:{ hpRegen:3 } },
                { id:'sv7', name:'War Machine', cost:3, req:'sv6', desc:'+50 max HP and +25 armor',          effect:{ maxHp:50, armor:25 } },
            ],
        },
        {
            name: 'ENGINEER', color: '#5555FF', icon: '⚙',
            desc: 'Explosives, gadgets and tech upgrades.',
            skills: [
                { id:'en1', name:'Demolitions', cost:1,            desc:'+35% explosive damage',             effect:{ explDmg:0.35 } },
                { id:'en2', name:'Ext. Mag',    cost:1, req:'en1', desc:'+30% ammo capacity per mag',        effect:{ ammoCapacity:0.30 } },
                { id:'en3', name:'Spd.Loader',  cost:1, req:'en2', desc:'-25% reload time',                  effect:{ reloadSpeed:0.25 } },
                { id:'en4', name:'Therm.Optic', cost:2, req:'en3', desc:'See enemies through walls on map',  effect:{ thermalOptics:true } },
                { id:'en5', name:'EMP Grenade', cost:2, req:'en4', desc:'Grenades also stun enemies 2s',     effect:{ empGrenades:true } },
                { id:'en6', name:'Overcharge',  cost:2, req:'en5', desc:'+40% dmg for 3s after reload',      effect:{ overcharge:0.40 } },
                { id:'en7', name:'Mstr.Engnr',  cost:3, req:'en6', desc:'All damage/reload bonuses +15%',    effect:{ masterEngineer:true } },
            ],
        },
    ],
};

// ─────────────────────────────────────────────────────────────────────────────

class SkillTreeManager {
    constructor() {
        this.purchased = new Set();
        this.points    = 0;

        this.bonuses = {
            accuracy:0, reloadSpeed:0, damage:0, recoil:0,
            critChance:0.05, critDmg:1.0, fireRate:0,
            maxHp:0, lootRate:0, healBonus:0, adrenaline:0,
            lastStand:false, lastStandReady:true, lastStandCD:0,
            hpRegen:0, armor:0,
            explDmg:0, ammoCapacity:0,
            thermalOptics:false, empGrenades:false, overcharge:0,
            masterEngineer:false,
        };
    }

    canBuy(skill) {
        if (this.purchased.has(skill.id))            return false;
        if (this.points < skill.cost)                return false;
        if (skill.req && !this.purchased.has(skill.req)) return false;
        return true;
    }

    isPurchased(id) { return this.purchased.has(id); }

    buy(skill) {
        if (!this.canBuy(skill)) return false;
        this.points -= skill.cost;
        this.purchased.add(skill.id);
        for (const [k, v] of Object.entries(skill.effect)) {
            if (typeof v === 'boolean')  this.bonuses[k] = v;
            else                         this.bonuses[k] = (this.bonuses[k] || 0) + v;
        }
        if (this.bonuses.masterEngineer) {
            // Retroactive bonus to all numeric skills
            this.bonuses.damage      = (this.bonuses.damage||0)      + 0.15;
            this.bonuses.reloadSpeed = (this.bonuses.reloadSpeed||0) + 0.15;
            this.bonuses.accuracy    = (this.bonuses.accuracy||0)    + 0.15;
        }
        return true;
    }

    update(dt) {
        if (this.bonuses.lastStandCD > 0) this.bonuses.lastStandCD -= dt;
        if (this.bonuses.lastStandCD <= 0 && this.bonuses.lastStand) {
            this.bonuses.lastStandReady = true;
        }
    }

    allSkills() {
        const list = [];
        for (const b of SKILL_TREE.branches) for (const s of b.skills) list.push(s);
        return list;
    }

    byId(id) { return this.allSkills().find(s => s.id === id) || null; }
}
