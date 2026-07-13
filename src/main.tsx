import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Placeholder entry point. The React UI (shot list, canvases, controls) is
// built in a later stage — this only proves the Vite/TS/React build pipeline
// works end-to-end.
const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element');
}

createRoot(container).render(
  <StrictMode>
    <div>UI stage pending</div>
  </StrictMode>,
);
