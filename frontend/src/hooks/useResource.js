import { useCallback, useEffect, useState } from 'react';
import { api,getErrorMessage } from '../services/api.js';
export function useResource(path,{poll=false}={}){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const refresh=useCallback(async()=>{
    if(!path){setLoading(false);return;}
    try{const r=await api.get(path);setData(r.data.data);setError('');}
    catch(e){setError(getErrorMessage(e));}
    finally{setLoading(false);}
  },[path]);
  useEffect(()=>{setData(null);setLoading(true);refresh();if(poll){const id=setInterval(refresh,2500);return()=>clearInterval(id);}},[refresh,poll]);
  return {data,loading,error,refresh,setData};
}

