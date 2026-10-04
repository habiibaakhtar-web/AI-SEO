import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Brand from './Brand.jsx';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  const nav = useRef(null);
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    function closeOutside(event) {
      if (open && !nav.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [open]);
  return <header className="site-header">
    <nav className="container nav" aria-label="Main navigation" ref={nav}>
      <Brand />
      <button className="menu-toggle" ref={toggle} type="button"
        aria-expanded={open} aria-controls="main-links"
        aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <div id="main-links" className={`nav-links ${open ? 'is-open' : ''}`}>
        <a href="#approach" onClick={() => setOpen(false)}>Why AI SEO</a>
        <a href="#workflow" onClick={() => setOpen(false)}>How it works</a>
        <a href="#roadmap" onClick={() => setOpen(false)}>Roadmap</a>
        <Link to="/login" onClick={() => setOpen(false)}>Log in</Link>
        <Link className="button button-small" to="/register" onClick={() => setOpen(false)}>
          Get started <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  </header>;
}

