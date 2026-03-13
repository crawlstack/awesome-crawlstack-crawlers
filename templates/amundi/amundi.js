
await runner.onLoad();
await new Promise(r => setTimeout(r, 5000));

await runner.enableDownloads();

const button = runner.getByTextDeep('DOWNLOAD THE FULL FUND HOLDINGS');
if (!button) throw new Error('Download button not found');

await runner.humanScrollInView(button);
await new Promise(r => setTimeout(r, 1000));
await runner.humanClick(button);

const download = await runner.waitFor(async () => {
    const { files } = await runner.getDownloads();
    return files.find(f => f.status === 'done');
}, { timeoutMs: 60000, interval: 2000 });

console.log('File intercepted:', download.url);

// 1. Load XLSX via script injection
console.log('Loading XLSX library...');
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
document.head.appendChild(script);
await new Promise(r => script.onload = r);
const XLSX = window.XLSX;

// 2. Read and parse
console.log('Fetching file data...');
const response = await fetch(download.url);
const arrayBuffer = await response.arrayBuffer();

console.log('Parsing XLSX...');
const data = new Uint8Array(arrayBuffer);
const workbook = XLSX.read(data, { type: 'array' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 3. Convert to JSON and find header
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
let headerIndex = rawData.findIndex(row =>
    row && Array.isArray(row) &&
    row.some(cell => String(cell).toLowerCase().includes('name')) &&
    row.some(cell => String(cell).toLowerCase().includes('weight'))
);

if (headerIndex === -1) headerIndex = 0;

const headers = rawData[headerIndex];
const records = rawData.slice(headerIndex + 1)
    .filter(row => row.length >= 2)
    .map((row, index) => {
        const item = {};
        headers.forEach((h, i) => {
            if (h) {
                const key = String(h).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').trim();
                item[key] = row[i];
            }
        });
        return {
            id: 'holding-' + (item['ISIN_code'] || item['Name'] || index),
            data: item
        };
    });

console.log(`Extracted ${records.length} items.`);

// 4. Publish results
await runner.publishItems(records);
