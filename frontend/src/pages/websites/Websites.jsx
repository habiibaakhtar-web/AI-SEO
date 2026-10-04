import { Link } from 'react-router-dom';
import { Globe,Plus } from 'lucide-react';
import { useResource } from '../../hooks/useResource.js';
import { ErrorNotice,Loading,Empty } from '../../components/common/Feedback.jsx';
export default function Websites(){
  const {data,loading,error}=useResource('/websites');
  return <><div className="page-heading"><div><p className="eyebrow">A home for your websites</p><h1>Websites</h1><p className="muted">Manage your sites and start your next audit.</p></div><Link className="button" to="/websites/add"><Plus size={18} aria-hidden="true"/>Add website</Link></div><ErrorNotice message={error}/>{loading?<Loading/>:!data?.length?<Empty title="Your first website belongs here."><Link className="button" to="/websites/add">Add website</Link></Empty>:<div className="site-grid">{data.map(s=><Link key={s.id} to={'/websites/'+s.id} className="site-card"><span className="site-icon"><Globe aria-hidden="true"/></span><h2>{s.name}</h2><p className="url-text">{s.url}</p><p className="muted">{s.description}</p><div className="site-card-bottom"><span>SEO score</span><strong>{s.current_score??'Not audited'}</strong></div></Link>)}</div>}</>;
}

