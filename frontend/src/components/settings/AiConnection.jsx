import { useState } from 'react';
import { useResource } from '../../hooks/useResource.js';
import { api,getErrorMessage } from '../../services/api.js';
import { ErrorNotice } from '../common/Feedback.jsx';

export default function AiConnection(){
  const status=useResource('/ai/status');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function verify(){
    setBusy(true);setError('');setMessage('');
    try{const r=await api.post('/ai/test');setMessage(r.data.message+' Model: '+r.data.data.model);await status.refresh();}
    catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}
  }
  return <section className="panel form-panel workspace-section" aria-labelledby="ai-connection-title">
    <h2 id="ai-connection-title">AI connection</h2>
    <p className="muted small">{status.data?.configured?'Provider configured: '+status.data.provider+' · '+status.data.model:'No AI provider connected. Rule-based guidance is available.'}</p>
    <p className="small">Add your OpenRouter key to <code>agent/.env</code> as <code>LLM_API_KEY</code>. Set the model and endpoint there, then restart the services. Keep provider keys out of frontend configuration.</p>
    <div className="form-actions"><button className="button" onClick={verify} disabled={busy}>{busy?'Testing connection…':'Test AI connection'}</button></div>
    <p className="field-help" style={{marginTop:12}}>This sends a small model request using the server configuration.</p>
    <ErrorNotice message={error||status.error}/>{message&&<p className="notice" role="status">{message}</p>}
  </section>;
}

