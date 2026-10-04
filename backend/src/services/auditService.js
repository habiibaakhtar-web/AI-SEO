import { randomUUID } from 'node:crypto';
import { one, all } from '../config/store.js';
import { crawlWebsite } from './crawlerService.js';
import { analyze } from './seoService.js';

const errorMessages={
  ROBOTS_BLOCKED:'This website does not allow our crawler under its robots.txt rules.',
  ROBOTS_UNAVAILABLE:'We could not safely read this website’s crawler rules.',
  NOT_HTML:'This URL does not serve an HTML webpage.',
  PRIVATE_NETWORK:'This URL resolves to a private network and cannot be audited.',
  TIMEOUT:'The website took too long to respond.',
};
export function auditService(db,tools,{crawler=crawlWebsite}={}) {
  let active=false,stopped=false;
  async function execute(audit){
    try{
      const site=await one(db,'SELECT * FROM websites WHERE id=$1',[audit.website_id]);
      await db.query("UPDATE audits SET status='running',progress='Reading website and crawler rules' WHERE id=$1",[audit.id]);
      const crawl=await crawler(site.url,progress=>db.query('UPDATE audits SET progress=$1 WHERE id=$2',[progress,audit.id]));
      crawl.keywords=await all(db,'SELECT keyword FROM keywords WHERE website_id=$1 LIMIT 20',[site.id]);
      const result=analyze(crawl);
      await db.query("UPDATE audits SET progress='Saving measured SEO findings' WHERE id=$1",[audit.id]);
      for(const page of crawl.pages){
        const {text,...evidence}=page;
        await db.query('INSERT INTO crawled_pages(id,audit_id,url,http_status,evidence) VALUES($1,$2,$3,$4,$5)',[randomUUID(),audit.id,page.url,page.httpStatus,JSON.stringify(evidence)]);
      }
      const issues=[];
      for(const issue of result.issues){
        const id=randomUUID();issues.push({...issue,id});
        await db.query('INSERT INTO seo_issues(id,audit_id,title,category,severity,description,why_it_matters,recommendation,page_url,check_id,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          [id,audit.id,issue.title,issue.category,issue.severity,issue.description,issue.whyItMatters,issue.recommendation,issue.pageUrl,issue.checkId,JSON.stringify(issue.evidence)]);
      }
      await db.query('UPDATE audits SET overall_score=$1,technical_score=$2,on_page_score=$3,content_score=$4,scoring_version=$5,coverage=$6,progress=$7 WHERE id=$8',
        [result.overall,result.technical,result.onPage,result.content,result.version,JSON.stringify(result.coverage),'Preparing recommendations',audit.id]);
      let source='rule',recommendations=issues.map(issue=>({issue_id:issue.id,priority:issue.severity,reason:issue.whyItMatters,recommendation:issue.recommendation}));
      if(issues.length){
        try{ const response=await tools.recommend(audit.id,issues);recommendations=response;source='ai'; }catch{}
      }
      for(const rec of recommendations)await db.query('INSERT INTO recommendations(id,audit_id,issue_id,recommendation,reason,priority,suggested_text,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [randomUUID(),audit.id,rec.issue_id,rec.recommendation,rec.reason,rec.priority,rec.suggested_text||null,source]);
      await db.query("UPDATE audits SET status='completed',recommendation_status=$1,progress='Audit complete',completed_at=now(),updated_at=now() WHERE id=$2",[source==='ai'?'ai':'rule_based',audit.id]);
    }catch(error){
      const message=errorMessages[error.message]||(error.message.startsWith('HTTP_')?'The website returned an HTTP error. Check the URL and try again.':'We could not complete this audit. The website may be unavailable or block automated requests.');
      await db.query("UPDATE audits SET status='failed',progress=$1,error_code='CRAWL_FAILED',completed_at=now(),updated_at=now() WHERE id=$2",[message,audit.id]);
    }
  }
  async function wake(){
    if(active||stopped)return;active=true;
    try{let audit;while(!stopped&&(audit=await one(db,"SELECT * FROM audits WHERE status='queued' ORDER BY created_at LIMIT 1")))await execute(audit);}
    catch{console.error('audit_worker_failed');}
    finally{active=false;}
  }
  return {
    wake,
    async start(){await db.query("UPDATE audits SET status='failed',progress='The server restarted during this audit. Please run a new audit.',error_code='INTERRUPTED',completed_at=now() WHERE status='running'");wake();},
    async stop(){stopped=true;while(active)await new Promise(resolve=>setTimeout(resolve,100));},
  };
}

