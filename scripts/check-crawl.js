import { safeFetch } from '../backend/src/services/safeFetch.js';
import { crawlWebsite } from '../backend/src/services/crawlerService.js';

// Diagnose public website connectivity without an account or provider request.
const audit=process.argv.includes('--audit');
for (const url of process.argv.slice(2).filter(arg=>arg!=='--audit')) {
  const start=Date.now();
  try {
    if(audit){
      const result=await crawlWebsite(url,async progress=>console.log(progress));
      console.log(JSON.stringify({url,milliseconds:Date.now()-start,coverage:result.coverage,failedPages:result.failures.length}));
    }else{
      const response=await safeFetch(url);
      console.log(JSON.stringify({url:response.url,status:response.status,milliseconds:Date.now()-start,bytes:Buffer.byteLength(response.body)}));
    }
  } catch(error) {
    console.log(JSON.stringify({url,error:error.code||error.message,milliseconds:Date.now()-start}));
    process.exitCode=1;
  }
}
