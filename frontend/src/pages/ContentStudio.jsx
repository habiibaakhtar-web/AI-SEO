import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy,Check } from 'lucide-react';
import { useResource } from '../hooks/useResource.js';
import { api,getErrorMessage } from '../services/api.js';
import { ErrorNotice,Field } from '../components/common/Feedback.jsx';
import InternalLinks from '../components/content/InternalLinks.jsx';
export default function ContentStudio({assistant=false}){
  const sites=useResource('/websites');const [selected,setSelected]=useState(''),[kind,setKind]=useState(assistant?'assistant':'ideas'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[copied,setCopied]=useState(false);
  const siteId=selected||sites.data?.[0]?.id;const history=useResource(siteId?'/content?websiteId='+siteId:null);
  async function generate(e){e.preventDefault();setBusy(true);setError('');setCopied(false);try{const r=await api.post('/content/'+kind,{...Object.fromEntries(new FormData(e.currentTarget)),websiteId:siteId});setResult(r.data.data);await history.refresh();}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(result.output.text);setCopied(true);}catch{setError('Copy is unavailable in this browser. Select and copy the draft text.');}}
  return <><div className="page-heading"><div><p className="eyebrow">{assistant?'Clarity, with context':'From idea to first draft'}</p><h1>{assistant?'SEO assistant':'Content Studio'}</h1><p className="muted">{assistant?'Ask about your latest audit. Local guidance summarizes measured findings.':'Create editable drafts and save them with your website.'}</p></div></div><ErrorNotice message={error||sites.error||history.error}/>{!sites.data?.length?<Link className="button" to="/websites/add">Add a website first</Link>:<>
    <div className="field selector-field"><label htmlFor="content-site">Website</label><select id="content-site" value={siteId} onChange={e=>{setSelected(e.target.value);setResult(null);}}>{sites.data.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    <div className="studio-grid"><form className="panel form-panel" onSubmit={generate}>
      {!assistant&&<div className="field"><label htmlFor="content-kind">Tool</label><select id="content-kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="ideas">Content ideas</option><option value="brief">Content brief</option><option value="meta">Meta title & description</option></select></div>}
      <div className="field"><label htmlFor="topic">{assistant?'Your question':'Page topic'}</label><textarea id="topic" name="topic" rows={4} required minLength={2} maxLength={500} placeholder={assistant?'What should I fix first?':'What is this page about?'}/></div>
      {!assistant&&<><Field id="primary-keyword" name="keyword" label="Primary keyword (optional)" maxLength={200}/><Field id="business" name="business" label="Business name (optional)" maxLength={100}/><Field id="location" name="location" label="Location (optional)" maxLength={100}/></>}
      <button className="button" disabled={busy}>{busy?'Preparing your draft…':assistant?'Ask assistant':'Create draft'}</button><p className="field-help">AI is used when a provider is configured. Otherwise, drafts use labeled rule-based templates. Always review before publishing.</p>
    </form>
    <div className="panel draft-panel">{result?<><div className="workspace-section-title"><span className="badge">{result.source==='ai'?'AI-generated draft':'Rule-based draft'}</span><button className="text-button" onClick={copy}>{copied?<Check size={17} aria-hidden="true"/>:<Copy size={17} aria-hidden="true"/>}{copied?'Copied':'Copy'}</button></div><div className="draft-text">{result.output.text}</div>{result.kind==='meta'&&<p className="small muted">Character counts: {result.output.text.split('\n').filter(l=>l.startsWith('Title:')||l.startsWith('Description:')).map(l=>l.split(':')[0]+' '+l.slice(l.indexOf(':')+1).trim().length).join(' · ')}</p>}</>:<div className="empty-state"><h2>{assistant?'Ask a question.':'Your draft will appear here.'}</h2><p>{assistant?'Run an audit to give the assistant verified context.':'Choose a tool and describe your topic to get started.'}</p></div>}</div></div>
    <section className="workspace-section"><h2>{assistant?'Saved conversations':'Saved drafts'}</h2><div className="saved-drafts">{(history.data||[]).filter(item=>assistant?item.kind==='assistant':item.kind!=='assistant').map(item=><button className="panel saved-draft" key={item.id} onClick={()=>{setResult(item);setCopied(false);}}><strong>{item.input.topic}</strong><span className="small muted">{item.kind} · {item.source==='ai'?'AI':'Rule-based'} · {new Date(item.created_at).toLocaleDateString()}</span></button>)}</div></section>
    {!assistant&&<InternalLinks websiteId={siteId}/>}
  </>}</>;
}

