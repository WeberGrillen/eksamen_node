// util/imageUtil.js

export function resizeImage(file, maxSize = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file selected'));
            return;
        }

        if (!file.type.startsWith('image/')) {
            reject(new Error('Please select an image file'));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                const scale = Math.min(
                    1,
                    maxSize / Math.max(img.width, img.height)
                );

                const canvas = document.createElement('canvas');

                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const context = canvas.getContext('2d');

                if (!context) {
                    reject(new Error('Could not process image'));
                    return;
                }

                context.drawImage(
                    img,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                const imageData = canvas.toDataURL(
                    'image/jpeg',
                    quality
                );

                resolve(imageData);
            };

            img.onerror = () => {
                reject(new Error('Could not load image'));
            };

            img.src = reader.result;
        };

        reader.onerror = () => {
            reject(new Error('Could not read file'));
        };

        reader.readAsDataURL(file);
    });
}