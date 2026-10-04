import { Link } from 'react-router-dom';
import { ArrowUpRight,Plus,Globe,ClipboardCheck } from 'lucide-react';
import { useResource } from '../../hooks/useResource.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorNotice,Loading,Empty } from '../../components/common/Feedback.jsx';

export default function Dashboard(){
  const {user}=useAuth();const sites=useResource('/websites'),audits=useResource('/audits',{poll:true});
  const completed=(audits.data||[]).filter(a=>a.status==='completed');
  return <>
    <div className="page-heading"><div><p className="eyebrow">Your website, moving forward</p><h1>Hello, {user.name.split(' ')[0]}.</h1><p className="muted">A clear view of your websites and the work ahead.</p></div><Link className="button" to="/websites/add"><Plus size={18} aria-hidden="true"/>Add website</Link></div>
    <ErrorNotice message={sites.error||audits.error}/>
    <div className="stat-grid">
      <div className="stat-card"><Globe size={20} aria-hidden="true"/><p>Websites</p><strong>{sites.data?.length??'—'}</strong></div>
      <div className="stat-card"><ClipboardCheck size={20} aria-hidden="true"/><p>Completed audits</p><strong>{completed.length}</strong></div>
      <div className="stat-card"><p>Latest measured score</p><strong>{completed[0]?.overall_score??'—'}<span> / 100</span></strong></div>
    </div>
    {sites.loading?<Loading/>:!sites.data?.length?<Empty title="Start with your website."><p>Add a public website, run an audit, and get a focused action plan.</p><Link className="button" to="/websites/add">Add your first website</Link></Empty>:<section aria-labelledby="sites-title"><div className="workspace-section-title"><h2 id="sites-title">Your websites</h2><Link className="text-link" to="/websites">View all <ArrowUpRight size={16} aria-hidden="true"/></Link></div><div className="site-grid">{sites.data.map(site=><Link className="site-card" to={'/websites/'+site.id} key={site.id}><span className="site-icon"><Globe size={21} aria-hidden="true"/></span><h3>{site.name}</h3><p className="url-text">{site.url}</p><div className="site-card-bottom"><span>SEO health</span><strong>{site.current_score===null?'Not audited':site.current_score+' / 100'}</strong></div></Link>)}</div></section>}
    <section className="workspace-section" aria-labelledby="recent-title"><div className="workspace-section-title"><h2 id="recent-title">Recent audits</h2><Link className="text-link" to="/audits">View history</Link></div>{!audits.data?.length?<p className="muted">Your saved audits will appear here.</p>:<div className="audit-list">{audits.data.slice(0,5).map(a=><Link to={'/audits/'+a.id} className="audit-row" key={a.id}><div><strong>{a.website_name}</strong><p>{new Date(a.created_at).toLocaleString()}</p></div><span className={'badge '+a.status}>{a.status}</span><strong>{a.overall_score??'—'}<span className="muted small"> /100</span></strong></Link>)}</div>}</section>
  </>;
}

