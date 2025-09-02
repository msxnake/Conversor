
import React, { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { MSX_PALETTE } from './constants';
import type { RGBColor } from './types';
import { convertImageToMSXScreen2, findClosestMsxColor } from './src/imageConversion';
import { ColorSubstitutionPanel } from './src/ColorSubstitutionPanel';

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ConvertIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 12L3 12m4 4l4-4m6 8v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3m10 0l-4-4m4 4l4-4" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-msx-accent"></div>
);

const ImagePreview: React.FC<{ title: string; imageSrc: string | null; isLoading?: boolean }> = ({ title, imageSrc, isLoading = false }) => (
    <div className="bg-msx-panel border border-msx-border rounded-lg p-4 flex flex-col items-center justify-center w-full h-full min-h-[300px] md:min-h-0">
        <h3 className="text-lg font-bold text-msx-accent mb-4">{title}</h3>
        <div className="flex-grow flex items-center justify-center w-full bg-black/20 rounded-md overflow-hidden">
            {isLoading ? (
                <LoadingSpinner />
            ) : imageSrc ? (
                <img src={imageSrc} alt={title} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }}/>
            ) : (
                <p className="text-msx-text-dim">No image</p>
            )}
        </div>
    </div>
);


export default function App() {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const [convertedImage, setConvertedImage] = useState<string | null>(null);
    const [convertedImageData, setConvertedImageData] = useState<ImageData | null>(null);
    const [targetWidth, setTargetWidth] = useState<number>(256);
    const [targetHeight, setTargetHeight] = useState<number>(192);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showColorSubPanel, setShowColorSubPanel] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setOriginalImage(e.target?.result as string);
                setConvertedImage(null);
                setConvertedImageData(null);
                setError(null);
                setCrop(undefined); // Reset crop on new image
                setCompletedCrop(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConvert = useCallback(async (conversionType: 'sprite' | 'screen2') => {
        if (!originalImage || !completedCrop || !imgRef.current) {
            setError('Please upload an image and select a crop area first.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setConvertedImage(null);
        setConvertedImageData(null);

        await new Promise(resolve => setTimeout(resolve, 50)); // Allow UI to update

        try {
            const image = imgRef.current;
            const canvas = document.createElement('canvas');
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            const cropX = completedCrop.x * scaleX;
            const cropY = completedCrop.y * scaleY;
            const cropWidth = completedCrop.width * scaleX;
            const cropHeight = completedCrop.height * scaleY;

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropWidth;
            cropCanvas.height = cropHeight;
            const cropCtx = cropCanvas.getContext('2d');
            if (!cropCtx) {
                throw new Error('Could not get crop canvas context');
            }

            cropCtx.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Could not get canvas context');
            }
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(cropCanvas, 0, 0, targetWidth, targetHeight);

            let imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            
            if (conversionType === 'screen2') {
                imageData = convertImageToMSXScreen2(imageData);
            } else {
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const closestColor = findClosestMsxColor({ r, g, b });
                    
                    data[i] = closestColor.r;
                    data[i + 1] = closestColor.g;
                    data[i + 2] = closestColor.b;
                    data[i+3] = 255;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            setConvertedImageData(imageData);
            setConvertedImage(canvas.toDataURL('image/png'));
            setIsLoading(false);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during conversion.');
            setIsLoading(false);
        }

    }, [originalImage, completedCrop, targetWidth, targetHeight]);

    const handleDownload = () => {
        if (!convertedImage) return;
        const link = document.createElement('a');
        link.href = convertedImage;
        link.download = `msx-image-${targetWidth}x${targetHeight}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleColorSubstitution = (colorMap: Map<string, RGBColor>) => {
        if (!convertedImageData) return;

        const newImageData = new ImageData(convertedImageData.width, convertedImageData.height);
        const data = newImageData.data;
        const oldData = convertedImageData.data;

        const toKey = (r: number, g: number, b: number) => `${r},${g},${b}`;

        for (let i = 0; i < oldData.length; i += 4) {
            const key = toKey(oldData[i], oldData[i+1], oldData[i+2]);
            const newColor = colorMap.get(key);
            if (newColor) {
                data[i] = newColor.r;
                data[i + 1] = newColor.g;
                data[i + 2] = newColor.b;
                data[i + 3] = 255;
            } else {
                data[i] = oldData[i];
                data[i + 1] = oldData[i+1];
                data[i + 2] = oldData[i+2];
                data[i + 3] = oldData[i+3];
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = newImageData.width;
        canvas.height = newImageData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.putImageData(newImageData, 0, 0);
            setConvertedImage(canvas.toDataURL('image/png'));
            setConvertedImageData(newImageData);
        }
    };

    return (
        <div className="min-h-screen bg-msx-bg font-sans p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-7xl">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wide">
                        MSX <span className="text-msx-accent">Retro Image</span> Converter
                    </h1>
                    <p className="text-msx-text-dim mt-2 max-w-2xl mx-auto">
                        Convert high-resolution images to pixel-perfect, MSX-palette images without blurring.
                    </p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Controls Column */}
                    <div className="lg:col-span-1 bg-msx-panel rounded-lg border border-msx-border p-6 space-y-6 self-start">
                        {/* 1. Upload */}
                        <div>
                            <h2 className="text-xl font-semibold mb-3 text-msx-accent">1. Upload Image</h2>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200"
                            >
                                <UploadIcon className="w-6 h-6 mr-2" />
                                Select Image File
                            </button>
                        </div>
                        
                        {/* 2. Settings */}
                        <div>
                            <h2 className="text-xl font-semibold mb-3 text-msx-accent">2. Set Dimensions</h2>
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <label htmlFor="width" className="block text-sm font-medium text-msx-text-dim mb-1">Width</label>
                                    <input
                                        type="number"
                                        id="width"
                                        value={targetWidth}
                                        onChange={(e) => setTargetWidth(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-msx-bg border border-msx-border rounded-md p-2 text-center text-white focus:ring-2 focus:ring-msx-accent focus:border-msx-accent"
                                    />
                                </div>
                                 <span className="text-msx-text-dim pt-6">x</span>
                                <div className="flex-1">
                                    <label htmlFor="height" className="block text-sm font-medium text-msx-text-dim mb-1">Height</label>
                                    <input
                                        type="number"
                                        id="height"
                                        value={targetHeight}
                                        onChange={(e) => setTargetHeight(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-msx-bg border border-msx-border rounded-md p-2 text-center text-white focus:ring-2 focus:ring-msx-accent focus:border-msx-accent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Convert */}
                        <div>
                            <h2 className="text-xl font-semibold mb-3 text-msx-accent">3. Process</h2>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleConvert('sprite')}
                                    disabled={!originalImage || !completedCrop || isLoading}
                                    className="w-full bg-msx-accent hover:bg-msx-accent-hover text-black font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    <ConvertIcon className="w-6 h-6 mr-2" />
                                    {isLoading ? 'Converting...' : 'Convert to MSX Sprite'}
                                </button>
                                <button
                                    onClick={() => handleConvert('screen2')}
                                    disabled={!originalImage || !completedCrop || isLoading}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    <ConvertIcon className="w-6 h-6 mr-2" />
                                    {isLoading ? 'Converting...' : 'Convert to Screen 2'}
                                </button>
                            </div>
                             {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
                        </div>

                        {/* MSX Palette Display */}
                        <div>
                            <h3 className="text-lg font-semibold text-msx-text mb-3">MSX Palette</h3>
                            <div className="grid grid-cols-8 gap-2">
                                {MSX_PALETTE.map((color, index) => (
                                    <div
                                        key={index}
                                        className="w-full aspect-square rounded"
                                        style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                                        title={`RGB(${color.r}, ${color.g}, ${color.b})`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Previews Column */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-msx-panel border border-msx-border rounded-lg p-4 flex flex-col items-center justify-center w-full h-full min-h-[300px] md:min-h-0">
                            <h3 className="text-lg font-bold text-msx-accent mb-4">Original Image</h3>
                            <div className="flex-grow flex items-center justify-center w-full bg-black/20 rounded-md overflow-hidden">
                                {originalImage ? (
                                    <ReactCrop
                                        crop={crop}
                                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                                        onComplete={(c) => setCompletedCrop(c)}
                                        aspect={targetWidth / targetHeight}
                                        className="max-w-full max-h-full"
                                    >
                                        <img
                                            ref={imgRef}
                                            src={originalImage}
                                            alt="Original"
                                            className="max-w-full max-h-full object-contain"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                    </ReactCrop>
                                ) : (
                                    <p className="text-msx-text-dim">Upload an image to begin</p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                           <ImagePreview title="MSX Image Preview" imageSrc={convertedImage} isLoading={isLoading} />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownload}
                                    disabled={!convertedImage || isLoading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    <DownloadIcon className="w-6 h-6 mr-2" />
                                    Download Image
                                </button>
                                <button
                                    onClick={() => setShowColorSubPanel(true)}
                                    disabled={!convertedImage || isLoading}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    Substitute Colors
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                {showColorSubPanel && (
                    <ColorSubstitutionPanel
                        imageData={convertedImageData}
                        onSubstitute={handleColorSubstitution}
                        onClose={() => setShowColorSubPanel(false)}
                    />
                )}
            </div>
        </div>
    );
}
