/**
 * Utility to process and compress images to Base64
 * Ensures images fit nicely in localStorage/JSON backups (~50-150KB)
 */
export function processImageFileToBase64(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // Calculate proportional dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to raw data url if canvas context fails
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw and compress to JPEG
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Falha ao processar a imagem.'));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo de imagem.'));
    };

    reader.readAsDataURL(file);
  });
}
