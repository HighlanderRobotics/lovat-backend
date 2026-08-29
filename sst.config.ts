/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    const stage = input?.stage ?? 'dev';

    return {
      name: 'lovat-backend',
      stage,
      home: 'aws',
      removal: stage === 'production' ? 'retain' : 'remove',
      protect: stage === 'production',
    };
  },

  async run() {
    /**
     * VPC (required for Postgres)
     */
    const vpc = new sst.aws.Vpc('vpc', {
      nat: 'managed', // required for outbound internet
    });

    /**
     * Postgres (RDS)
     */
    const postgres = new sst.aws.Postgres('postgres', {
      vpc,
      version: '17',
    });

    /**
     * Redis
     */
    const redis = new sst.aws.Redis('redis', {
      vpc,
    });

    /**
     * HTTP API
     */
    const api = new sst.aws.ApiGatewayV2('api', {
      cors: {
        allowOrigins:
          $app.stage === 'production'
            ? ['https://lovat.app', 'https://www.lovat.app']
            : ['http://localhost:3000', 'http://localhost:5173'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['authorization', 'content-type', 'x-request-id'],
      },
    });

    /**
     * Catch-all server route
     */
    api.route('ANY /{proxy+}', {
      handler: 'src/entrypoints/lambda.handler',
      vpc,

      environment: {
        PGHOST: postgres.host,
        PGPORT: postgres.port.toString(),
        PGUSER: postgres.username,
        PGPASSWORD: postgres.password,
        PGDATABASE: postgres.database,
        REDIS_HOST: redis.host,
        REDIS_PORT: redis.port.toString(),
        STAGE: $app.stage,
        NODE_ENV: $app.stage === 'production' ? 'production' : 'development',
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN ?? '',
        AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE ?? 'https://api.lovat.app',
        API_VERSION: '0.1.0',
      },

      link: [postgres, redis],
    });

    return {
      apiUrl: api.url,
      postgresHost: postgres.host,
      redisHost: redis.host,
    };
  },
});
