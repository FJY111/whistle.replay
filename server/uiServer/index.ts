import bodyParser from '@koa/bodyparser';
import Router from '@koa/router';
import Koa from 'koa';
import onerror from 'koa-onerror';
import serve from 'koa-static';
import path from 'node:path';

import setupRouter from './router';

import type { WhistleServer } from '../types/whistle';

function uiServer(server: WhistleServer): void {
  const app = new Koa();
  app.proxy = true;
  onerror(app);
  const router = new Router();
  setupRouter(router);
  app.use(bodyParser({ jsonLimit: '5mb' }));
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(serve(path.join(__dirname, '../../public')));
  const callback = app.callback();
  server.on('request', (req, res) => {
    void callback(req, res);
  });
}

export = uiServer;
