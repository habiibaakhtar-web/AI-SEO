import { Link } from 'react-router-dom';
import Brand from '../components/common/Brand.jsx';

export default function NotFound() {
  return <div className="container not-found"><Brand /><main>
    <p className="eyebrow">404 · Page not found</p><h1>Let’s find your way back.</h1>
    <p>This page doesn’t exist. Visit the home page to explore AI SEO.</p>
    <Link className="button" to="/">Go to home</Link>
  </main></div>;
}

