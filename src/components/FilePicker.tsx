import { useEffect, useState } from 'react';

import { EditOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Checkbox, Empty, Input, Modal, Segmented, Tag } from 'antd';

import FilePreviewModal, { type EditorMode } from './FilePreviewModal';

import type { FileInfo } from '../types';

import { listFiles } from '../api';
import { fmtSize, fmtTime, inferType } from '../utils';

import './FilePicker.css';

const TYPE_LABEL: Record<string, string> = {
  json: 'JSON',
  text: '文本',
  sse: 'SSE',
};
const TYPE_COLOR: Record<string, string> = {
  json: 'green',
  text: 'default',
  sse: 'geekblue',
};

interface Props {
  dir: string;
  selected: string[];
  onCancel: () => void;
  onOk: (names: string[]) => void;
}

export default function FilePicker({ dir, selected, onCancel, onOk }: Props) {
  const { message } = AntApp.useApp();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(() => !!dir);
  const [checked, setChecked] = useState<string[]>(() => selected);
  const [preview, setPreview] = useState<{
    name: string;
    mode: EditorMode;
  } | null>(null);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!dir) {
      return;
    }
    let alive = true;
    listFiles(dir)
      .then((data) => {
        if (alive) {
          setFiles(data.files);
        }
      })
      .catch(() => {
        if (alive) {
          message.error('读取文件列表失败');
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [dir, message]);

  const load = () => {
    setLoading(true);
    listFiles(dir)
      .then((data) => {
        setFiles(data.files);
      })
      .catch(() => {
        message.error('读取文件列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const toggle = (name: string, value: boolean) => {
    setChecked((prev) => (value ? [...prev, name] : prev.filter((item) => item !== name)));
  };

  const openFile = (name: string, mode: EditorMode) => {
    setPreview({ name, mode });
  };

  const visibleFiles = files.filter((file) => {
    const matchedType = typeFilter === 'all' || inferType(file) === typeFilter;
    const q = keyword.trim().toLowerCase();
    const matchedKeyword =
      !q || file.name.toLowerCase().includes(q) || file.url?.toLowerCase().includes(q) === true;
    return matchedType && matchedKeyword;
  });

  return (
    <>
      <Modal
        cancelText="取消"
        okText={`确定${checked.length ? `（已选 ${String(checked.length)}）` : ''}`}
        open
        title="选择响应文件"
        width={640}
        onCancel={onCancel}
        onOk={() => {
          onOk(checked);
        }}
      >
        <div className="picker-toolbar">
          <span className="mono ellipsis" title={dir}>
            {dir}
          </span>
          <Button icon={<ReloadOutlined spin={loading} />} size="small" type="text" onClick={load}>
            刷新
          </Button>
        </div>
        <div className="picker-filters">
          <Input
            allowClear
            placeholder="搜索文件名或来源 URL"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
            }}
          />
          <Segmented
            options={[
              { value: 'all', label: '全部' },
              { value: 'json', label: 'JSON' },
              { value: 'text', label: '文本' },
              { value: 'sse', label: 'SSE' },
            ]}
            size="small"
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(typeof value === 'string' ? value : 'all');
            }}
          />
        </div>
        {visibleFiles.length === 0 ? (
          <Empty
            className="empty"
            description={
              loading
                ? '加载中…'
                : files.length
                  ? '没有符合筛选条件的文件'
                  : '目录中暂无已保存的响应文件'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="picker-list">
            {visibleFiles.map((file) => {
              const type = inferType(file);
              const selectedFile = checked.includes(file.name);
              return (
                <div className="picker-row" key={file.name}>
                  <Checkbox
                    checked={selectedFile}
                    onChange={(e) => {
                      toggle(file.name, e.target.checked);
                    }}
                  />
                  <button
                    className="picker-main"
                    type="button"
                    onClick={() => {
                      toggle(file.name, !selectedFile);
                    }}
                  >
                    <span className="picker-name mono ellipsis" title={file.url ?? file.name}>
                      {file.name}
                    </span>
                    <span className="picker-meta ellipsis">
                      {file.method ? <Tag style={{ marginRight: 4 }}>{file.method}</Tag> : null}
                      <Tag color={TYPE_COLOR[type]} style={{ marginRight: 4 }}>
                        {TYPE_LABEL[type]}
                      </Tag>
                      {fmtTime(file.mtime)} · {fmtSize(file.size)}
                    </span>
                  </button>
                  <div className="picker-actions">
                    <Button
                      icon={<EyeOutlined />}
                      size="small"
                      type="text"
                      onClick={() => {
                        openFile(file.name, 'preview');
                      }}
                    >
                      预览
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      type="text"
                      onClick={() => {
                        openFile(file.name, 'edit');
                      }}
                    >
                      编辑
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <FilePreviewModal
        dir={dir}
        file={preview?.name ?? null}
        initialMode={preview?.mode}
        onClose={() => {
          setPreview(null);
        }}
        onSaved={load}
      />
    </>
  );
}
