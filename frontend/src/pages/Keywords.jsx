import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource.js';
import { api,getErrorMessage } from '../services/api.js';
import { ErrorNotice,Field } from '../components/common/Feedback.jsx';

export default function Keywords(){
  const sites=useResource('/websites');
  const [selected,setSelected]=useState(''),[search,setSearch]=useState(''),[intentFilter,setIntentFilter]=useState('all');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(null),[suggestions,setSuggestions]=useState(null);
  const siteId=selected||sites.data?.[0]?.id;
  const keywords=useResource(siteId?'/keywords?websiteId='+siteId:null);
  async function save(e){
    e.preventDefault();setBusy(true);setError('');const form=e.currentTarget;
    try{
      const body=Object.fromEntries(new FormData(form));
      if(editing)await api.put('/keywords/'+editing.id,body);
      else await api.post('/keywords',{...body,websiteId:siteId});
      setEditing(null);form.reset();await keywords.refresh();
    }catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}
  }
  async function remove(id){try{await api.delete('/keywords/'+id);await keywords.refresh();}catch(err){setError(getErrorMessage(err));}}
  async function generate(e){
    e.preventDefault();setBusy(true);
    try{const r=await api.post('/keywords/generate',{websiteId:siteId,topic:new FormData(e.currentTarget).get('topic')});setSuggestions(r.data.data);}
    catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}
  }
  async function addSuggestion(keyword){
    try{await api.post('/keywords',{websiteId:siteId,keyword});await keywords.refresh();setSuggestions({...suggestions,suggestions:suggestions.suggestions.filter(s=>s!==keyword)});}
    catch(err){setError(getErrorMessage(err));}
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">Give your content direction</p><h1>Keywords</h1><p className="muted">Organize keyword targets. Search volume and rankings are not measured.</p></div></div>
    <ErrorNotice message={error||sites.error||keywords.error}/>
    {!sites.data?.length?<Link className="button" to="/websites/add">Add a website first</Link>:<>
      <div className="field selector-field"><label htmlFor="keyword-site">Website</label><select id="keyword-site" value={siteId} onChange={e=>{setSelected(e.target.value);setEditing(null);setSuggestions(null);}}>{sites.data.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></div>
      <form className="panel keyword-form" onSubmit={save} key={editing?.id||'new'}>
        <Field id="keyword" name="keyword" label="Keyword" required minLength={2} maxLength={200} defaultValue={editing?.keyword||''} placeholder="e.g. local SEO services"/>
        <div className="field"><label htmlFor="intent">Search intent</label><select id="intent" name="intent" defaultValue={editing?.intent||'informational'}>{['informational','navigational','commercial','transactional'].map(s=><option key={s}>{s}</option>)}</select></div>
        <Field id="category" name="category" label="Category (optional)" maxLength={100} defaultValue={editing?.category||''}/>
        <div className="field"><label htmlFor="keyword-priority">Priority</label><select id="keyword-priority" name="priority" defaultValue={editing?.priority||'medium'}>{['high','medium','low'].map(s=><option key={s}>{s}</option>)}</select></div>
        <Field id="target-page" name="targetPage" label="Target page (optional)" type="url" maxLength={2000} defaultValue={editing?.target_page||''}/>
        <div className="field"><label htmlFor="keyword-status">Status</label><select id="keyword-status" name="status" defaultValue={editing?.status||'planned'}>{['planned','in_progress','published'].map(s=><option key={s}>{s}</option>)}</select></div>
        <Field id="notes" name="notes" label="Notes (optional)" maxLength={2000} defaultValue={editing?.notes||''}/>
        <button className="button" disabled={busy}>{editing?'Update keyword':'Save keyword'}</button>{editing&&<button type="button" className="text-button" onClick={()=>setEditing(null)}>Cancel edit</button>}
      </form>
      <div className="keyword-filters"><Field id="search-keywords" label="Search saved keywords" value={search} onChange={e=>setSearch(e.target.value)}/><div className="field"><label htmlFor="intent-filter">Filter by intent</label><select id="intent-filter" value={intentFilter} onChange={e=>setIntentFilter(e.target.value)}><option value="all">All intents</option>{['informational','navigational','commercial','transactional'].map(s=><option key={s}>{s}</option>)}</select></div></div>
      <div className="keyword-list">{(keywords.data||[]).filter(k=>k.keyword.toLowerCase().includes(search.toLowerCase())&&(intentFilter==='all'||k.intent===intentFilter)).map(k=><div className="panel keyword-row" key={k.id}><div><strong>{k.keyword}</strong><p className="muted small">{k.intent} · {k.priority} · {k.status}</p>{k.category&&<p className="muted small">Category: {k.category}</p>}{k.target_page&&<p className="url-text small">Target: {k.target_page}</p>}{k.notes&&<p className="muted small">{k.notes}</p>}</div><div className="keyword-row-actions"><button className="text-button" aria-label={'Edit '+k.keyword} onClick={()=>{setEditing(k);window.scrollTo({top:0,behavior:'instant'});}}>Edit</button><button className="text-button danger-text" aria-label={'Remove '+k.keyword} onClick={()=>remove(k.id)}>Remove</button></div></div>)}</div>
      <section className="workspace-section"><h2>Find keyword ideas</h2><form className="panel keyword-form" onSubmit={generate}><Field id="keyword-topic" name="topic" label="Business topic" required minLength={2} maxLength={200}/><button className="button" disabled={busy}>Generate keyword ideas</button></form>{suggestions&&<><p className="notice">{suggestions.source==='ai'?'AI-generated suggestions':'Rule-based suggestions'} · Review relevance; no search-volume data is available.</p><div className="keyword-list">{suggestions.suggestions.map(keyword=><div className="panel keyword-row" key={keyword}><strong>{keyword}</strong><button className="text-button" onClick={()=>addSuggestion(keyword)}>Save</button></div>)}</div></>}</section>
    </>}
  </>;
}
