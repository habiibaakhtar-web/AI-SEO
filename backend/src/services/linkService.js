const stop=new Set(['about','with','from','this','that','your','have','more','home','page','the','and','for','our']);
function tokens(page){
  const text=[page.evidence.title,...(page.evidence.h1||[]),...(page.evidence.h2||[])].join(' ').toLowerCase();
  return new Set(text.match(/[a-z]{3,}/g)?.filter(word=>!stop.has(word))||[]);
}
export function suggestLinks(pages){
  const results=[];
  for(const source of pages){
    const words=tokens(source);
    for(const target of pages){
      if(source.url===target.url||(source.evidence.links||[]).includes(target.url))continue;
      const shared=[...tokens(target)].filter(word=>words.has(word));
      if(!shared.length)continue;
      results.push({from:source.url,to:target.url,anchor:target.evidence.h1?.[0]||target.evidence.title||shared.join(' '),sharedTopics:shared,confidence:'heuristic'});
    }
  }
  return results.sort((a,b)=>b.sharedTopics.length-a.sharedTopics.length).slice(0,20);
}

