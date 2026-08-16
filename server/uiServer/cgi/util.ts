import fs from 'node:fs';

export interface DirError {
  ec: number;
  em: string;
}

export const statDir = (dir: string): Promise<DirError | undefined> =>
  new Promise((resolve) => {
    fs.stat(dir, (err, stat) => {
      if (err) {
        resolve({
          ec: 2,
          em: err.code === 'ENOENT' ? `目录不存在：${dir}` : '系统异常，请稍后再试',
        });
        return;
      }
      if (!stat.isDirectory()) {
        resolve({ ec: 3, em: `路径非目录：${dir}` });
        return;
      }
      resolve(undefined);
    });
  });

/** 逐个校验目录列表（忽略空目录），返回首个错误 */
export async function checkDirs(dirs: string[]): Promise<DirError | undefined> {
  for (const dir of dirs) {
    if (!dir) {
      continue;
    }
    const err = await statDir(dir);
    if (err) {
      return err;
    }
  }
  return undefined;
}
