/**
 * Cross-platform image picker that:
 *  - On web: uses a native <input type="file"> so any PNG/JPG/WebP works natively
 *  - On native: uses expo-image-picker
 *  - Always client-side resizes to max 1400px wide (via canvas on web, via
 *    `manipulateAsync` on native) to keep the base64 payload small
 *  - Preserves the real MIME type (no more hard-coded image/jpeg)
 *
 * Returns a `data:<mime>;base64,...` URI that can be stored directly.
 */
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1400;
const QUALITY = 0.82;

function inferMime(uri: string, fallback = 'image/jpeg'): string {
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (!ext) return fallback;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return fallback;
}

/** Resize + re-encode a file (web) and return `{dataUri, mime}`. */
function webPickAndEncode(): Promise<{ dataUri: string; mime: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        document.body.removeChild(input);
        return resolve(null);
      }
      try {
        const dataUri = await resizeWeb(file);
        document.body.removeChild(input);
        resolve({ dataUri, mime: dataUri.split(';')[0].slice(5) });
      } catch (e) {
        console.error('image resize failed', e);
        // fall-back: read original file as base64
        const reader = new FileReader();
        reader.onload = () => {
          document.body.removeChild(input);
          const r = reader.result as string;
          resolve({ dataUri: r, mime: file.type || 'image/jpeg' });
        };
        reader.onerror = () => {
          document.body.removeChild(input);
          resolve(null);
        };
        reader.readAsDataURL(file);
      }
    };
    document.body.appendChild(input);
    input.click();
  });
}

function resizeWeb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('no canvas ctx');
        ctx.drawImage(img, 0, 0, w, h);
        // keep PNG if source is PNG (transparency) — else JPEG to save bytes
        const isPng = (file.type || '').toLowerCase() === 'image/png';
        const outMime = isPng ? 'image/png' : 'image/jpeg';
        const dataUri = canvas.toDataURL(outMime, QUALITY);
        resolve(dataUri);
      };
      img.onerror = () => reject('image decode failed');
      img.src = src;
    };
    reader.onerror = () => reject('file read failed');
    reader.readAsDataURL(file);
  });
}

async function nativePickAndEncode(): Promise<{ dataUri: string; mime: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
    base64: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const mime = asset.mimeType || inferMime(asset.uri);
  // Resize natively to keep payload small. Preserve PNG for transparency.
  const isPng = mime.toLowerCase() === 'image/png';
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      asset.width && asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [],
      {
        compress: QUALITY,
        format: isPng ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    const outMime = isPng ? 'image/png' : 'image/jpeg';
    return { dataUri: `data:${outMime};base64,${manipulated.base64}`, mime: outMime };
  } catch {
    // fall-back: if manipulate isn't available, fetch + base64
    const r2 = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (r2.canceled || !r2.assets?.[0]) return null;
    const a = r2.assets[0];
    return { dataUri: `data:${mime};base64,${a.base64}`, mime };
  }
}

export async function pickAndEncodeImage(): Promise<string | null> {
  const result =
    Platform.OS === 'web' ? await webPickAndEncode() : await nativePickAndEncode();
  return result?.dataUri ?? null;
}
