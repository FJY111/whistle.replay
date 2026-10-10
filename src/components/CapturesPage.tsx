import { useEffect, useMemo, useState } from 'react';

import { App as AntApp, Button, Input, Popconfirm, Table, Tag } from 'antd';

import FilePreviewModal from './FilePreviewModal';

import type { SavedCapture } from '../types';

import { deleteCapture, listCaptures, setCaptureSkip } from '../api';
import { fmtTime } from '../utils';

import './CapturesPage.css';

const PAGE_SIZE = 20;

export default function CapturesPage() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<SavedCapture[] | null>(null);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<{ dir: string; file: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = () => {
    listCaptures()
      .then((data) => {
        setRows(data.captures);
      })
      .catch(() => {
        setRows([]);
        message.error('读取已保存流量失败');
      });
  };

  useEffect(() => {
    let alive = true;
    listCaptures()
      .then((data) => {
        if (alive) {
          setRows(data.captures);
        }
      })
      .catch(() => {
        if (alive) {
          setRows([]);
          message.error('读取已保存流量失败');
        }
      });
    return () => {
      alive = false;
    };
  }, [message]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const list = rows ?? [];
    if (!text) {
      return list;
    }
    return list.filter((row) => {
      const method = row.method.toLowerCase();
      const pathname = row.pathname.toLowerCase();
      return method.includes(text) || pathname.includes(text);
    });
  }, [query, rows]);

  const run = (key: string, task: Promise<{ ec: number; em?: string }>, done: string) => {
    setBusyKey(key);
    task
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '操作失败');
          return;
        }
        message.success(done);
        load();
      })
      .catch(() => {
        message.error('提交失败，请稍后重试');
      })
      .finally(() => {
        setBusyKey(null);
      });
  };

  return (
    <section className="captures-page">
      <div className="captures-head">
        <div>
          <h2>已保存流量</h2>
          <p>按每个保存目录的回放记录列出。标成不回放后文件还在，回放时跳过这一条。</p>
        </div>
        <Input
          allowClear
          className="captures-filter"
          placeholder="筛选路径或方法"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </div>
      <Table<SavedCapture>
        dataSource={filtered}
        loading={rows == null}
        pagination={{ pageSize: PAGE_SIZE, showSizeChanger: false }}
        rowKey={(row) => `${row.dir}\n${row.file}`}
        scroll={{ x: 880, y: 560 }}
        size="small"
        columns={[
          {
            title: '方法',
            dataIndex: 'method',
            width: 88,
            render: (method: string) => method || '—',
          },
          {
            title: '路径',
            dataIndex: 'pathname',
            ellipsis: true,
            render: (pathname: string) => <span className="mono">{pathname || '—'}</span>,
          },
          {
            title: '状态码',
            dataIndex: 'statusCode',
            width: 80,
            render: (status: number | null) => status ?? '—',
          },
          {
            title: '时间',
            dataIndex: 'time',
            width: 120,
            render: (time: number) => (time ? fmtTime(time) : '—'),
          },
          {
            title: '文件名',
            dataIndex: 'file',
            ellipsis: true,
            render: (file: string) => <span className="mono">{file}</span>,
          },
          {
            title: '回放',
            width: 108,
            render: (_value, row) => {
              if (row.active) {
                return <Tag color="green">当前回放</Tag>;
              }
              if (row.skipReplay) {
                return <Tag>不回放</Tag>;
              }
              if (!row.inReplay) {
                return <Tag>仅索引</Tag>;
              }
              return null;
            },
          },
          {
            title: '操作',
            width: 220,
            render: (_value, row) => {
              const key = `${row.dir}\n${row.file}`;
              const busy = busyKey === key;
              return (
                <span className="captures-actions">
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setPreview({ dir: row.dir, file: row.file });
                    }}
                  >
                    查看
                  </Button>
                  {row.inReplay ? (
                    <Button
                      disabled={busy}
                      size="small"
                      type="link"
                      onClick={() => {
                        run(
                          key,
                          setCaptureSkip(row.dir, row.file, !row.skipReplay),
                          row.skipReplay ? '已恢复回放' : '已标为不回放',
                        );
                      }}
                    >
                      {row.skipReplay ? '恢复回放' : '不回放'}
                    </Button>
                  ) : null}
                  <Popconfirm
                    title="删除这条流量？响应文件、索引和回放记录会一起删掉。"
                    onConfirm={() => {
                      run(key, deleteCapture(row.dir, row.file), '已删除');
                    }}
                  >
                    <Button danger disabled={busy} size="small" type="link">
                      删除
                    </Button>
                  </Popconfirm>
                </span>
              );
            },
          },
        ]}
      />
      {preview ? (
        <FilePreviewModal
          dir={preview.dir}
          file={preview.file}
          onClose={() => {
            setPreview(null);
          }}
        />
      ) : null}
    </section>
  );
}
