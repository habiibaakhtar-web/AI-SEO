import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useResource } from '../../hooks/useResource.js';
import { ErrorNotice,Loading,Empty } from '../../components/common/Feedback.jsx';
export default function Audits(){
  const [page,setPage]=useState(1);const {data,loading,error}=useResource('/audits?page='+page,{poll:true});
  return <><div className="page-heading"><div><p className="eyebrow">Measured findings, saved</p><h1>Audit history</h1><p className="muted">Revisit your results and see how your website changes.</p></div><Link className="button" to="/websites">Choose a website</Link></div><ErrorNotice message={error}/>{loading?<Loading/>:!data?.length?<Empty title="No audits on this page."><Link className="text-link" to="/websites">Choose a website to audit</Link></Empty>:<div className="audit-list">{data.map(a=><Link to={'/audits/'+a.id} className="audit-row" key={a.id}><div><strong>{a.website_name}</strong><p>{new Date(a.created_at).toLocaleString()}</p></div><span className={'badge '+a.status}>{a.status}</span><strong>{a.overall_score??'—'}<span className="small muted"> /100</span></strong></Link>)}</div>}<div className="form-actions pagination"><button className="button button-outline" disabled={page===1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page}</span><button className="button button-outline" disabled={!data||data.length<50} onClick={()=>setPage(page+1)}>Next</button></div></>;
}

