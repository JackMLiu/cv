// Generates optimized web images from the source photos. Run: npm run assets
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const out = new URL('../images/web/', import.meta.url);
await mkdir(out, { recursive: true });
const src = (name) => new URL(`../images/${name}`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const dest = (name) => new URL(name, out).pathname.replace(/^\/(\w:)/, '$1');

// Portrait: 4:5 crop centred on the face.
const portrait = sharp(src('profile.jpg')).extract({ left: 341, top: 0, width: 1038, height: 1297 });
for (const w of [640, 1040]) {
  await portrait.clone().resize(w).webp({ quality: 80 }).toFile(dest(`portrait-${w}.webp`));
}
await portrait.clone().resize(1040).jpeg({ quality: 82, mozjpeg: true }).toFile(dest('portrait-1040.jpg'));

// Latte art: square thumbnails and larger lightbox versions.
for (let i = 1; i <= 4; i++) {
  const name = `LatteArt0${i}.jpg`;
  await sharp(src(name)).rotate().resize(600, 600, { fit: 'cover' }).webp({ quality: 78 }).toFile(dest(`latte-${i}-thumb.webp`));
  await sharp(src(name)).rotate().resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest(`latte-${i}.webp`));
}

// Side project screenshots (phone-sized captures).
await sharp(src('papernils-home.png')).resize(520).webp({ quality: 82 }).toFile(dest('papernils-home.webp'));

console.log('Assets written to images/web/');
