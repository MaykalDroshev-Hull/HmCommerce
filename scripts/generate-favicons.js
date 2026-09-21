const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const source = path.join(__dirname, '../public/apple-touch-icon.png');
  const publicDir = path.join(__dirname, '../public');
  const appDir = path.join(__dirname, '../app');

  console.log('Using source icon:', source);

  // 1. Generate PNG sizes
  const sizes = [
    { name: 'icon-48x48.png', size: 48 },
    { name: 'icon-96x96.png', size: 96 },
    { name: 'icon-144x144.png', size: 144 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    const dest = path.join(publicDir, name);
    await sharp(source)
      .resize(size, size, { kernel: 'lanczos3', fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // 2. Overwrite icon.png (in both public and app) with 96x96 (multiple of 48)
  const icon96Buffer = await sharp(source)
    .resize(96, 96, { kernel: 'lanczos3', fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon96Buffer);
  fs.writeFileSync(path.join(appDir, 'icon.png'), icon96Buffer);
  console.log('Updated public/icon.png and app/icon.png to 96x96 (Google-compliant multiple of 48)');

  // 3. Generate multi-resolution ICO (16x16, 32x32, 48x48)
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];

  for (const s of icoSizes) {
    const buf = await sharp(source)
      .resize(s, s, { kernel: 'lanczos3', fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);

    offset += item.buffer.length;
    dirEntries.push(entry);
  }

  const finalIco = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), finalIco);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), finalIco);
  console.log('Updated public/favicon.ico and app/favicon.ico with 16x16, 32x32, and 48x48 layers');

  // 4. Generate manifest.json
  const manifest = {
    name: 'MB-Paws',
    short_name: 'MB-Paws',
    description: 'Minimalist, high-performance canine gear engineered for durability, comfort, and everyday adventure.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#171717',
    icons: [
      {
        src: '/icon-48x48.png',
        sizes: '48x48',
        type: 'image/png'
      },
      {
        src: '/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png'
      },
      {
        src: '/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  fs.writeFileSync(
    path.join(publicDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Generated public/manifest.json with all icon definitions');
}

generateFavicons().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
