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
        allowOrigins: ['*'],
        allowMethods: ['*'],
        allowHeaders: ['*'],
      },
    });

    /**
     * Catch-all server route
     */
    api.route('ANY /{proxy+}', {
      handler: 'src/lambda.handler',
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
