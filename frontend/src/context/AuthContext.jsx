import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/auth/me').then(r=>setUser(r.data.data)).catch(()=>{}).finally(()=>setLoading(false));},[]);
  useEffect(()=>{
    const id=api.interceptors.response.use(r=>r,e=>{if(e.response?.status===401&&!e.config?.url?.startsWith('/auth/'))setUser(null);return Promise.reject(e);});
    return()=>api.interceptors.response.eject(id);
  },[]);
  async function login(body,register=false){const r=await api.post('/auth/'+(register?'register':'login'),body);setUser(r.data.data);}
  async function logout(){await api.post('/auth/logout');setUser(null);}
  return <AuthContext.Provider value={{user,setUser,loading,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);

