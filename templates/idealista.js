
await runner.onLoad();

let links = [...document.querySelectorAll('a')];
links = links.map(a => a.href).filter(h => h.includes('www.idealista'));
await console.log(links);
for(let link of links) {
  const res = await fetch(link);
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  console.log(link);
  console.log(text);
}





await runner.onLoad();
const task = await runner.getCurrentTask();

if(task.ctx.type === 'item') {

  await runner.publishItems([{
    key: location.href,
    data: {title: document.title}
  }])

} else {

  const links = document.querySelectorAll('a.item-link');

  for(const link of links) {
    await runner.humanScrollInView(link);
    await runner.humanClick(link, 'middle', {type: 'item'})
  }
}


