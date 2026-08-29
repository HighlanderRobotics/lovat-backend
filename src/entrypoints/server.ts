import { serve } from 'bun';
import { createApp } from '../app/create-app';
import { createProductionDependencies } from '../app/dependencies';
import { loadEnvironment } from '../platform/config/environment';

const environment = loadEnvironment();
const app = createApp(createProductionDependencies());

serve({
  port: environment.PORT,
  fetch: app.fetch,
});

console.log(`Server running on :${environment.PORT}`);
