declare module 'koa-onerror' {
  import type Koa from 'koa';

  function onerror(app: Koa): void;

  export = onerror;
}
