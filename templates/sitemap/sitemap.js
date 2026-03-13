
await runner.onLoad();

const results = [];
const visited = new Set();
// const queue = [{ url: 'https://nakladej.cz/web/sitemap/sitemap.xml', parents: [] }];
const queue = [{ url: 'https://www.alza.cz/_sitemap-live-product.xml', parents: [] }];

while(queue.length) {
    const { url, parents } = queue.shift();
    if(visited.has(url)) continue;
    visited.add(url);
    await console.log('visiting sitemap', url);
    try {
        const res = await runner.fetch(url);
        let text;
        // Check extension OR header for gzip
        const isGz = url.endsWith('.gz') || (res.headers.get('content-type')||'').includes('gzip');

        if(isGz) {
            try {
                const ds = new DecompressionStream('gzip');
                const stream = res.body.pipeThrough(ds);
                text = await new Response(stream).text();
            } catch(e) {
                // Fallback: re-fetch as text if decompression failed
                // (In a real app, you might handle stream cloning better)
                const retry = await runner.fetch(url);
                text = await retry.text();
            }
        } else {
            text = await res.text();
        }

        const doc = new DOMParser().parseFromString(text, 'text/xml');

        // 1. Check for Children Sitemaps (Index)
        const sitemaps = Array.from(doc.querySelectorAll('sitemap'));
        if(sitemaps.length > 0) {
            await console.log(`found ${sitemaps.length} sitemaps`)
            sitemaps.forEach(node => {
                const loc = node.querySelector('loc')?.textContent?.trim();
                if(loc) queue.push({ url: loc, parents: [...parents, url] });
            });
        } else {
            // 2. Check for Final URLs
            const urls = Array.from(doc.querySelectorAll('url'));
            await console.log(`found ${urls.length} urls`);

            urls.forEach(node => {
                const loc = node.querySelector('loc')?.textContent?.trim();
                if(loc) {
                    results.push({
                        url: loc,
                        parents: [...parents, url],
                        lastmod: node.querySelector('lastmod')?.textContent?.trim() || null,
                        changefreq: node.querySelector('changefreq')?.textContent?.trim() || null,
                        priority: node.querySelector('priority')?.textContent?.trim() || null
                    });
                }
            });
        }
    } catch(e) { console.error('Sitemap fail', url, e); }
}

await console.log(`publishing ${results.length} items`)
for(const chunk of chunkGenerator(results, 10000)) {
    await runner.publishItems(chunk.map(res => ({id: res.url, data: res})));

    //await runner.publishItems([{id: res.url, data: res}]);
}


function* chunkGenerator(array, size) {
    for (let i = 0; i < array.length; i += size) {
        yield array.slice(i, i + size);
    }
}
