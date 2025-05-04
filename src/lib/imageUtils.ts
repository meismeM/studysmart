// src/lib/imageUtils.ts

// Helper function to load an image and return its base64 data URL
export const loadImageData = (url: string): Promise<string> => { // Add export
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (e) {
                reject(new Error(`Could not convert canvas to data URL: ${e}`));
            }
        };
        img.onerror = (err) => {
            console.error("Error loading image:", err)
            reject(new Error(`Failed to load image from ${url}`));
        };
        img.src = url;
    });
};

// You can add other image-related utility functions here in the future