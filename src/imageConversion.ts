
import { MSX_PALETTE } from '../constants';
import type { RGBColor } from '../types';

export const colorDistance = (c1: RGBColor, c2: RGBColor): number => {
    const rDiff = c1.r - c2.r;
    const gDiff = c1.g - c2.g;
    const bDiff = c1.b - c2.b;
    return rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
};

export const findClosestMsxColor = (color: RGBColor): RGBColor => {
    let minDistance = Infinity;
    let closestColor = MSX_PALETTE[0];

    for (const msxColor of MSX_PALETTE) {
        const distance = colorDistance(color, msxColor);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = msxColor;
        }
    }
    return closestColor;
};

export const convertImageToMSXScreen2 = (imageData: ImageData): ImageData => {
    const { width, height, data } = imageData;
    const newImageData = new ImageData(width, height);
    const newData = newImageData.data;
    const offsets = [-2, -1, 0, 1, 2];

    for (let y = 0; y < height; y += 8) {
        for (let x = 0; x < width; x += 8) {
            let bestTileData: Uint8ClampedArray | null = null;
            let minError = Infinity;

            for (const offset of offsets) {
                const currentTileData = new Uint8ClampedArray(8 * 8 * 4);
                let currentError = 0;

                for (let row = 0; row < 8; row++) {
                    const currentY = y + row;
                    if (currentY >= height) continue;

                    const rowPixels: RGBColor[] = [];
                    for (let col = 0; col < 8; col++) {
                        const currentX = x + col + offset;
                        if (currentX < 0 || currentX >= width) {
                            rowPixels.push({ r: 0, g: 0, b: 0 }); // Pad with black
                            continue;
                        };

                        const i = (currentY * width + currentX) * 4;
                        rowPixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
                    }

                    const colorCounts = new Map<string, { color: RGBColor, count: number }>();
                    for (const pixel of rowPixels) {
                        const closest = findClosestMsxColor(pixel);
                        const key = `${closest.r},${closest.g},${closest.b}`;
                        const existing = colorCounts.get(key);
                        if (existing) {
                            existing.count++;
                        } else {
                            colorCounts.set(key, { color: closest, count: 1 });
                        }
                    }

                    const sortedColors = [...colorCounts.values()].sort((a, b) => b.count - a.count);
                    const color1 = sortedColors[0]?.color || MSX_PALETTE[0];
                    const color2 = sortedColors[1]?.color || color1;

                    for (let col = 0; col < 8; col++) {
                        const originalColor = rowPixels[col];
                        const dist1 = colorDistance(originalColor, color1);
                        const dist2 = colorDistance(originalColor, color2);
                        const finalColor = dist1 < dist2 ? color1 : color2;

                        currentError += Math.min(dist1, dist2);

                        const i = (row * 8 + col) * 4;
                        currentTileData[i] = finalColor.r;
                        currentTileData[i + 1] = finalColor.g;
                        currentTileData[i + 2] = finalColor.b;
                        currentTileData[i + 3] = 255;
                    }
                }

                if (currentError < minError) {
                    minError = currentError;
                    bestTileData = currentTileData;
                }
            }

            if (bestTileData) {
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const currentY = y + row;
                        const currentX = x + col;
                        if (currentY >= height || currentX >= width) continue;

                        const tileIndex = (row * 8 + col) * 4;
                        const imageIndex = (currentY * width + currentX) * 4;

                        newData[imageIndex] = bestTileData[tileIndex];
                        newData[imageIndex + 1] = bestTileData[tileIndex + 1];
                        newData[imageIndex + 2] = bestTileData[tileIndex + 2];
                        newData[imageIndex + 3] = bestTileData[tileIndex + 3];
                    }
                }
            }
        }
    }

    return newImageData;
};
