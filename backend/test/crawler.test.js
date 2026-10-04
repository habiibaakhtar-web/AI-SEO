import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { safeFetch } from '../src/services/safeFetch.js';
import { crawlWebsite } from '../src/services/crawlerService.js';

test('slow public response can finish after the previous eight-second limit',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let respond;
  const req=new EventEmitter();
  req.destroy=error=>{req.emit('error',error);req.emit('close');};
  t.mock.method(https,'get',(_url,_options,callback)=>{respond=callback;return req;});
  const pending=safeFetch('https://8.8.8.8/');
  t.mock.timers.tick(9000);
  const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html'};
  respond(res);res.emit('data',Buffer.from('<html>slow response</html>'));res.emit('end');req.emit('close');
  assert.equal((await pending).body,'<html>slow response</html>');
});

test('custom timeout still bounds a stalled public request',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const req=new EventEmitter();
  req.destroy=error=>{req.emit('error',error);req.emit('close');};
  t.mock.method(https,'get',()=>req);
  const pending=safeFetch('https://8.8.8.8/',{timeout:1000});
  const rejected=assert.rejects(pending,/TIMEOUT/);
  t.mock.timers.tick(1001);
  await rejected;
});

test('redirects to private networks remain blocked',async t=>{
  t.mock.method(https,'get',(_url,_options,callback)=>{
    const req=new EventEmitter();req.destroy=()=>{};
    queueMicrotask(()=>{
      const res=new EventEmitter();res.statusCode=302;res.headers={location:'http://127.0.0.1/'};
      res.destroy=()=>req.emit('close');callback(res);
    });
    return req;
  });
  await assert.rejects(safeFetch('https://8.8.8.8/'),/Only public websites/);
});

test('crawler reports unreadable robots rules and does not crawl past them',async()=>{
  const visited=[];
  await assert.rejects(crawlWebsite('https://example.com/',async()=>{},async url=>{
    visited.push(url);
    if(url.endsWith('/robots.txt'))throw new Error('TIMEOUT');
    return {url,status:200,headers:{'content-type':'text/html'},body:'<html></html>',redirects:0};
  }),/ROBOTS_UNAVAILABLE/);
  assert.equal(visited.length,3);
});

test('a temporary first-page timeout retries and preserves actual page results',async()=>{
  let attempts=0;
  const progress=[];
  const result=await crawlWebsite('https://example.com/',async value=>progress.push(value),async url=>{
    if(url==='https://example.com/' && ++attempts===1)throw new Error('TIMEOUT');
    return {url,status:url.endsWith('/robots.txt')||url.endsWith('/sitemap.xml')?404:200,
      headers:{'content-type':'text/html'},body:'<html><head><title>Actual page</title></head><body><h1>Welcome</h1></body></html>',redirects:0};
  });
  assert.equal(attempts,2);
  assert.equal(result.pages[0].title,'Actual page');
  assert.equal(result.coverage.pagesCrawled,1);
  assert.equal(progress.length,1);
});
