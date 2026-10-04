import { Link } from 'react-router-dom';
export default function ScoreHistory({audits}){
  const history=audits.filter(a=>a.status==='completed').slice(0,8).reverse();
  if(!history.length)return null;
  const sameVersion=history.every(a=>a.scoring_version===history[0].scoring_version);
  const sameTarget=history.every(a=>a.target_url===history[0].target_url);
  const delta=history[history.length-1].overall_score-history[0].overall_score;
  return <section className="workspace-section" aria-labelledby="progress-title"><div className="workspace-section-title"><div><h2 id="progress-title">Measured progress</h2><p className="muted">{history.length<2?'Run another audit after making improvements to compare results.':sameVersion&&sameTarget?(delta>=0?'+':'')+delta+' points between the first and latest audit shown.':'These audits use different targets or scoring versions; compare with care.'}</p></div></div>
    <div className="panel score-history">{history.map(a=><Link key={a.id} to={'/audits/'+a.id}><span>{new Date(a.created_at).toLocaleDateString()}</span><div className="history-track" aria-hidden="true"><span style={{width:a.overall_score+'%'}}/></div><strong>{a.overall_score}/100</strong></Link>)}</div>
  </section>;
}

