import { SpriteType } from './constants';

export const TEXTURE_SIZE = 64;

export const wallTextures: HTMLCanvasElement[] = [];
export const spriteTextures: Record<SpriteType, HTMLCanvasElement> = {} as any;

export const initTextures = () => {
    // Generate simple brick-like wall textures
    for (let i = 0; i < 4; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_SIZE;
        canvas.height = TEXTURE_SIZE;
        const ctx = canvas.getContext('2d')!;
        
        // Base color (Favela brick colors: orange, brown, grey, reddish)
        const colors = ['#A0522D', '#CD853F', '#8B4513', '#708090'];
        ctx.fillStyle = colors[i];
        ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
        
        // Draw bricks
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        for (let y = 0; y < TEXTURE_SIZE; y += 16) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(TEXTURE_SIZE, y);
            ctx.stroke();
            const offset = (y / 16) % 2 === 0 ? 0 : 16;
            for (let x = offset; x < TEXTURE_SIZE; x += 32) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + 16);
                ctx.stroke();
            }
        }
        wallTextures.push(canvas);
    }

    // Generate emoji sprites
    const createEmojiSprite = (emoji: string, type: SpriteType) => {
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_SIZE;
        canvas.height = TEXTURE_SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 5); // Slight offset for baseline
        spriteTextures[type] = canvas;
    };

    createEmojiSprite('👦', SpriteType.PLAYER_CRIA);
    createEmojiSprite('🛵', SpriteType.PLAYER_MOTOBOY);
    createEmojiSprite('🤸', SpriteType.PLAYER_CAPOEIRISTA);
    createEmojiSprite('🕺', SpriteType.PLAYER_FUNKERO);
    
    createEmojiSprite('👮', SpriteType.ENEMY_PM);
    createEmojiSprite('🧟', SpriteType.ENEMY_ZUMBI);
    createEmojiSprite('🦀', SpriteType.ENEMY_MUTANT);
    createEmojiSprite('🐉', SpriteType.ENEMY_BOITATA);
    
    createEmojiSprite('💰', SpriteType.ITEM_COIN);
    createEmojiSprite('❤️', SpriteType.ITEM_HEALTH);
};
