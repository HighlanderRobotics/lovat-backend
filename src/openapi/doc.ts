import { Context } from 'hono';

const openapiDocHandler = (c: Context) => {
  const specUrl = new URL('/v2/openapi.json', c.req.url).toString();
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lovat API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>html,body,#swagger{height:100%;margin:0}</style>
</head>
<body>
  <div id="swagger"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: '#swagger',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    });
  </script>
</body>
</html>`;
  return c.html(html);
};

export default openapiDocHandler;
