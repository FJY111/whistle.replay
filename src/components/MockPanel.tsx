import { useEffect, useRef, useState } from 'react';

import {
  ApiOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { App as AntApp, Button, Input, Switch, Tag, Tooltip } from 'antd';

import DirtyBar from './DirtyBar';
import EmptyState from './EmptyState';
import FilePreviewModal, { type EditorMode } from './FilePreviewModal';
import MockRuleEditor from './MockRuleEditor';
import RuleCard from './RuleCard';

import type { MockRule } from '../types';

import { resetRotation, setActive, setMockRules } from '../api';
import { genId } from '../types';
import { matchesQuery } from '../utils';

import './Panel.css';

const MODE_LABEL: Record<MockRule['mode'], string> = {
  fixed: '固定',
  'round-robin': '轮换',
  random: '随机',
};

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
  initialActive: boolean;
  initialRules: MockRule[];
  seed: MockRule | null;
  onActiveChange: (active: boolean) => void;
  onSeedConsumed: () => void;
}

const newRule = (): MockRule => ({
  id: genId(),
  name: '',
  enabled: true,
  pattern: '',
  methods: [],
  dir: '',
  files: [],
  mode: 'fixed',
  type: 'json',
  delay: 50,
  delayJitter: 0,
  hitRate: 100,
  statusCode: 200,
  headers: {},
});

