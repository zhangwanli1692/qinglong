import 'reflect-metadata';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Container } from 'typedi';
import config from './config';
import Logger from './loaders/logger';
import { monitoringMiddleware } from './middlewares/monitoring';
import { type HttpServerService } from './services/http';

// 👇 新增：健康检查路由
const app = express();

// 设置中间件
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(monitoringMiddleware);

// 👇 关键：添加 Leapcell 健康检查路由
app.get('/kaithhealthcheck', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// 加载应用路由（你原来的逻辑）
(async () => {
  try {
    await require('./loaders/db').default(); // 初始化数据库
    await require('./loaders/app').default({ app }); // 注册所有 API 路由
  } catch (error) {
    Logger.error('Failed to initialize application routes:', error);
    process.exit(1);
  }
})();

// 启动 HTTP 服务
const startServer = async () => {
  const { HttpServerService } = await import('./services/http');
  const httpServerService = Container.get(HttpServerService);

  const PORT = process.env.PORT || 5700;

  try {
    const server = await httpServerService.initialize(app, PORT);
    await require('./loaders/server').default({ server });

    Logger.info(`🚀 HTTP Server running on http://0.0.0.0:${PORT}`);
    Logger.info(`✅ Health check endpoint: http://0.0.0.0:${PORT}/kaithhealthcheck`);
  } catch (error) {
    Logger.error('Failed to start HTTP server:', error);
    process.exit(1);
  }
};

startServer().catch((error) => {
  Logger.error('Application failed to start:', error);
  process.exit(1);
});
