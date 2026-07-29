import { SCREEN_WIDTH, SCREEN_HEIGHT, SpriteType } from './constants';
import { wallTextures, spriteTextures, TEXTURE_SIZE } from './Textures';

export const renderPOV = (
    ctx: CanvasRenderingContext2D,
    map: number[][],
    player: { x: number, y: number, dirX: number, dirY: number, planeX: number, planeY: number },
    sprites: { x: number, y: number, type: SpriteType }[],
    showHUD: boolean = false
) => {
    // Clear floor and ceiling
    ctx.fillStyle = '#444'; // Ceiling
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
    ctx.fillStyle = '#333'; // Floor
    ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);

    const zBuffer: number[] = new Array(SCREEN_WIDTH).fill(0);

    // 1. Raycast Walls
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        const cameraX = 2 * x / SCREEN_WIDTH - 1; // x-coordinate in camera space
        const rayDirX = player.dirX + player.planeX * cameraX;
        const rayDirY = player.dirY + player.planeY * cameraX;

        let mapX = Math.floor(player.x);
        let mapY = Math.floor(player.y);

        let sideDistX, sideDistY;

        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);
        let perpWallDist;

        let stepX, stepY;
        let hit = 0;
        let side = 0;

        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (player.x - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
        }
        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (player.y - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
        }

        while (hit === 0) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }
            if (map[mapY] && map[mapY][mapX] > 0) hit = 1;
        }

        if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
        else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;

        const lineHeight = Math.floor(SCREEN_HEIGHT / perpWallDist);
        let drawStart = -lineHeight / 2 + SCREEN_HEIGHT / 2;
        if (drawStart < 0) drawStart = 0;
        let drawEnd = lineHeight / 2 + SCREEN_HEIGHT / 2;
        if (drawEnd >= SCREEN_HEIGHT) drawEnd = SCREEN_HEIGHT - 1;

        const texNum = map[mapY][mapX] - 1;
        let wallX;
        if (side === 0) wallX = player.y + perpWallDist * rayDirY;
        else wallX = player.x + perpWallDist * rayDirX;
        wallX -= Math.floor(wallX);

        let texX = Math.floor(wallX * TEXTURE_SIZE);
        if (side === 0 && rayDirX > 0) texX = TEXTURE_SIZE - texX - 1;
        if (side === 1 && rayDirY < 0) texX = TEXTURE_SIZE - texX - 1;

        const texture = wallTextures[texNum] || wallTextures[0];
        if (texture) {
            ctx.drawImage(
                texture,
                texX, 0, 1, TEXTURE_SIZE,
                x, drawStart, 1, drawEnd - drawStart
            );
            // simple shading
            if (side === 1) {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
            }
        }
        zBuffer[x] = perpWallDist;
    }

    // 2. Render Sprites
    const sortedSprites = [...sprites].sort((a, b) => {
        const distA = Math.pow(player.x - a.x, 2) + Math.pow(player.y - a.y, 2);
        const distB = Math.pow(player.x - b.x, 2) + Math.pow(player.y - b.y, 2);
        return distB - distA; // far to close
    });

    for (let i = 0; i < sortedSprites.length; i++) {
        const sprite = sortedSprites[i];
        const spriteX = sprite.x - player.x;
        const spriteY = sprite.y - player.y;

        const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
        const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
        const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

        if (transformY > 0) {
            const spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
            const spriteHeight = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
            
            let drawStartY = -spriteHeight / 2 + SCREEN_HEIGHT / 2;
            if (drawStartY < 0) drawStartY = 0;
            let drawEndY = spriteHeight / 2 + SCREEN_HEIGHT / 2;
            if (drawEndY >= SCREEN_HEIGHT) drawEndY = SCREEN_HEIGHT - 1;

            const spriteWidth = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
            let drawStartX = -spriteWidth / 2 + spriteScreenX;
            if (drawStartX < 0) drawStartX = 0;
            let drawEndX = spriteWidth / 2 + spriteScreenX;
            if (drawEndX >= SCREEN_WIDTH) drawEndX = SCREEN_WIDTH - 1;

            const tex = spriteTextures[sprite.type];
            if (tex) {
                // Not a per-pixel z-buffer for sprites in canvas, so we clip by drawing slices
                for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
                    const texX = Math.floor(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * TEXTURE_SIZE / spriteWidth) / 256;
                    if (transformY > 0 && stripe > 0 && stripe < SCREEN_WIDTH && transformY < zBuffer[stripe]) {
                        ctx.drawImage(
                            tex,
                            texX, 0, 1, TEXTURE_SIZE,
                            stripe, drawStartY, 1, drawEndY - drawStartY
                        );
                    }
                }
            }
        }
    }
    
    // Crosshair
    if (showHUD) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(SCREEN_WIDTH/2 - 10, SCREEN_HEIGHT/2 - 1, 20, 2);
        ctx.fillRect(SCREEN_WIDTH/2 - 1, SCREEN_HEIGHT/2 - 10, 2, 20);
    }
};
