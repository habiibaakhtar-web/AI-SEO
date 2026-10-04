import { useState } from 'react';
import AiConnection from '../components/settings/AiConnection.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api,getErrorMessage } from '../services/api.js';
import { Field,ErrorNotice } from '../components/common/Feedback.jsx';
export default function Settings(){
  const {user,setUser}=useAuth();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function save(e,password=false){e.preventDefault();setBusy(true);setError('');setMessage('');const form=e.currentTarget;try{const body=Object.fromEntries(new FormData(form));const r=password?await api.post('/users/me/password',body):await api.patch('/users/me',body);if(!password)setUser(r.data.data);else form.reset();setMessage(r.data.message);}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}
  return <><div className="page-heading"><div><p className="eyebrow">Make it yours</p><h1>Account settings</h1></div></div><ErrorNotice message={error}/>{message&&<p className="notice" role="status">{message}</p>}<form className="panel form-panel" onSubmit={e=>save(e)}><h2>Profile</h2><Field id="profile-name" name="name" label="Your name" required minLength={2} maxLength={100} defaultValue={user.name}/><Field id="profile-email" label="Email address" type="email" value={user.email} readOnly/><button className="button" disabled={busy}>Save profile</button></form><form className="panel form-panel workspace-section" onSubmit={e=>save(e,true)}><h2>Change password</h2><Field id="current-password" name="currentPassword" label="Current password" type="password" autoComplete="current-password" required maxLength={128}/><Field id="new-password" name="password" label="New password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/><p className="field-help">At least 10 characters. Other sessions will be signed out.</p><button className="button" disabled={busy}>Update password</button></form><AiConnection/></>;
}

