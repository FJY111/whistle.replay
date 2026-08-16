import type Router from '@koa/router';

import getSettings from './cgi/getSettings';
import listFiles from './cgi/listFiles';
import readFile from './cgi/readFile';
import resetRotation from './cgi/resetRotation';
import setActive from './cgi/setActive';
import setMockRules from './cgi/setMockRules';
import setSaveRules from './cgi/setSaveRules';
import writeFile from './cgi/writeFile';

function setupRouter(router: Router): void {
  router.get('/cgi-bin/get-settings', getSettings);
  router.post('/cgi-bin/set-save-rules', setSaveRules);
  router.post('/cgi-bin/set-mock-rules', setMockRules);
  router.post('/cgi-bin/set-active', setActive);
  router.post('/cgi-bin/reset-rotation', resetRotation);
  router.get('/cgi-bin/list-files', listFiles);
  router.get('/cgi-bin/read-file', readFile);
  router.post('/cgi-bin/write-file', writeFile);
}

export = setupRouter;
