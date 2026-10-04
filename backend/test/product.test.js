import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { openStore,one } from '../src/config/store.js';
import { parseEnvironment } from '../src/config/environment.js';
import { createApp } from '../src/app.js';
import { auditService } from '../src/services/auditService.js';
import { toolService } from '../src/services/toolService.js';
import { validateUrl,publicAddress } from '../src/services/safeFetch.js';
import { extractPage } from '../src/services/crawlerService.js';
import { analyze } from '../src/services/seoService.js';
import { suggestLinks } from '../src/services/linkService.js';

test('real PostgreSQL engine: complete account, website, audit, ownership, content and reset flow',async()=>{
  const db=await openStore({DATA_DIR:'memory://'});
  const config=parseEnvironment({NODE_ENV:'test',JWT_SECRET:'x'.repeat(48)});
  const tools=toolService({...config,AGENT_SERVICE_TOKEN:''});
  const fixture=extractPage({url:'https://example.com/',status:200,headers:{},redirects:0,
    body:'<html><head><title>Example business homepage</title><meta name="viewport" content="width=device-width"></head><body><h1>Example</h1><img src="a.png"><p>Useful homepage copy.</p><a href="/about">About</a></body></html>'});
  const jobs=auditService(db,tools,{crawler:async()=>({pages:[fixture],failures:[],site:{robots:true,sitemap:false},coverage:{pagesCrawled:1,pageLimit:10,robotsSkipped:0,limited:false,linksChecked:1}})});
  const app=createApp({config,database:db,audits:jobs,tools}),owner=request.agent(app),stranger=request.agent(app);
  try{
    const registration=await owner.post('/api/auth/register').send({name:'Owner',email:'OWNER@example.com',password:'StrongPassword123'});
    assert.equal(registration.status,201);assert.equal(registration.body.data.email,'owner@example.com');
    assert.ok(!JSON.stringify(registration.body).includes('password'));
    const id=registration.body.data.id;
    assert.equal((await owner.get('/api/auth/me')).status,200);
    const saved=await one(db,'SELECT password_hash FROM users WHERE id=$1',[id]);
    assert.notEqual(saved.password_hash,'StrongPassword123');
    await stranger.post('/api/auth/register').send({name:'Other',email:'other@example.com',password:'AnotherPassword123'});
    assert.equal((await owner.post('/api/websites').send({name:'Bad',url:'http://127.0.0.1'})).status,400);
    const created=await owner.post('/api/websites').send({name:'Example',url:'https://example.com',description:'A test site'});
    assert.equal(created.status,201);const websiteId=created.body.data.id;
    assert.equal((await stranger.get('/api/websites/'+websiteId)).status,404);
    assert.equal((await stranger.delete('/api/websites/'+websiteId)).status,404);
    assert.equal((await owner.post('/api/websites').send({name:'Duplicate',url:'https://example.com'})).status,409);
    const started=await owner.post('/api/audits').send({websiteId});
    assert.equal(started.status,202);const auditId=started.body.data.id;
    let result;
    for(let i=0;i<100;i++){result=(await owner.get('/api/audits/'+auditId)).body.data;if(result.status==='completed')break;await new Promise(r=>setTimeout(r,30));}
    assert.equal(result.status,'completed');assert.equal(result.recommendation_status,'rule_based');
    assert.equal(result.target_url,'https://example.com/');
    assert.ok(result.overall_score>=0&&result.overall_score<=100);
    assert.equal(result.pages.length,1);assert.ok(result.issues.length>0);
    assert.equal(result.recommendations.length,result.issues.length);
    assert.equal((await stranger.get('/api/audits/'+auditId)).status,404);
    assert.equal((await stranger.get('/api/audits?websiteId='+websiteId)).status,404);
    const issue=result.issues[0];
    assert.equal((await stranger.patch('/api/issues/'+issue.id+'/status').send({status:'resolved'})).status,404);
    assert.equal((await owner.patch('/api/issues/'+issue.id+'/status').send({status:'resolved'})).status,200);
    assert.equal((await owner.get('/api/audits/'+auditId)).body.data.overall_score,result.overall_score);
    assert.equal((await owner.get('/api/audits')).body.data.length,1);
    assert.equal((await owner.put('/api/websites/'+websiteId).send({name:'Example updated',url:'https://example.org/'})).status,200);
    assert.equal((await owner.get('/api/audits/'+auditId)).body.data.website_url,'https://example.com/');
    const keyword=await owner.post('/api/keywords').send({websiteId,keyword:'example services'});
    assert.equal(keyword.status,201);
    const keywordBody={keyword:'updated services',intent:'commercial',priority:'high',category:'Services',status:'planned',targetPage:'https://example.com/',notes:'Target homepage'};
    assert.equal((await owner.put('/api/keywords/'+keyword.body.data.id).send(keywordBody)).status,200);
    assert.equal((await stranger.put('/api/keywords/'+keyword.body.data.id).send(keywordBody)).status,404);
    assert.equal((await owner.post('/api/keywords/generate').send({websiteId,topic:'Example services'})).body.data.suggestions.length,5);
    assert.equal((await owner.get('/api/websites/'+websiteId+'/links')).status,200);
    assert.equal((await stranger.get('/api/websites/'+websiteId+'/links')).status,404);
    assert.equal((await stranger.get('/api/keywords?websiteId='+websiteId)).status,404);
    for(const kind of ['ideas','meta','brief','assistant']){
      const generated=await owner.post('/api/content/'+kind).send({websiteId,topic:'Example business'});
      assert.equal(generated.status,201);assert.equal(generated.body.data.source,'rule');assert.ok(generated.body.data.output.text.length>20);
    }
    assert.equal((await stranger.post('/api/content/meta').send({websiteId,topic:'test'})).status,404);
    assert.equal((await owner.patch('/api/users/me').send({name:'Updated Owner'})).body.data.name,'Updated Owner');
    assert.equal((await owner.post('/api/users/me/password').send({currentPassword:'wrong',password:'ChangedPassword123'})).status,400);
    const forgot=await owner.post('/api/auth/forgot-password').send({email:'owner@example.com'});
    const token=new URL(forgot.body.data.resetUrl).searchParams.get('token');
    assert.equal((await owner.post('/api/auth/reset-password').send({token,password:'ChangedPassword123'})).status,200);
    assert.equal((await owner.get('/api/auth/me')).status,401);
    assert.equal((await owner.post('/api/auth/reset-password').send({token,password:'OtherPassword123'})).status,400);
    assert.equal((await owner.post('/api/auth/login').send({email:'owner@example.com',password:'ChangedPassword123'})).status,200);
    assert.equal((await owner.post('/api/auth/logout')).status,200);
    assert.equal((await owner.get('/api/auth/me')).status,401);
    assert.equal((await owner.post('/api/auth/login').send({email:'owner@example.com',password:'ChangedPassword123'})).status,200);
    assert.equal((await owner.delete('/api/websites/'+websiteId)).status,200);
    assert.equal((await owner.get('/api/audits/'+auditId)).status,404);
    assert.equal((await owner.get('/api/content?websiteId='+websiteId)).status,404);
    assert.equal((await owner.post('/api/auth/register').set('Origin','https://attacker.example').send({})).status,403);
  }finally{await jobs.stop();await db.close();}
});

