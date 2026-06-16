export const securitySchemes = {
  DashboardAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'Dashboard auth: Bearer JWT from Auth0. Some endpoints may also accept API keys (lvt-...).',
  },
  ApiKeyAuth: {
    type: 'apiKey',
    in: 'header',
    name: 'Authorization',
    description: 'API Key auth: Authorization: Bearer lvt-<key>',
  },
  SlackAuth: {
    type: 'http',
    scheme: 'none',
    description:
      'Slack signed requests verified via x-slack-signature, x-slack-request-timestamp, and verification key.',
  } as any,
  LovatAuth: {
    type: 'http',
    scheme: 'none',
    description:
      'Lovat signed requests verified via x-signature and x-timestamp using server-side signing key.',
  } as any,
} as const;
