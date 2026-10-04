import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard,Globe,ClipboardList,KeyRound,FileText,MessageSquare,Settings,LogOut,Menu,X } from 'lucide-react';
import { useState } from 'react';
import Brand from './Brand.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loading,ErrorNotice } from './Feedback.jsx';
import { getErrorMessage } from '../../services/api.js';
const links=[['/dashboard','Overview',LayoutDashboard],['/websites','Websites',Globe],['/audits','Audit history',ClipboardList],['/keywords','Keywords',KeyRound],['/content','Content Studio',FileText],['/assistant','SEO assistant',MessageSquare],['/settings','Settings',Settings]];
export default function AppLayout(){
  const {user,loading,logout}=useAuth();const [open,setOpen]=useState(false),[error,setError]=useState('');
  if(loading)return <Loading/>;
  if(!user)return <Navigate to="/login" replace/>;
  return <div className="app-frame">
    <a className="skip-link" href="#workspace-main">Skip to main content</a>
    <aside className="app-sidebar">
      <div className="sidebar-brand"><Brand/><button className="menu-toggle" aria-label={open?'Close workspace navigation':'Open workspace navigation'} aria-expanded={open} aria-controls="workspace-links" onClick={()=>setOpen(!open)}>{open?<X aria-hidden="true"/>:<Menu aria-hidden="true"/>}</button></div>
      <nav id="workspace-links" aria-label="Workspace" className={open?'workspace-links is-open':'workspace-links'} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
        {links.map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setOpen(false)}><Icon size={19} aria-hidden="true"/>{label}</NavLink>)}
      </nav>
      <div className="sidebar-account"><p>{user.name}<span>{user.email}</span></p><button className="text-button" onClick={async()=>{try{await logout();}catch(e){setError(getErrorMessage(e));}}}><LogOut size={17} aria-hidden="true"/> Log out</button></div>
    </aside>
    <div className="workspace"><header className="workspace-top"><span>Your growth workspace</span><span className="account-chip">{user.name}</span></header><main id="workspace-main" className="workspace-main"><ErrorNotice message={error}/><Outlet/></main></div>
  </div>;
}

