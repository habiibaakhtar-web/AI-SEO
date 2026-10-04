import { useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import { Field,ErrorNotice,Loading } from '../../components/common/Feedback.jsx';
import { api,getErrorMessage } from '../../services/api.js';
import { useResource } from '../../hooks/useResource.js';
export default function WebsiteForm(){
  const {id}=useParams(),navigate=useNavigate(),resource=useResource(id?'/websites/'+id:null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError('');const body=Object.fromEntries(new FormData(e.currentTarget));try{const r=id?await api.put('/websites/'+id,body):await api.post('/websites',body);navigate('/websites/'+r.data.data.id);}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}
  if(id&&resource.loading)return <Loading/>;
  return <><div className="page-heading"><div><p className="eyebrow">Build your growth workspace</p><h1>{id?'Edit website':'Add a website'}</h1><p className="muted">Use a public website URL. We never change your website.</p></div></div><ErrorNotice message={error||resource.error}/><form className="panel form-panel" onSubmit={submit} key={resource.data?.id||'new'}>
    <Field id="site-name" name="name" label="Website name" required minLength={2} maxLength={100} defaultValue={resource.data?.name||''} placeholder="My business"/>
    <Field id="site-url" name="url" label="Website URL" type="url" required maxLength={2000} defaultValue={resource.data?.url||''} placeholder="https://example.com"/>
    <div className="field"><label htmlFor="description">Description (optional)</label><textarea id="description" name="description" maxLength={1000} rows={4} defaultValue={resource.data?.description||''} placeholder="What does your business do?"/></div>
    <div className="form-actions"><button className="button" disabled={busy}>{busy?'Saving…':'Save website'}</button><Link className="text-link" to={id?'/websites/'+id:'/websites'}>Cancel</Link></div>
  </form></>;
}

