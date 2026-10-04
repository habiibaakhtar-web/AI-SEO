import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { HttpError } from '../utils/httpError.js';

export function publicAddress(value) {
  try { return ipaddr.process(value).range() === 'unicast'; } catch { return false; }
}
export function validateUrl(input) {
  let url; try { url=new URL(input); } catch { throw new HttpError(400,'Enter a valid URL beginning with https:// or http://.'); }
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port)))
    throw new HttpError(400,'Use a public HTTP or HTTPS website without credentials or custom ports.');
  if (!host.includes('.') && !isIP(host) || host==='localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || isIP(host)&&!publicAddress(host))
    throw new HttpError(400,'Only public websites can be audited.');
  url.hash=''; return url;
}

export async function safeFetch(input, options={}) {
  const maxBytes=options.maxBytes||2*1024*1024;
  let url=validateUrl(input);
  for(let redirect=0;redirect<=5;redirect++){
    const host=url.hostname.replace(/^\[|\]$/g,'');
    const addresses=isIP(host)?[{address:host,family:isIP(host)}]:await lookup(host,{all:true});
    if(!addresses.length || addresses.some(item=>!publicAddress(item.address))) throw new Error('PRIVATE_NETWORK');
    // Prefer IPv4 on networks without working IPv6, then try other public addresses.
    const candidates=[...addresses].sort((a,b)=>a.family-b.family).slice(0,3);
    const deadline=Date.now()+(options.timeout??30000);
    let response;
    for(let attempt=0;attempt<candidates.length;attempt++){
      const selected=candidates[attempt];
      const remaining=deadline-Date.now();
      if(remaining<=0)throw new Error('TIMEOUT');
      try { response=await new Promise((resolve,reject)=>{
        const client=url.protocol==='https:'?https:http;
        const request=client.get(url,{
          agent:false,headers:{'User-Agent':'AIGrowthAudit/1.0','Accept':'text/html,application/xml,text/plain;q=0.9','Accept-Encoding':'identity'},
          lookup:(hostname, opts, callback)=> opts.all ? callback(null,[selected]) : callback(null,selected.address,selected.family),
        },res=>{
          if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location){
            resolve({status:res.statusCode,headers:res.headers,body:'',url:url.href});
            res.destroy();
            return;
          }
          const chunks=[];let bytes=0;
          res.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes){res.destroy(new Error('BODY_LIMIT'));}else chunks.push(chunk);});
          res.on('error',reject);
          res.on('aborted',()=>reject(new Error('RESPONSE_ABORTED')));
          res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8'),url:url.href}));
        });
        const timer=setTimeout(()=>request.destroy(new Error('TIMEOUT')),attempt<candidates.length-1?Math.min(10000,remaining):remaining);
        request.on('close',()=>clearTimeout(timer));request.on('error',reject);
      }); break; }
      catch(error){
        if(!['TIMEOUT','ECONNREFUSED','ECONNRESET','ENETUNREACH','EHOSTUNREACH','ETIMEDOUT','RESPONSE_ABORTED'].includes(error.message) && !['ECONNREFUSED','ECONNRESET','ENETUNREACH','EHOSTUNREACH','ETIMEDOUT'].includes(error.code))throw error;
        if(attempt===candidates.length-1)throw error;
      }
    }
    if([301,302,303,307,308].includes(response.status)&&response.headers.location){
      if(redirect===5)throw new Error('REDIRECT_LIMIT');
      url=validateUrl(new URL(response.headers.location,url).href);continue;
    }
    return {...response,redirects:redirect};
  }
}
