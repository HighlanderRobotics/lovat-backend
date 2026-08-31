import { z } from '@hono/zod-openapi';
import type { Table } from 'drizzle-orm';
import { createSchemaFactory } from 'drizzle-zod';

export const {
  createInsertSchema: createDatabaseInsertSchema,
  createSelectSchema: createDatabaseSelectSchema,
  createUpdateSchema: createDatabaseUpdateSchema,
} = createSchemaFactory({ zodInstance: z });

export function deriveModelSchemas<TTable extends Table>(table: TTable, name: string) {
  return {
    select: createDatabaseSelectSchema(table).openapi(name),
    insert: createDatabaseInsertSchema(table).openapi(`${name}Insert`),
    update: createDatabaseUpdateSchema(table).openapi(`${name}Update`),
  };
}