test('internal link suggestions only connect measured related pages without existing links',()=>{
  const pages=[
    {url:'https://example.com/seo',evidence:{title:'SEO services',h1:['SEO services'],links:[]}},
    {url:'https://example.com/pricing',evidence:{title:'SEO pricing',h1:['SEO pricing plans'],links:['https://example.com/seo']}},
    {url:'https://example.com/contact',evidence:{title:'Contact us',h1:['Contact'],links:[]}},
  ];
  const links=suggestLinks(pages);
  assert.equal(links.length,1);assert.equal(links[0].from,pages[0].url);assert.equal(links[0].to,pages[1].url);
});

test('URL guard blocks local, mapped IPv6, encoded IPs, credentials and unsafe schemes',()=>{
  for(const url of ['http://127.0.0.1','http://2130706433','http://0x7f000001','http://[::1]','http://[::ffff:127.0.0.1]','http://192.168.1.1','http://169.254.169.254','http://10.0.0.1','file:///etc/passwd','https://user:pass@example.com','https://example.com:3000','http://localhost','http://service.local'])assert.throws(()=>validateUrl(url),url);
  assert.equal(publicAddress('8.8.8.8'),true);assert.equal(publicAddress('127.0.0.1'),false);
  assert.equal(validateUrl('https://example.com/path#hash').href,'https://example.com/path');
});

test('SEO scores use repeatable checks and change when real evidence improves',()=>{
  const build=body=>({pages:[extractPage({url:'https://example.com/',status:200,redirects:0,body})],failures:[],site:{robots:true,sitemap:true},coverage:{}});
  const poor=analyze(build('<html><body>Short page<img src="x"></body></html>'));
  const good=analyze(build('<html><head><title>Example services and advice</title><meta name="description" content="'+ 'A useful description for this page about example services and helpful advice for small business owners.' +'"><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://example.com/"></head><body><h1>Example services</h1><p>'+ 'Helpful useful content. '.repeat(100)+'</p><img alt="Team" src="x"><a href="/about">About us</a></body></html>'));
  assert.ok(good.overall>poor.overall);assert.equal(good.overall,100);
  assert.ok(poor.issues.some(i=>i.checkId==='title'));assert.ok(!good.issues.some(i=>i.checkId==='title'));
});

