import { z } from 'zod';

const recSchema=z.object({recommendations:z.array(z.object({
  issue_id:z.uuid(),recommendation:z.string().min(1).max(4000),reason:z.string().min(1).max(4000),
  priority:z.enum(['critical','high','medium','low']),suggested_text:z.string().max(4000).nullable().optional(),
}).strict()).max(100)}).strict();
export function toolService(config){
  async function call(path,body){
    if(!config.AGENT_SERVICE_TOKEN)throw new Error('AI_UNAVAILABLE');
    const res=await fetch(new URL(path,config.AGENT_URL),{method:'POST',headers:{'Content-Type':'application/json','X-Service-Token':config.AGENT_SERVICE_TOKEN},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
    if(!res.ok){
      let message='AI service is unavailable. Check agent/.env and restart the services.';
      try{const error=await res.json();if(typeof error.detail==='string')message=error.detail;}catch{}
      throw new Error(message);
    }
    return res.json();
  }
  return {
    status:()=>call('/provider/status',{}),
    testConnection:()=>call('/provider/test',{}),
    async recommend(auditId,issues){
      const response=recSchema.parse(await call('/seo/recommendations',{audit_id:auditId,issues:issues.map(i=>({id:i.id,title:i.title,category:i.category,severity:i.severity,page_url:i.pageUrl,description:i.description,why_it_matters:i.whyItMatters,recommendation:i.recommendation}))}));
      const ids=new Map(issues.map(i=>[i.id,i.severity]));const received=new Set();
      for(const item of response.recommendations){if(!ids.has(item.issue_id)||received.has(item.issue_id)||ids.get(item.issue_id)!==item.priority)throw new Error('INVALID_AI');received.add(item.issue_id);}
      if(received.size!==ids.size)throw new Error('INVALID_AI');return response.recommendations;
    },
    async generate(kind,input){
      try{
        const output=await call('/content/generate',{kind,context:input});
        if(typeof output.text!=='string'||!output.text.trim()||output.text.length>20000)throw new Error('INVALID_AI');
        return {source:'ai',output};
      }catch{
        const topic=input.topic,keyword=input.keyword||topic,business=input.business||input.site.name;
        let text='';
        if(kind==='keywords')text=[keyword,keyword+' guide',keyword+' services',keyword+' pricing','how to choose '+keyword].join('\n');
        if(kind==='meta')text=`Title: ${keyword}${input.location?' in '+input.location:''} | ${business}\n\nDescription: Explore ${topic.toLowerCase()} with ${business}. Learn about our approach, find useful information, and choose the next step that suits your needs.\n\nReview accuracy and intent before publishing. Titles and snippets may be truncated differently across search results.`;
        if(kind==='ideas')text=[`A beginner’s guide to ${topic}`,`How to choose the right ${topic} for your needs`,`Questions to ask before investing in ${topic}`,`Common mistakes to avoid with ${topic}`,`A practical checklist for ${topic}`].map((t,i)=>`${i+1}. ${t}`).join('\n');
        if(kind==='brief')text=`Content brief: ${topic}\n\nPrimary keyword: ${keyword}\nSearch intent: Informational (review for your audience)\nGoal: Answer the reader’s main questions with accurate examples.\n\nSuggested headings:\nH1: ${topic}\nH2: What you need to know\nH2: How it works\nH2: Common questions\nH2: Choosing your next step\n\nQuestions: What is it? Who is it for? What are the tradeoffs?\nWord range: Use the length needed to answer these questions; a starting outline is 600–1,000 words.\nInternal links: Review relevant existing pages on ${input.site.url}. No specific target has been verified by this draft.`;
        if(kind==='assistant'){
          const audit=input.audit;
          text=audit?`Your latest measured audit score is ${audit.overallScore}/100.\n\n${audit.issues.length?audit.issues.slice(0,5).map((i,n)=>`${n+1}. [${i.severity}] ${i.title}\n${i.description}\nNext step: ${i.recommendation}`).join('\n\n'):'No issues were found within the measured crawl checks.'}\n\nThis local assistant summarizes your audit. Connect an AI provider for conversational answers to your question.`:'Run an audit first so I can explain measured findings. You can also use Content Studio to create editable draft outlines.';
        }
        return {source:'rule',output:{text}};
      }
    },
  };
}

