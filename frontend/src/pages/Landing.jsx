import { ArrowRight, ArrowUpRight, ChartNoAxesColumnIncreasing, ListChecks, Search, Sparkles } from 'lucide-react';
import Navbar from '../components/common/Navbar.jsx';
import Brand from '../components/common/Brand.jsx';
import AuditPreview from '../components/landing/AuditPreview.jsx';
import { Link } from 'react-router-dom';

const steps = [
  ['01', 'Add your website', 'Start with your website URL and a little context about your business.'],
  ['02', 'Run an SEO audit', 'Collect page evidence and check technical and on-page SEO.'],
  ['03', 'Get clear recommendations', 'Understand each finding, why it matters, and how to fix it.'],
  ['04', 'Improve and track', 'Work through your priorities and compare your next audit.'],
];
const phases = [
  ['First release', 'Understand your SEO', 'Website audits, measured scores, clear issues and prioritized recommendations.'],
  ['Next', 'Create with direction', 'Keyword ideas, content briefs, meta descriptions and a contextual AI assistant.'],
  ['Later', 'Keep your growth in view', 'Progress tracking, scheduled audits, notifications and reporting.'],
];

export default function Landing() {
  return <>
    <a className="skip-link" href="#main">Skip to main content</a>
    <Navbar />
    <main id="main">
      <section className="container hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span className="status-mark" aria-hidden="true" /> A clearer path to website growth</p>
          <h1 id="hero-title">Better SEO.<br />Clear next steps.<br /><span>Room to grow.</span></h1>
          <p className="hero-description">Understand what’s holding your website back. Turn SEO findings into practical actions, with AI to help you along the way.</p>
          <div className="hero-buttons">
            <Link className="button" to="/register">Analyze my website <ArrowRight size={18} aria-hidden="true" /></Link>
            <a className="text-link" href="#workflow">See how it works <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
          <p className="hero-footnote">Built for business owners, creators, and growing teams.</p>
        </div>
        <AuditPreview />
      </section>
      <section className="audience-strip" aria-label="Who this is for">
        <div className="container audience-inner"><p>Less guesswork.<br /><strong>More direction.</strong></p>
          <ul><li>Small businesses</li><li>Freelancers & creators</li><li>Marketing teams</li><li>SEO professionals</li></ul>
        </div>
      </section>
      <section id="approach" className="container section" aria-labelledby="approach-title">
        <div className="section-heading"><div><p className="eyebrow">SEO you can act on</p>
          <h2 id="approach-title">An audit is only the beginning.</h2></div>
          <p>Every finding should leave you with an answer, not another question.</p></div>
        <div className="benefit-grid">
          <article><span className="feature-icon"><Search aria-hidden="true" /></span><h3>Know what’s wrong.</h3>
            <p>See technical and on-page issues backed by evidence from your website.</p></article>
          <article><span className="feature-icon sage"><Sparkles aria-hidden="true" /></span><h3>Understand why.</h3>
            <p>Get plain-language explanations that connect each issue to your website’s health.</p></article>
          <article><span className="feature-icon soft"><ListChecks aria-hidden="true" /></span><h3>Know what comes next.</h3>
            <p>Use a prioritized action plan to focus your time on meaningful improvements.</p></article>
        </div>
      </section>
      <section id="workflow" className="workflow-section" aria-labelledby="workflow-title">
        <div className="container section">
          <div className="section-heading"><div><p className="eyebrow">The workflow</p><h2 id="workflow-title">From URL to a plan.</h2></div>
            <p>Four straightforward steps. A little more clarity at each one.</p></div>
          <ol className="steps">{steps.map(([number, title, description]) =>
            <li key={number}><span className="step-number" aria-hidden="true">{number}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
        </div>
      </section>
      <section id="roadmap" className="container section" aria-labelledby="roadmap-title">
        <div className="section-heading"><div><p className="eyebrow">Growing thoughtfully</p><h2 id="roadmap-title">A focused start. A bigger vision.</h2></div>
          <p>Start with real website audits and saved action plans. Advanced capabilities will arrive in future releases.</p></div>
        <div className="roadmap-grid">{phases.map(([stage, title, description]) =>
          <article key={stage}><span className="roadmap-stage">{stage}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        <p className="roadmap-note">Future phases will add subscriptions, agency tools, integrations, and continuous monitoring. Pricing will be announced after infrastructure and AI costs are established.</p>
      </section>
      <section className="container closing" aria-labelledby="closing-title">
        <ChartNoAxesColumnIncreasing size={32} aria-hidden="true" />
        <div><p className="eyebrow">The idea behind AI SEO</p><h2 id="closing-title">Don’t just audit websites.<br />Help them grow.</h2></div>
        <a className="button button-outline" href="#approach">Discover the approach <ArrowUpRight size={18} aria-hidden="true" /></a>
      </section>
    </main>
    <footer className="container site-footer"><Brand /><p>Clear findings. Practical actions. Thoughtful growth.</p><a href="#main">Back to top ↑</a></footer>
  </>;
}

