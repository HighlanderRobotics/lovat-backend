import app from './app.js';
import { serve } from 'bun';

const port = process.env.PORT ?? 3000;

serve({
  port,
  fetch: app.fetch,
});

console.log(`Server running on :${port}`);
