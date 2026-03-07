

await runner.onLoad();


const stats = {
    items: 0,
    salaries: 0,
    paginationPages: 0,
}


async function getItems() {
    console.log('page', stats.pages);

    const req = await runner.waitFor(async() => {
        const reqs = await runner.getRequests();
        const match = reqs.find(req => req.url.includes('/api/search/offers'));
        if(match?.status === 200) {
            return match;
        }
        return false;
    });

    await console.log(req);

    const body = await req.body()

    const {member} = JSON.parse(body);

    let ix = 0;
    for(let item of member) {
        const {id, skills} = item;
        let salary = undefined;
        if(item.salary) {
            let {minimum, maximum} = item.salary;
            salary = {minimum, maximum};
            stats.salaries ++;
        }

        console.log(`publishing item ${ix}/${member.length}`);
        stats.items ++;

        await runner.publishItems([{
            id,
            data: {
                id,
                title: byLocale(item.title),
                html: byLocale(item.description),
                links: [{href: `https://www.startupjobs.cz/nabidka/${item.displayId}/a`}],
                salary,
                skills: skills.map(skill => skill.name)
            }
        }])
    }
    stats.pages ++;
    ix ++;
}


async function loadNext() {
    await runner.clearRequests();
    const buttons = document.querySelectorAll('button');
    for(let button of buttons) {
        if(button.innerText.includes('Načíst další stránku')) {
            button.click();
            return true;
        }
    }
    return false;
}


let hasNext = true;

do {
    await getItems();
    hasNext = await loadNext();
} while(hasNext);

console.log(`stats`, stats);

function byLocale(loc) {
    if(loc['cs']) {
        return loc['cs']
    }

    return loc['en'];
}