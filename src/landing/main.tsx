import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/site.css';
import { Landing } from './Landing.tsx';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Landing />
    </StrictMode>,
  );
  // The page is drawn after the browser looked for the #section in the address,
  // so a link straight to a section would land at the top. Look again.
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (id !== '') requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
}
