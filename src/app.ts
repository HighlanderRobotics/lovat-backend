import { Hono } from 'hono';
import routes from './routes';
import { RegExpRouter } from 'hono/router/reg-exp-router';

const app = new Hono({
  router: new RegExpRouter(),
});

// API entry point
app.route('/v2', routes);

export default app;
