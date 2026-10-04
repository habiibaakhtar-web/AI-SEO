import { createHash } from 'node:crypto';

export function analyze(crawl) {
  const issues=[];const checks=[];const groups={technical:[],on_page:[],content:[]};
  function check(page,id,category,passed,title,severity,description,why,recommendation,weight=1){
    const item={page:page.url,id,category,passed,weight};checks.push(item);groups[category].push(item);
    if(!passed)issues.push({title,severity,category,description,whyItMatters:why,recommendation,pageUrl:page.url,checkId:id,evidence:{measured:true}});
  }
  const titles=new Map(),descriptions=new Map(),hashes=new Map();
  for(const page of crawl.pages){
    if(page.title)titles.set(page.title,(titles.get(page.title)||0)+1);
    if(page.description)descriptions.set(page.description,(descriptions.get(page.description)||0)+1);
    const hash=createHash('sha256').update(page.text).digest('hex');
    if(page.wordCount>50)hashes.set(hash,(hashes.get(hash)||0)+1);
  }
  for(const p of crawl.pages){
    check(p,'https','technical',p.url.startsWith('https:'),'Use HTTPS','high','The page was served over HTTP.','HTTPS protects the connection and supports user trust.','Enable HTTPS and redirect HTTP to HTTPS.',2);
    check(p,'canonical','technical',!!p.canonical,'Missing canonical URL','medium','No canonical link was found.','Canonical links clarify the preferred version of a page.','Add an absolute canonical URL for this page.');
    check(p,'viewport','technical',!!p.viewport,'Missing mobile viewport','high','No viewport meta tag was found.','A viewport helps browsers display the page correctly on mobile.','Add a width=device-width viewport meta tag.',2);
    check(p,'redirects','technical',p.redirects<=1,'Review redirect chains','low',`This request followed ${p.redirects} redirects.`,'Multiple redirects add extra requests before a page loads.','Link directly to the final canonical destination where possible.');
    check(p,'indexable','technical',!p.noindex,'Page requests no indexing','high','A robots meta tag includes noindex.','Search engines may exclude this page from search results.','Remove noindex only if this page is intended to appear in search.',2);
    check(p,'title','on_page',!!p.title,'Missing page title','high','No nonempty title was found.','Titles explain a page topic to users and search engines.','Add a unique descriptive title.',2);
    if(p.title)check(p,'title_length','on_page',p.title.length>=15&&p.title.length<=65,'Review title length','low',`The title is ${p.title.length} characters long.`,'Very short or long titles may be unclear or truncated.','Review clarity and concision; character counts are guidance, not ranking guarantees.');
    check(p,'description','on_page',!!p.description,'Missing meta description','medium','No description meta tag was found.','A description can help communicate relevance in a search snippet.','Write a unique description that accurately summarizes this page.');
    if(p.description)check(p,'description_length','on_page',p.description.length>=70&&p.description.length<=160,'Review description length','low',`The description is ${p.description.length} characters long.`,'Search snippets may truncate long descriptions.','Use a clear concise summary; displayed lengths vary.');
    check(p,'h1','on_page',p.h1.length===1,'Review the main heading','medium',`Found ${p.h1.length} H1 headings.`,'A clear main heading helps communicate the page structure.','Use one descriptive main heading as a practical editorial convention.');
    check(p,'heading_order','on_page',p.headingLevels.every((v,i)=>!i||v<=p.headingLevels[i-1]+1),'Heading levels skip a step','low','The heading sequence contains skipped levels.','Consistent structure helps readers navigate the content.','Nest heading levels logically.');
    if(p.images)check(p,'alt','on_page',!p.missingAlt,'Images lack alt attributes','medium',`${p.missingAlt} of ${p.images} images have no alt attribute.`,'Alt text supports people using assistive technology.','Describe informative images; use empty alt for decorative images.');
    check(p,'url','on_page',new URL(p.url).pathname.length<=100,'Review a long page URL','low','The URL path exceeds 100 characters.','Readable URLs are easier to understand and share.','Review whether a shorter descriptive URL is appropriate before changing it.');
    if(p.title)check(p,'unique_title','on_page',titles.get(p.title)===1,'Duplicate page title','medium','This title is shared by another crawled page.','Distinct titles clarify each page topic.','Give each page a title matching its purpose.');
    if(p.description)check(p,'unique_description','on_page',descriptions.get(p.description)===1,'Duplicate meta description','low','This description is shared by another crawled page.','Unique descriptions help explain individual pages.','Write a summary specific to this page.');
    check(p,'content_length','content',p.wordCount>=150,'Review limited text content','medium',`The extracted page has ${p.wordCount} words.`,'Very little text may leave the page purpose unclear; appropriate length depends on the page.','Review whether the page answers its audience needs; do not add filler.');
    const internal=p.links.filter(url=>new URL(url).origin===new URL(p.url).origin && url!==p.url);
    p.internalLinkCount=internal.length;
    p.externalLinkCount=p.links.length-internal.length;
    p.keywordCounts=(crawl.keywords||[]).map(({keyword})=>({keyword,count:p.text.toLowerCase().split(keyword.toLowerCase()).length-1}));
    if(p.language.toLowerCase().startsWith('en')&&p.wordCount>50){
      const words=p.text.toLowerCase().match(/[a-z]+/g)||[];
      const sentences=Math.max(1,(p.text.match(/[.!?]+/g)||[]).length);
      const syllables=words.reduce((sum,word)=>sum+Math.max(1,(word.replace(/e$/,'').match(/[aeiouy]+/g)||[]).length),0);
      p.readability={method:'Approximate English Flesch reading ease',score:Math.round(206.835-1.015*(words.length/sentences)-84.6*(syllables/Math.max(1,words.length)))};
    }
    check(p,'internal_links','content',internal.length>0,'No internal links found','medium','No links to another page on this site were found.','Relevant internal links help visitors discover related pages.','Link to useful related content with descriptive anchor text.');
    if(p.wordCount>50)check(p,'duplicate_text','content',hashes.get(createHash('sha256').update(p.text).digest('hex'))===1,'Identical extracted content','medium','Another crawled page has identical extracted text.','Duplicate pages can make their distinct purpose unclear.','Review duplicate URLs, canonical tags and the page purpose.');
  }
  const first=crawl.pages[0];
  check(first,'robots','technical',crawl.site.robots,'robots.txt not found','low','No robots.txt file was found.','Robots rules can guide crawler access; absence does not prevent indexing.','Consider adding robots.txt with suitable rules and a sitemap reference.');
  if(crawl.site.sitemap!==null)check(first,'sitemap','technical',crawl.site.sitemap,'XML sitemap not found','medium','No readable XML sitemap was detected.','Sitemaps help search engines discover canonical pages.','Publish a sitemap and reference it from robots.txt.');
  for(const failure of crawl.failures){
    if(failure.status)check({url:failure.url},'broken_link','technical',false,'Broken internal destination','high',`The linked URL returned HTTP ${failure.status}.`,'Broken links interrupt navigation and waste crawl effort.','Update the link or restore the destination.',2);
  }
  const score=items=>items.length?Math.round(100*items.filter(c=>c.passed).reduce((s,c)=>s+c.weight,0)/items.reduce((s,c)=>s+c.weight,0)):null;
  const technical=score(groups.technical),onPage=score(groups.on_page),content=score(groups.content);
  return {issues,checks,technical,onPage,content,overall:Math.round(technical*.4+onPage*.4+content*.2),version:'1.1.0',
    coverage:{...crawl.coverage,checks:checks.length,failedFetches:crawl.failures.length,readabilityMeasured:crawl.pages.some(p=>p.readability),keywordUsageMeasured:!!crawl.keywords?.length}};
}

