
await runner.onLoad();


const stats = {
    allLinks: 0,
    filteredLinks: 0,
    paginationPages: 0,
}


const currentPage = await runner.getCurrentTask();

if(currentrunner.rawLink.ctx === 'product-page') {
    console.log('got product page', location.href);
    let desc = document.querySelectorAll('[data-testid="productCardShortDescr"]');
    let params = document.querySelectorAll('.detail-parameters');

    if (desc.length !== 1) {
        throw new Error(`desc.length === ${desc.length}`);
    }
    if (params.length !== 2) {
        throw new Error(`params.length === ${params.length}`);
    }

    const id = window.location.href;

    const html = [...desc, ...params].map(elm => elm.outerHTML).join('\n');

    await runner.publishItems([{id, data: {id, html, links: [{href: id}]}}]);

} else {
    console.log('got listing page');
    async function getLinks() {

        let hrefs = Array.from(document.querySelectorAll('[data-testid="productCards"] [data-micro="url"]')).map(a => a.href);
        console.log(hrefs);
        stats.allLinks += hrefs.length;

        hrefs = hrefs.filter(href => /-m(\d+)-/.test(href));
        hrefs = hrefs.filter(href => !/-8gb-/.test(href));
        stats.filteredLinks += hrefs.length;

        await runner.addTasks(hrefs.map(href => ({href, ctx: 'product-page'})));
        console.log('Got links', stats);
    }


    async function loadNext() {
        const buttons = document.querySelectorAll('button');
        for(let button of buttons) {
            if(/Načíst (\d+) další/.test(button.innerText)) {
                button.click();
                return true;
            }
        }
        return false;
    }

    let hasNext = true;

    do {
        await runner.sleep(5000);
        console.log(`Loading page`, stats);
        hasNext = await loadNext();
        stats.paginationPages ++;
    } while(hasNext);

    await runner.sleep(5000);

    await getLinks();

    console.log('pagination finished', stats);
}
