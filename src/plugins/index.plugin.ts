import type { FastifyInstance } from "fastify";
import { registerSecurityPlugins } from "./security";
import { registerRequestLogging } from "./request-logging";
import { registerSwaggerPlugins } from "./swagger";
import { registerDecorators } from "./decorators";

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  registerDecorators(app);
  await registerSecurityPlugins(app, isProduction);
  registerRequestLogging(app);
  await registerSwaggerPlugins(app);
}


