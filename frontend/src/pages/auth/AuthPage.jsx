import { useState } from 'react';
import { Link,Navigate,useNavigate,useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Brand from '../../components/common/Brand.jsx';
import { Field,ErrorNotice } from '../../components/common/Feedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api,getErrorMessage } from '../../services/api.js';

export default function AuthPage({mode='login'}){
  const auth=useAuth(),navigate=useNavigate(),[params]=useSearchParams();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[resetUrl,setResetUrl]=useState('');
  const register=mode==='register',forgot=mode==='forgot',reset=mode==='reset';
  const titles={login:'Welcome back.',register:'Give your website room to grow.',forgot:'Reset your password.',reset:'Choose a new password.'};
  if(auth.user&&!forgot&&!reset)return <Navigate to="/dashboard" replace/>;
  async function submit(e){
    e.preventDefault();setBusy(true);setError('');setMessage('');
    const body=Object.fromEntries(new FormData(e.currentTarget));
    try{
      if(forgot){const r=await api.post('/auth/forgot-password',body);setMessage(r.data.message);setResetUrl(r.data.data.resetUrl||'');}
      else if(reset){const r=await api.post('/auth/reset-password',{password:body.password,token:params.get('token')||''});setMessage(r.data.message);}
      else{await auth.login(body,register);navigate('/dashboard');}
    }catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}
  }
  return <div className="auth-page"><div className="auth-brand"><Brand/></div><main className="auth-card">
    <p className="eyebrow">Your next step starts here</p><h1>{titles[mode]}</h1>
    <p className="muted">{register?'Create an account to audit your website and organize your next steps.':forgot?'Request a password reset link.':'Clear findings. Practical actions. Thoughtful growth.'}</p>
    <ErrorNotice message={error}/>{message&&<p className="notice" role="status">{message}</p>}
    {resetUrl&&<Link className="text-link" to={new URL(resetUrl).pathname+new URL(resetUrl).search}>Open local development reset link</Link>}
    {!(reset&&message)&&<form onSubmit={submit}>
      {register&&<Field id="name" name="name" label="Your name" autoComplete="name" minLength={2} maxLength={100} required/>}
      {!reset&&<Field id="email" name="email" label="Email address" type="email" autoComplete="email" maxLength={254} required/>}
      {!forgot&&<><Field id="password" name="password" label={reset?'New password':'Password'} type="password" autoComplete={register||reset?'new-password':'current-password'} minLength={10} maxLength={128} required/><p className="field-help">At least 10 characters.</p></>}
      <button className="button full-width" disabled={busy}>{busy?'Please wait…':forgot?'Get reset link':reset?'Update password':register?'Create account':'Log in'}<ArrowRight size={17} aria-hidden="true"/></button>
    </form>}
    {mode==='login'&&<><Link className="text-link" to="/forgot-password">Forgot password?</Link><p className="auth-switch">New here? <Link to="/register">Create an account</Link></p></>}
    {register&&<p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>}
    {(forgot||reset)&&<Link className="text-link" to="/login">Back to login</Link>}
  </main><p className="auth-footer">Don’t just audit websites. Help them grow.</p></div>;
}

