import { useEffect, useState } from 'react';

import { Drawer, Empty } from 'antd';

import FilePreviewModal from './FilePreviewModal';

import type { FileInfo } from '../types';

import { listFiles } from '../api';
import { fmtTime } from '../utils';

import './SavedFilesDrawer.css';

interface Props {
  dir: string | null;
  onClose: () => void;
}

export default function SavedFilesDrawer({ dir, onClose }: Props) {
  const [loaded, setLoaded] = useState<{ dir: string; files: FileInfo[] } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!dir) {
      return;
    }
    let alive = true;
    const current = dir;
    listFiles(current)
      .then((data) => {
        if (alive) {
          setLoaded({ dir: current, files: data.files });
        }
      })
      .catch(() => {
        if (alive) {
          setLoaded({ dir: current, files: [] });
        }
      });
    return () => {
      alive = false;
    };
  }, [dir]);

  const files = loaded?.dir === dir ? loaded.files : [];
  const loading = dir != null && loaded?.dir !== dir;

  return (
    <>
      <Drawer
        open={dir != null}
        size={460}
        title="已保存文件"
        onClose={() => {
          setPreview(null);
          onClose();
        }}
      >
        <p className="saved-files-dir mono">{dir}</p>
        {loading ? <p className="saved-files-empty">正在读取…</p> : null}
        {!loading && files.length === 0 ? (
          <Empty description="这个目录还没有可回放的文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null}
        <ul className="saved-files-list">
          {files.map((file) => (
            <li key={file.name}>
              <button
                className="saved-file"
                type="button"
                onClick={() => {
                  setPreview(file.name);
                }}
              >
                <span className="saved-file-name mono ellipsis" title={file.name}>
                  {file.name}
                </span>
                <span className="saved-file-meta">
                  {file.method ? <span>{file.method}</span> : null}
                  {file.statusCode ? <span>{file.statusCode}</span> : null}
                  <span className="ellipsis" title={file.pathname ?? file.url ?? ''}>
                    {[file.pathname, file.url].find((item) => item) ?? '无路径'}
                  </span>
                  <span>{fmtTime(file.mtime)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Drawer>
      {dir ? (
        <FilePreviewModal
          dir={dir}
          file={preview}
          onClose={() => {
            setPreview(null);
          }}
        />
      ) : null}
    </>
  );
}
