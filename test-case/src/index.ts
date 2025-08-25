import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import path from 'path';
import routes from './routes';
import { initializeDb } from './utils/db';
import config from './config';

async function start() {
  try {
    // --- ЛОГ КОНФІГУРАЦІЇ ---
    console.log(`Starting server in ${config.server.env} mode`);

    // --- ІНІТ СХОВИЩА ---
    await initializeDb();

    // --- FASTIFY ---
    const fastify = Fastify({
      logger: {
        level: config.logger.level,
        transport: config.isDevelopment
            ? {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
            }
            : undefined,
      },
    });

    // --- CORS (простий, щоб не ловити проблеми) ---
    await fastify.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // --- multipart (обмеження з конфіга) ---
    await fastify.register(multipart, {
      limits: { fileSize: config.upload.maxFileSize },
    });

    // --- СТАТИКА ДЛЯ АПЛОАДІВ (/api/files/...) ---
    await fastify.register(fastifyStatic, {
      root: config.storage.uploadsDir, // налаштовано через utils/db.ts + config
      prefix: '/api/files/',
      decorateReply: false,
    });

    // --- SWAGGER ---
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'Music Tracks API',
          description: 'API for managing music tracks',
          version: '1.0.0',
        },
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/documentation',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });

    // --- API РОУТИ ---
    await fastify.register(routes);

    // --- СТАТИКА FRONTEND (frontend/dist) ---
    // __dirname тут вказує на test-case/dist після компіляції TS.
    // Тому фронт шукаємо: ../../frontend/dist відносно цього файлу.
    const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

    await fastify.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/', // віддавати index.html, assets, і т.д.
      decorateReply: false,
    });

    // --- HEALTHCHECK ---
    //fastify.get('/health', async () => ({ ok: true }));

    // --- SPA FALLBACK ---
    fastify.setNotFoundHandler((request, reply) => {
      reply.sendFile('index.html');
    });

    // --- СТАРТ СЕРВЕРА ---
    const port = Number(process.env.PORT || config.server.port || 8000);
    const host = process.env.HOST || config.server.host || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`Server is running on http://${host}:${port}`);
    console.log(`Swagger docs  → http://${host}:${port}/documentation`);
    console.log(`Health check  → http://${host}:${port}/health`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();
