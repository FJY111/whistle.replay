import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import {
  CheckOutlined,
  CodeOutlined,
  EditOutlined,
  EyeOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { App as AntApp, Button, Modal, Segmented, Space } from 'antd';

import { readFile, writeFile } from '../api';

import './FilePreviewModal.css';

const CodePreview = lazy(() => import('./CodePreview'));

interface Props {
  dir: string;
  file: string | null;
  initialMode?: EditorMode;
  onClose: () => void;
  onSaved?: (file: string) => void;
}

interface Preview {
  file: string;
  content: string;
  truncated: boolean;
}

export type EditorMode = 'preview' | 'edit';

export default function FilePreviewModal({
  dir,
  file,
  initialMode = 'preview',
  onClose,
  onSaved,
}: Props) {
  const { message, modal } = AntApp.useApp();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [winSize, setWinSize] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!file) {
      return;
    }
    let alive = true;
    readFile(dir, file)
      .then((data) => {
        if (!alive) {
          return;
        }
        if (data.ec) {
          message.error(data.em ?? '文件读取失败');
          onClose();
          return;
        }
        const nextContent = data.content ?? '';
        setPreview({
          file,
          content: nextContent,
          truncated: !!data.truncated,
        });
        setContent(nextContent);
        setSavedContent(nextContent);
        setMode(initialMode);
      })
      .catch(() => {
        if (alive) {
          message.error('文件读取失败');
          onClose();
        }
      });
    return () => {
      alive = false;
    };
  }, [dir, file, initialMode, message, onClose]);

  const dirty = content !== savedContent;
  const isJson = file?.toLowerCase().endsWith('.json') === true;
  const bodyHeight = Math.max(300, winSize.h - 120 - 55 - 65);
  const editorHeight = Math.max(240, bodyHeight - 24 - 44);

  const handleFormat = () => {
    try {
      setContent(JSON.stringify(JSON.parse(content), null, 2));
      message.success('已使用 2 个空格格式化');
    } catch {
      message.error('JSON 格式不正确，无法格式化');
    }
  };

  const handleSave = useCallback(() => {
    if (!file || saving || preview?.truncated) {
      return;
    }
    setSaving(true);
    writeFile(dir, file, content)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '文件保存失败');
          return;
        }
        setSavedContent(content);
        setPreview({ file, content, truncated: false });
        message.success('响应文件已保存');
        onSaved?.(file);
      })
      .catch(() => {
        message.error('文件保存失败，请稍后重试');
      })
      .finally(() => {
        setSaving(false);
      });
  }, [content, dir, file, message, onSaved, preview?.truncated, saving]);

  useEffect(() => {
    if (!file || mode !== 'edit') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [file, handleSave, mode]);

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    modal.confirm({
      title: '放弃未保存的修改？',
      content: '关闭后，本次对响应文件的修改将不会保留。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      okButtonProps: { danger: true },
      onOk: onClose,
    });
  };

  return (
    <Modal
      footer={
        <div className="file-modal-footer">
          <span className="preview-tip">
            {mode === 'edit' ? '⌘/Ctrl + S 保存' : '预览模式不会修改文件'}
          </span>
          <Space>
            <Button onClick={requestClose}>关闭</Button>
            {mode === 'edit' ? (
              <Button
                disabled={!dirty || !!preview?.truncated}
                icon={dirty ? <SaveOutlined /> : <CheckOutlined />}
                loading={saving}
                type="primary"
                onClick={handleSave}
              >
                {dirty ? '保存文件' : '已保存'}
              </Button>
            ) : null}
          </Space>
        </div>
      }
      open={!!file}
      style={{ top: 60, height: winSize.h - 120, paddingBottom: 0 }}
      styles={{ body: { height: bodyHeight, padding: 12 } }}
      title={
        <div className="file-modal-title">
          <span className="mono ellipsis" title={file ?? ''}>
            {file ?? '响应文件'}
          </span>
          {dirty ? <span className="file-dirty-dot">未保存</span> : null}
        </div>
      }
      width={Math.max(320, winSize.w - 120)}
      onCancel={requestClose}
    >
      {preview?.file === file ? (
        <div className="file-editor-shell">
          <div className="file-editor-toolbar">
            <Segmented
              options={[
                {
                  value: 'preview',
                  label: '预览',
                  icon: <EyeOutlined />,
                },
                {
                  value: 'edit',
                  label: '编辑',
                  icon: <EditOutlined />,
                  disabled: preview.truncated,
                },
              ]}
              value={mode}
              onChange={(value) => {
                setMode(value as EditorMode);
              }}
            />
            <div className="file-editor-actions">
              {preview.truncated ? (
                <span className="preview-tip">文件超过 256 KB，仅可预览，暂不支持在线编辑。</span>
              ) : null}
              {!preview.truncated && mode === 'edit' && isJson ? (
                <Button icon={<CodeOutlined />} size="small" onClick={handleFormat}>
                  格式化（2 空格）
                </Button>
              ) : null}
            </div>
          </div>
          <Suspense fallback={<div className="preview-tip">编辑器加载中…</div>}>
            <CodePreview
              content={mode === 'edit' ? content : preview.content}
              editable={mode === 'edit'}
              height={editorHeight}
              name={file}
              onChange={setContent}
            />
          </Suspense>
        </div>
      ) : (
        <div className="preview-loading">正在读取响应文件…</div>
      )}
    </Modal>
  );
}
