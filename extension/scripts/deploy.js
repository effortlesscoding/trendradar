#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', 'manifest.json'), 'utf8'));
const version = manifest.version;
const zipName = `trendradar-extension-v${version}.zip`;
const distDir = path.join(root, 'dist');
const zipPath = path.join(distDir, zipName);
const buildDir = path.join(root, 'build');

if (!fs.existsSync(buildDir)) {
  console.error('Error: build/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

fs.mkdirSync(distDir, { recursive: true });

console.log(`Zipping build/ → dist/${zipName}`);

async function zip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(buildDir, false);
    archive.finalize();
  });
}

async function upload() {
  const fileStream = fs.createReadStream(zipPath);
  const fileSize = fs.statSync(zipPath).size;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'transfer.sh',
      path: `/${zipName}`,
      method: 'PUT',
      headers: {
        'Content-Length': fileSize,
        'Content-Type': 'application/zip',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body.trim());
        } else {
          reject(new Error(`Upload failed: HTTP ${res.statusCode}\n${body}`));
        }
      });
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });
}

await zip();
console.log('Uploading to transfer.sh...');
const url = await upload();
console.log(`\n✓ ${url}\n`);
