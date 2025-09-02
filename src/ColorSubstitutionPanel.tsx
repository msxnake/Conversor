import React, { useState, useEffect } from 'react';
import { MSX_PALETTE } from '../constants';
import type { RGBColor } from '../types';

interface ColorSubstitutionPanelProps {
    imageData: ImageData | null;
    onSubstitute: (colorMap: Map<string, RGBColor>) => void;
    onClose: () => void;
}

const toKey = (c: RGBColor) => `${c.r},${c.g},${c.b}`;

export const ColorSubstitutionPanel: React.FC<ColorSubstitutionPanelProps> = ({ imageData, onSubstitute, onClose }) => {
    const [uniqueColors, setUniqueColors] = useState<RGBColor[]>([]);
    const [colorMap, setColorMap] = useState<Map<string, RGBColor>>(new Map());

    useEffect(() => {
        if (!imageData) return;

        const colors = new Map<string, RGBColor>();
        const { data } = imageData;
        for (let i = 0; i < data.length; i += 4) {
            const color = { r: data[i], g: data[i + 1], b: data[i + 2] };
            const key = toKey(color);
            if (!colors.has(key)) {
                colors.set(key, color);
            }
        }
        const newUniqueColors = Array.from(colors.values());
        setUniqueColors(newUniqueColors);

        const newColorMap = new Map<string, RGBColor>();
        for (const color of newUniqueColors) {
            newColorMap.set(toKey(color), color);
        }
        setColorMap(newColorMap);
    }, [imageData]);

    const handleColorChange = (oldColor: RGBColor, newColor: RGBColor) => {
        const newColorMap = new Map(colorMap);
        newColorMap.set(toKey(oldColor), newColor);
        setColorMap(newColorMap);
    };

    const handleApply = () => {
        onSubstitute(colorMap);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-msx-panel border border-msx-border rounded-lg p-6 space-y-4 max-w-md w-full">
                <h2 className="text-xl font-semibold text-msx-accent">Substitute Colors</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {uniqueColors.map((color) => (
                        <div key={toKey(color)} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-8 h-8 rounded border-2 border-white"
                                    style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                                />
                                <span className="text-white">{`rgb(${color.r}, ${color.g}, ${color.b})`}</span>
                            </div>
                            <select
                                value={toKey(colorMap.get(toKey(color))!)}
                                onChange={(e) => {
                                    const newColor = MSX_PALETTE.find(c => toKey(c) === e.target.value)!;
                                    handleColorChange(color, newColor);
                                }}
                                className="bg-msx-bg border border-msx-border rounded-md p-2 text-white"
                            >
                                {MSX_PALETTE.map(c => (
                                    <option key={toKey(c)} value={toKey(c)}>
                                        {`rgb(${c.r}, ${c.g}, ${c.b})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded">
                        Cancel
                    </button>
                    <button onClick={handleApply} className="bg-msx-accent hover:bg-msx-accent-hover text-black font-bold py-2 px-4 rounded">
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};