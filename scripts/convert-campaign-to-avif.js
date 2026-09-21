const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertCampaign() {
  const campaignDir = path.join(__dirname, '../public/campaign');
  const files = fs.readdirSync(campaignDir);

  const imageFiles = files.filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));

  console.log(`Found ${imageFiles.length} campaign images to convert.`);

  let totalOriginal = 0;
  let totalAvif = 0;

  for (const file of imageFiles) {
    const inputPath = path.join(campaignDir, file);
    const baseName = file.replace(/\.[^/.]+$/, '');
    const outputPath = path.join(campaignDir, `${baseName}.avif`);

    const origBuffer = fs.readFileSync(inputPath);
    const origSize = origBuffer.length;

    const avifBuffer = await sharp(origBuffer)
      .rotate()
      .avif({
        quality: 75,
        effort: 4,
        chromaSubsampling: '4:2:0',
      })
      .toBuffer();

    const avifSize = avifBuffer.length;
    fs.writeFileSync(outputPath, avifBuffer);

    totalOriginal += origSize;
    totalAvif += avifSize;

    const saved = origSize - avifSize;
    const percent = ((saved / origSize) * 100).toFixed(1);

    console.log(`✓ ${file} -> ${baseName}.avif | ${(origSize / 1024).toFixed(1)} KB -> ${(avifSize / 1024).toFixed(1)} KB (-${percent}%)`);
  }

  const totalSaved = totalOriginal - totalAvif;
  const overallPercent = ((totalSaved / totalOriginal) * 100).toFixed(1);

  console.log('--------------------------------------------------');
  console.log(`Total Original: ${(totalOriginal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total AVIF: ${(totalAvif / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Saved: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB (-${overallPercent}%)`);
}

convertCampaign().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
