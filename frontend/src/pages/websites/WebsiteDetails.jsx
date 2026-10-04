import { useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import { Play,ExternalLink } from 'lucide-react';
import { useResource } from '../../hooks/useResource.js';
import { api,getErrorMessage } from '../../services/api.js';
import { ErrorNotice,Loading } from '../../components/common/Feedback.jsx';
import ScoreHistory from '../../components/dashboard/ScoreHistory.jsx';
export default function WebsiteDetails(){
  const {id}=useParams(),navigate=useNavigate();const site=useResource('/websites/'+id),history=useResource('/audits?websiteId='+id,{poll:true});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[deleting,setDeleting]=useState(false);
  const audits=(history.data||[]).filter(a=>a.website_id===id),latest=audits.find(a=>a.status==='completed');
  const active=audits.find(a=>['queued','running'].includes(a.status));
  async function run(){setBusy(true);setError('');try{const r=await api.post('/audits',{websiteId:id});navigate('/audits/'+r.data.data.id);}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}}
  async function remove(){setBusy(true);try{await api.delete('/websites/'+id);navigate('/websites');}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}}
  if(site.loading)return <Loading/>;
  if(!site.data)return <ErrorNotice message={site.error}/>;
  return <><div className="page-heading"><div><p className="eyebrow">Website overview</p><h1>{site.data.name}</h1><a className="text-link url-text" href={site.data.url} target="_blank" rel="noreferrer">{site.data.url}<ExternalLink size={15} aria-hidden="true"/></a></div>{active?<Link className="button" to={'/audits/'+active.id}>View running audit</Link>:<button className="button" disabled={busy} onClick={run}><Play size={17} aria-hidden="true"/>{busy?'Starting…':'Run SEO audit'}</button>}</div><ErrorNotice message={error||history.error}/>
    <div className="stat-grid">{[['Overall',latest?.overall_score],['Technical',latest?.technical_score],['On-page',latest?.on_page_score],['Content',latest?.content_score]].map(([label,score])=><div className="stat-card" key={label}><p>{label}</p><strong>{score??'—'}<span> /100</span></strong></div>)}</div>
    <p className="muted">{site.data.description}</p>
    <ScoreHistory audits={audits}/>
    <div className="workspace-section-title workspace-section"><h2>Audit history</h2><Link className="text-link" to={'/websites/'+id+'/edit'}>Edit website</Link></div>
    {!audits.length?<div className="empty-state"><h2>See what your website needs.</h2><p>Run your first audit. We check up to 10 pages and save the measured findings.</p><button className="button" onClick={run} disabled={busy}>Run SEO audit</button></div>:<div className="audit-list">{audits.map(a=><Link className="audit-row" key={a.id} to={'/audits/'+a.id}><div><strong>{new Date(a.created_at).toLocaleString()}</strong><p>{a.progress}</p></div><span className={'badge '+a.status}>{a.status}</span><strong>{a.overall_score??'—'}</strong></Link>)}</div>}
    <div className="danger-zone"><h2>Delete website</h2><p>Deleting this website permanently removes its audits, tasks and content.</p>{deleting?<div className="form-actions"><button className="button danger-button" disabled={busy} onClick={remove}>Confirm permanent deletion</button><button className="text-button" onClick={()=>setDeleting(false)}>Cancel</button></div>:<button className="text-button danger-text" onClick={()=>setDeleting(true)} disabled={!!active}>Delete website</button>}</div>
  </>;
}

