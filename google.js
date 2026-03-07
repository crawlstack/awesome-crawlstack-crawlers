await runner.onLoad();

const results = [...document.querySelectorAll('[data-rpos]')];

for(const result of results) {

    const primaryLink = result.querySelector('h3').parentNode;
    const url = primaryLink?.href;

    await runner.publishItems([
        {
            id: url, // id required for deduplication
            data: { title: primaryLink?.innerText, url }, // custom data
        }
    ]);

    const secondaryLinks = [...result.querySelectorAll('a')];

    for(const secondary of secondaryLinks) {
        if(secondary === primaryLink) {
            continue;
        }

        const url = secondary.href;
        await runner.publishItems([
            {
                id: url, // id required for deduplication
                data: { title: secondary?.innerText, url }, // custom data
            }
        ]);
    }

}


// 2. Next links to crawl
await runner.addTasks([
    {
        href: 'https://example.com/next-page',
        changefreq: 'never'
    }
]);