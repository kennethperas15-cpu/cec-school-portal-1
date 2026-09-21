// Profile photos: dataURL images in localStorage (per user id), initials fallback.
const key = (id: string) => `cec:photo:${id}`;

export const getPhoto = (id: string): string | null => {
  try { return localStorage.getItem(key(id)); } catch { return null; }
};

export const setPhoto = (id: string, dataUrl: string) => {
  try { localStorage.setItem(key(id), dataUrl); } catch { /* quota — keep memory only */ }
};

export const removePhoto = (id: string) => {
  try { localStorage.removeItem(key(id)); } catch { /* ignore */ }
};

export const readPhotoFile = (file: File, maxBytes = 220 * 1024): Promise<string> =>
  new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) { reject(new Error('Image must be under 2MB.')); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? '');
      if (url.length > maxBytes * 1.4) {
        // Downscale large images via canvas so localStorage stays small
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, Math.sqrt((maxBytes * 1.33) / url.length));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(url);
        img.src = url;
      } else resolve(url);
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
