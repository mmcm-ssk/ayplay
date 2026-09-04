const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://zxart.ee';
const LIMIT = 40;
const BASE_DIR = path.join(__dirname, 'chiptunes');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { fs.unlinkSync(dest); reject(err); });
    }).on('error', (err) => { file.close(); fs.unlinkSync(dest); reject(err); });
  });
}

function sanitize(name) {
  return name.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
}

function decodeFilename(originalUrl) {
  const match = originalUrl.match(/filename:(.+)/);
  if (match) return decodeURIComponent(match[1]);
  return path.basename(originalUrl);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node download_zxart.js <zxart.ee author URL>');
    console.log('Example: node download_zxart.js https://zxart.ee/author/205310/music');
    process.exit(1);
  }
  const url = args[0];
  const m = url.match(/\/author\/(\d+)/);
  if (!m) {
    console.error('Could not extract author ID from URL');
    process.exit(1);
  }
  return { authorId: m[1] };
}

async function getAuthorName(authorId) {
  const data = JSON.parse(await fetch(`${BASE_URL}/author-details/?id=${authorId}`));
  if (data.responseData && data.responseData.title) return data.responseData.title;
  if (data.title) return data.title;
  return null;
}

async function main() {
  const { authorId } = parseArgs();

  console.log(`Fetching author info for ID ${authorId}...`);
  const authorName = await getAuthorName(authorId);
  const authorDir = authorName ? sanitize(authorName.toLowerCase().replace(/\s+/g, '-')) : `author-${authorId}`;
  console.log(`Author: ${authorName || 'unknown'} -> chiptunes/${authorDir}/`);

  const apiUrl = `${BASE_URL}/tunes/?action=tunesByElement&elementId=${authorId}&sortColumn=year&sortDir=asc`;

  console.log('Fetching tune list...');
  const firstPage = JSON.parse(await fetch(`${apiUrl}&start=0&limit=${LIMIT}`));
  const total = firstPage.total;
  if (!total) { console.log('No tunes found.'); return; }
  console.log(`Total tunes: ${total}`);

  let allItems = firstPage.items;
  for (let start = LIMIT; start < total; start += LIMIT) {
    process.stdout.write(`\rFetching page ${Math.floor(start / LIMIT) + 1}...`);
    const page = JSON.parse(await fetch(`${apiUrl}&start=${start}&limit=${LIMIT}`));
    allItems = allItems.concat(page.items);
  }
  console.log(`\rFetched ${allItems.length} tunes         `);

  let downloaded = 0, skipped = 0, failed = 0;

  for (const item of allItems) {
    if (!item.originalFileUrl) { skipped++; continue; }

    const filename = decodeFilename(item.originalFileUrl);
    const year = item.year || 'unknown';
    const dest = path.join(BASE_DIR, authorDir, String(year), filename);

    if (fs.existsSync(dest)) { skipped++; continue; }

    try {
      const fullUrl = item.originalFileUrl.startsWith('http') ? item.originalFileUrl : BASE_URL + item.originalFileUrl;
      await downloadFile(fullUrl, dest);
      downloaded++;
      console.log(`[${downloaded + skipped + failed}/${allItems.length}] OK: ${filename} -> ${year}/`);
    } catch (err) {
      failed++;
      console.error(`[${downloaded + skipped + failed}/${allItems.length}] FAIL: ${filename} - ${err.message}`);
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
