import { handle } from 'hono/aws-lambda';
import { createApp } from '../app/create-app';
import { createProductionDependencies } from '../app/dependencies';

const app = createApp(createProductionDependencies());

export const handler = handle(app);
