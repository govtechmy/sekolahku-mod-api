import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as config from "./config/index.config";
import * as plugins from "./plugins/index.plugin";
import { registerErrorHandler } from "./middleware/errorHandler";
import { registerApiRoutes } from "./routes/index.route";

 

async function buildServer(): Promise<FastifyInstance> { //build the server
  const { isProduction } = config.env;
  const app = Fastify({ logger: config.loggerOptions(isProduction) }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await plugins.registerAllPlugins(app, isProduction);
  registerErrorHandler(app);
  await registerApiRoutes(app);
  return app;
}

async function start() { //start the server
  const portFromEnv = config.env.PORT;

  await config.connectToDatabase();
  const app = await buildServer();

  try {
    await app.listen({ port: portFromEnv, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start(); //start the server

export type { FastifyInstance };