export default function MockPanel({
  initialActive,
  initialRules,
  seed,
  onActiveChange,
  onSeedConsumed,
}: Props) {
  const { message } = AntApp.useApp();
  const [active, setActiveState] = useState(initialActive);
  const [rules, setRules] = useState<MockRule[]>(initialRules);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MockRule | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<{
    dir: string;
    file: string;
    mode: EditorMode;
  } | null>(null);

  const activePending = useRef(false);

  const mutate = (next: MockRule[]) => {
    setRules(next);
    setDirty(true);
  };

  const upsert = (rule: MockRule) => {
    mutate(
      rules.some((item) => item.id === rule.id)
        ? rules.map((item) => (item.id === rule.id ? rule : item))
        : [...rules, rule],
    );
    setEditing(null);
  };

  const moveRule = (index: number, offset: number) => {
    const next = [...rules];
    const target = index + offset;
    const current = next[index];
    const swapped = next[target];
    if (target < 0 || target >= next.length || current == null || swapped == null) {
      return;
    }
    next[index] = swapped;
    next[target] = current;
    mutate(next);
  };

  const duplicateRule = (rule: MockRule, index: number) => {
    const copy = {
      ...rule,
      id: genId(),
      name: `${rule.name || rule.pattern} 副本`,
      files: [...rule.files],
      headers: { ...rule.headers },
    };
    const next = [...rules];
    next.splice(index + 1, 0, copy);
    mutate(next);
    setExpanded((prev) => new Set(prev).add(copy.id));
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  function handleToggleActive(checked: boolean) {
    if (activePending.current) {
      return;
    }
    activePending.current = true;
    setActiveState(checked);
    onActiveChange(checked);
    setActive(checked, 'mock')
      .then(() => {
        activePending.current = false;
        message[checked ? 'success' : 'info'](checked ? '已启用本地 Mock' : '已关闭本地 Mock');
      })
      .catch(() => {
        activePending.current = false;
        setActiveState(!checked);
        onActiveChange(!checked);
        message.error('提交失败，请稍后重试');
      });
  }

  function handleSave() {
    setSaving(true);
    setMockRules(rules)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '保存失败');
          return;
        }
        setDirty(false);
        message.success('Mock 规则已更新');
      })
      .catch(() => {
        message.error('提交失败，请稍后重试');
      })
      .finally(() => {
        setSaving(false);
      });
  }

  function handleResetRotation(ruleId: string) {
    resetRotation(ruleId)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '重置失败');
          return;
        }
        message.success('已重置轮换进度');
      })
      .catch(() => {
        message.error('重置失败，请稍后重试');
      });
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && dirty && !saving) {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  const visibleRules = rules.filter((rule) =>
    matchesQuery(query, rule.name, rule.pattern, rule.dir),
  );
  const editingRule = seed ?? editing;

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <ApiOutlined className="panel-icon" />
          <span>Mock 规则</span>
        </div>
        <span className="panel-switch">
          启用
          <Switch checked={active} onChange={handleToggleActive} />
        </span>
      </div>
      <span className="panel-desc">
        命中规则的请求直接返回本地保存的响应，不再访问真实服务器。首个命中的启用规则生效；SSE
        类型按事件逐段推送。
      </span>

      {rules.length > 0 ? (
        <div className="rule-list-toolbar">
          <span>
            {rules.length} 条规则 · {rules.filter((rule) => rule.enabled).length} 条启用
          </span>
          <div className="rule-list-tools">
            <Input
              allowClear
              placeholder="筛选名称或匹配"
              prefix={<SearchOutlined />}
              size="small"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
            <Button
              size="small"
              type="link"
              onClick={() => {
                setExpanded(
                  expanded.size === rules.length
                    ? new Set()
                    : new Set(rules.map((rule) => rule.id)),
                );
              }}
            >
              {expanded.size === rules.length ? '全部收起' : '全部展开'}
            </Button>
          </div>
        </div>
      ) : null}

      {rules.length === 0 ? (
        <EmptyState
          steps={['打开上方总开关', '选择已保存的响应文件', '点击更新配置后拦截请求']}
          title="暂无 Mock 规则"
        />
      ) : visibleRules.length === 0 ? (
        <EmptyState steps={['清空筛选后再试']} title="没有符合筛选的规则" />
      ) : (
        <div className="rule-list">
          {visibleRules.map((rule) => {
            const index = rules.findIndex((item) => item.id === rule.id);
            const firstFile = rule.files[0];
            return (
              <RuleCard
                enabled={rule.enabled}
                expanded={expanded.has(rule.id)}
                extraActions={
                  rule.mode === 'round-robin' ? (
                    <Tooltip title="重置轮换进度">
                      <Button
                        icon={<SyncOutlined />}
                        size="small"
                        type="text"
                        onClick={() => {
                          handleResetRotation(rule.id);
                        }}
                      >
                        重置轮换
                      </Button>
                    </Tooltip>
                  ) : null
                }
                index={index}
                key={rule.id}
                moveDownDisabled={index === rules.length - 1}
                moveUpDisabled={index === 0}
                pattern={rule.pattern}
                summary={
                  <>
                    <FolderOpenOutlined style={{ color: 'var(--ink-3)' }} />
                    <span className="mono ellipsis" title={rule.dir}>
                      {rule.dir || '未设置'}
                    </span>
                    <span>
                      · {rule.delay} ms
                      {rule.delayJitter > 0 ? ` + 0~${String(rule.delayJitter)} ms` : ''}
                    </span>
                    <Tag>{rule.files.length} 个文件</Tag>
                    {firstFile ? (
                      <Button
                        className="quick-file-edit"
                        icon={<EditOutlined />}
                        size="small"
                        type="link"
                        onClick={() => {
                          setPreview({
                            dir: rule.dir,
                            file: firstFile,
                            mode: 'edit',
                          });
                        }}
                      >
                        编辑响应
                      </Button>
                    ) : null}
                  </>
                }
                tags={
                  <>
                    {rule.methods.length ? (
                      rule.methods.map((method) => <Tag key={method}>{method}</Tag>)
                    ) : (
                      <Tag>全部方法</Tag>
                    )}
                    <Tag color="orange">{MODE_LABEL[rule.mode]}</Tag>
                    <Tag color={TYPE_COLOR[rule.type]}>{TYPE_LABEL[rule.type]}</Tag>
                    {rule.statusCode !== 200 ? <Tag color="red">{rule.statusCode}</Tag> : null}
                    {rule.hitRate < 100 ? <Tag>{rule.hitRate}% 命中</Tag> : null}
                  </>
                }
                title={rule.name || rule.pattern}
                onDelete={() => {
                  mutate(rules.filter((item) => item.id !== rule.id));
                }}
                onDuplicate={() => {
                  duplicateRule(rule, index);
                }}
                onEdit={() => {
                  setEditing(rule);
                }}
                onExpand={() => {
                  toggleExpanded(rule.id);
                }}
                onMoveDown={() => {
                  moveRule(index, 1);
                }}
                onMoveUp={() => {
                  moveRule(index, -1);
                }}
                onToggle={(checked) => {
                  mutate(
                    rules.map((item) =>
                      item.id === rule.id ? { ...item, enabled: checked } : item,
                    ),
                  );
                }}
              >
                <div className="rule-detail-grid">
                  <div>
                    <span className="detail-label">来源目录</span>
                    <span className="detail-value mono">{rule.dir}</span>
                  </div>
                  <div>
                    <span className="detail-label">响应行为</span>
                    <span className="detail-value">
                      HTTP {rule.statusCode} · {rule.hitRate}% 命中 ·{' '}
                      {Object.keys(rule.headers).length} 个自定义响应头
                    </span>
                  </div>
                </div>
                <div className="rule-file-grid">
                  {rule.files.map((file, fileIndex) => (
                    <div className="rule-file" key={file}>
                      <span className="rule-file-index">{fileIndex + 1}</span>
                      <button
                        className="rule-file-name mono ellipsis"
                        title={`预览 ${file}`}
                        type="button"
                        onClick={() => {
                          setPreview({
                            dir: rule.dir,
                            file,
                            mode: 'preview',
                          });
                        }}
                      >
                        {file}
                      </button>
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        type="text"
                        onClick={() => {
                          setPreview({ dir: rule.dir, file, mode: 'edit' });
                        }}
                      >
                        编辑
                      </Button>
                    </div>
                  ))}
                  {rule.files.length === 0 ? (
                    <span className="detail-empty">尚未选择响应文件</span>
                  ) : null}
                </div>
              </RuleCard>
            );
          })}
        </div>
      )}

      <Button
        block
        className="add-btn"
        icon={<PlusOutlined />}
        variant="dashed"
        onClick={() => {
          setEditing(newRule());
        }}
      >
        添加 Mock 规则
      </Button>

      {dirty ? <DirtyBar saving={saving} onSave={handleSave} /> : null}

      {editingRule ? (
        <MockRuleEditor
          rule={editingRule}
          onCancel={() => {
            setEditing(null);
            onSeedConsumed();
          }}
          onOk={(rule) => {
            upsert(rule);
            onSeedConsumed();
          }}
        />
      ) : null}
      <FilePreviewModal
        dir={preview?.dir ?? ''}
        file={preview?.file ?? null}
        initialMode={preview?.mode}
        onClose={() => {
          setPreview(null);
        }}
      />
    </section>
  );
}
