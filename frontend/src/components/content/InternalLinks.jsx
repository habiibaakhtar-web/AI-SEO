import { useResource } from '../../hooks/useResource.js';
import { ErrorNotice } from '../common/Feedback.jsx';
export default function InternalLinks({websiteId}){
  const {data,error}=useResource(websiteId?'/websites/'+websiteId+'/links':null);
  return <section className="workspace-section"><h2>Internal linking opportunities</h2><p className="muted small">Suggestions use shared words in measured page titles and headings. Review relevance before adding a link.</p><ErrorNotice message={error}/>
    {!data?.length?<p className="notice">No new matches yet. Run an audit with related pages to look for linking opportunities.</p>:<div className="page-list">{data.map((item,i)=><div className="panel" key={i}><p className="url-text small"><strong>From:</strong> {item.from}</p><p className="url-text small"><strong>To:</strong> {item.to}</p><p><strong>Suggested anchor:</strong> {item.anchor}</p><p className="muted small">Shared topic words: {item.sharedTopics.join(', ')} · Heuristic suggestion</p></div>)}</div>}
  </section>;
}

