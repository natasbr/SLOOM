import { MAP_WIDTH, MAP_HEIGHT, SpriteType } from './constants';

export interface PlayerState {
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    planeX: number;
    planeY: number;
    hp: number;
    score: number;
    spriteType: SpriteType;
    isAttacking: boolean;
}

export interface EnemyState {
    id: number;
    x: number;
    y: number;
    hp: number;
    type: SpriteType;
}

export interface ItemState {
    id: number;
    x: number;
    y: number;
    type: SpriteType;
}

export class GameEngine {
    map: number[][] = [];
    players: { [id: number]: PlayerState } = {};
    enemies: EnemyState[] = [];
    items: ItemState[] = [];
    private enemyIdCounter = 0;
    private itemIdCounter = 0;
    
    onCoinCollected: (playerId: number) => void;

    constructor(onCoinCollected: (playerId: number) => void) {
        this.onCoinCollected = onCoinCollected;
        this.generateMap();
        this.spawnEnemies();
        this.spawnItems();
    }

    generateMap() {
        this.map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
        for (let x = 0; x < MAP_WIDTH; x++) {
            this.map[0][x] = 1;
            this.map[MAP_HEIGHT - 1][x] = 1;
        }
        for (let y = 0; y < MAP_HEIGHT; y++) {
            this.map[y][0] = 1;
            this.map[y][MAP_WIDTH - 1] = 1;
        }
        
        // Add random blocks (favela layout)
        for (let i = 0; i < 40; i++) {
            const x = Math.floor(Math.random() * (MAP_WIDTH - 4)) + 2;
            const y = Math.floor(Math.random() * (MAP_HEIGHT - 4)) + 2;
            this.map[y][x] = Math.floor(Math.random() * 4) + 1;
            if (Math.random() > 0.5) this.map[y+1][x] = Math.floor(Math.random() * 4) + 1;
            if (Math.random() > 0.5) this.map[y][x+1] = Math.floor(Math.random() * 4) + 1;
        }
    }

    spawnEnemies() {
        const types = [SpriteType.ENEMY_PM, SpriteType.ENEMY_ZUMBI, SpriteType.ENEMY_MUTANT, SpriteType.ENEMY_BOITATA];
        for (let i = 0; i < 15; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1 + 0.5;
                y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1 + 0.5;
            } while (this.map[Math.floor(y)][Math.floor(x)] !== 0);
            
            this.enemies.push({
                id: ++this.enemyIdCounter,
                x,
                y,
                hp: 100,
                type: types[Math.floor(Math.random() * types.length)]
            });
        }
    }

    spawnItems() {
        for (let i = 0; i < 20; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1 + 0.5;
                y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1 + 0.5;
            } while (this.map[Math.floor(y)][Math.floor(x)] !== 0);
            
            this.items.push({
                id: ++this.itemIdCounter,
                x,
                y,
                type: Math.random() > 0.8 ? SpriteType.ITEM_HEALTH : SpriteType.ITEM_COIN
            });
        }
    }

    addPlayer(id: number, spriteType: SpriteType) {
        this.players[id] = {
            x: 2 + id, 
            y: 2,
            dirX: -1,
            dirY: 0,
            planeX: 0,
            planeY: 0.66,
            hp: 100,
            score: 0,
            spriteType,
            isAttacking: false
        };
    }

    removePlayer(id: number) {
        delete this.players[id];
    }

    handleInput(id: number, input: any) {
        const p = this.players[id];
        if (!p) return;

        const moveSpeed = 0.15;
        const rotSpeed = 0.1;

        if (input.up) {
            if (this.map[Math.floor(p.y)][Math.floor(p.x + p.dirX * moveSpeed)] === 0) p.x += p.dirX * moveSpeed;
            if (this.map[Math.floor(p.y + p.dirY * moveSpeed)][Math.floor(p.x)] === 0) p.y += p.dirY * moveSpeed;
        }
        if (input.down) {
            if (this.map[Math.floor(p.y)][Math.floor(p.x - p.dirX * moveSpeed)] === 0) p.x -= p.dirX * moveSpeed;
            if (this.map[Math.floor(p.y - p.dirY * moveSpeed)][Math.floor(p.x)] === 0) p.y -= p.dirY * moveSpeed;
        }
        if (input.left) {
            // rotate left
            const oldDirX = p.dirX;
            p.dirX = p.dirX * Math.cos(rotSpeed) - p.dirY * Math.sin(rotSpeed);
            p.dirY = oldDirX * Math.sin(rotSpeed) + p.dirY * Math.cos(rotSpeed);
            const oldPlaneX = p.planeX;
            p.planeX = p.planeX * Math.cos(rotSpeed) - p.planeY * Math.sin(rotSpeed);
            p.planeY = oldPlaneX * Math.sin(rotSpeed) + p.planeY * Math.cos(rotSpeed);
        }
        if (input.right) {
            // rotate right
            const oldDirX = p.dirX;
            p.dirX = p.dirX * Math.cos(-rotSpeed) - p.dirY * Math.sin(-rotSpeed);
            p.dirY = oldDirX * Math.sin(-rotSpeed) + p.dirY * Math.cos(-rotSpeed);
            const oldPlaneX = p.planeX;
            p.planeX = p.planeX * Math.cos(-rotSpeed) - p.planeY * Math.sin(-rotSpeed);
            p.planeY = oldPlaneX * Math.sin(-rotSpeed) + p.planeY * Math.cos(-rotSpeed);
        }
        
        if (input.attack) {
            p.isAttacking = true;
            // simple raycast hit scan
            this.enemies.forEach(e => {
                const dx = e.x - p.x;
                const dy = e.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 3) {
                     // Check angle
                     const angle = Math.atan2(dy, dx);
                     const pAngle = Math.atan2(p.dirY, p.dirX);
                     const diff = Math.abs(angle - pAngle);
                     if (diff < 0.5 || diff > Math.PI * 2 - 0.5) {
                         e.hp -= 25;
                     }
                }
            });
            setTimeout(() => p.isAttacking = false, 200);
        }
    }

    update() {
        // Collect items
        Object.entries(this.players).forEach(([pid, p]) => {
            for (let i = this.items.length - 1; i >= 0; i--) {
                const item = this.items[i];
                const dx = p.x - item.x;
                const dy = p.y - item.y;
                if (dx*dx + dy*dy < 0.5) {
                    if (item.type === SpriteType.ITEM_COIN) {
                        p.score += 10;
                        this.onCoinCollected(Number(pid));
                    } else if (item.type === SpriteType.ITEM_HEALTH) {
                        p.hp = Math.min(100, p.hp + 25);
                    }
                    this.items.splice(i, 1);
                }
            }
        });

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.hp > 0);
        
        // Very basic enemy AI (move randomly)
        this.enemies.forEach(e => {
            const dx = (Math.random() - 0.5) * 0.05;
            const dy = (Math.random() - 0.5) * 0.05;
            if (this.map[Math.floor(e.y)][Math.floor(e.x + dx)] === 0) e.x += dx;
            if (this.map[Math.floor(e.y + dy)][Math.floor(e.x)] === 0) e.y += dy;
        });
        
        // respawn items if too few
        if (this.items.length < 5) this.spawnItems();
        if (this.enemies.length < 5) this.spawnEnemies();
    }
}
