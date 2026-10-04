import { ArrowUpRight, Check, CircleAlert } from 'lucide-react';

const issues = [
  { title: 'Make your homepage title clearer', label: 'High priority', severity: 'high' },
  { title: 'Describe images with alt text', label: 'Medium priority', severity: 'medium' },
  { title: 'Connect related pages', label: 'Medium priority', severity: 'medium' },
];

export default function AuditPreview() {
  return <figure className="audit-preview" aria-labelledby="preview-caption">
    <figcaption id="preview-caption" className="preview-top">
      <span className="eyebrow">An example of a clearer audit</span>
      <span className="sample-label">Illustrative data</span>
    </figcaption>
    <div className="preview-heading"><div>
      <p className="muted small">Website overview</p><h2>example.com</h2>
    </div><span className="audit-label"><Check size={14} aria-hidden="true" /> Example audit</span></div>
    <div className="score-summary">
      <div className="score-ring"><span className="score-number">68<span>/ 100</span></span></div>
      <div><p className="eyebrow">SEO health</p><h3>A good place to grow.</h3><p className="muted small">Start with the changes that matter most.</p></div>
    </div>
    <div className="category-scores">
      {[['Technical', 72], ['On-page', 64], ['Content', 68]].map(([label, score]) =>
        <div key={label}><div className="score-label"><span>{label}</span><strong>{score}</strong></div>
          <div className="score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></div>
        </div>)}
    </div>
    <div className="preview-actions">
      <div className="section-title"><h3>Your next steps</h3><span className="muted small">3 example tasks</span></div>
      {issues.map(issue => <div className="preview-issue" key={issue.title}>
        <CircleAlert size={18} aria-hidden="true" /><span>{issue.title}</span>
        <span className={`priority ${issue.severity}`}>{issue.label}</span>
      </div>)}
    </div>
    <div className="preview-note"><span>From findings to a focused action plan.</span><ArrowUpRight size={18} aria-hidden="true" /></div>
  </figure>;
}

