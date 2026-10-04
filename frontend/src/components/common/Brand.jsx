import { ChartNoAxesColumnIncreasing } from 'lucide-react';

export default function Brand() {
  return <a className="brand" href="/" aria-label="AI SEO home">
    <span className="brand-icon"><ChartNoAxesColumnIncreasing size={23} aria-hidden="true" /></span>
    <span>AI SEO<span className="brand-subtitle">Website Growth Agent</span></span>
  </a>;
}

