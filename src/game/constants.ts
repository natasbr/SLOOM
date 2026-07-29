export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 240;
export const TICK_RATE = 1000 / 20; // 20 updates per second

// 0: empty, 1-4: walls
export const MAP_WIDTH = 24;
export const MAP_HEIGHT = 24;

// Base64 Placeholder - Instructions from Prompt
// The prompt requests using a provided base64 sprite. Since I cannot access the actual base64 of the image in this environment,
// I am providing a placeholder sprite. You can replace this base64 string with your actual image base64.
export const SPRITE_SHEET_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; 

export enum SpriteType {
    PLAYER_CRIA,
    PLAYER_MOTOBOY,
    PLAYER_CAPOEIRISTA,
    PLAYER_FUNKERO,
    ENEMY_PM,
    ENEMY_ZUMBI,
    ENEMY_MUTANT,
    ENEMY_BOITATA,
    ITEM_COIN,
    ITEM_HEALTH
}
