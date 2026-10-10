import { useEffect, useRef, useState } from 'react';

import {
  CloudDownloadOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { App as AntApp, Button, Input, Switch, Tag } from 'antd';

import DirtyBar from './DirtyBar';
import EmptyState from './EmptyState';
import RuleCard from './RuleCard';
import SavedFilesDrawer from './SavedFilesDrawer';
import SaveRuleEditor from './SaveRuleEditor';

import type { SaveRule } from '../types';

import { setActive, setSaveRules } from '../api';
import { genId } from '../types';
import { matchesQuery } from '../utils';

import './Panel.css';

const TYPE_LABEL: Record<string, string> = {
  json: 'JSON',
  text: '文本',
  sse: 'SSE',
};

interface Props {
  initialActive: boolean;
  initialRules: SaveRule[];
  onActiveChange: (active: boolean) => void;
}

const newRule = (): SaveRule => ({
  id: genId(),
  name: '',
  enabled: true,
  pattern: '',
  methods: [],
  dir: '',
  saveTypes: ['json', 'text'],
  maxBodyKB: 0,
  statusCodes: '',
  prettyJson: false,
});

export default function SavePanel({ initialActive, initialRules, onActiveChange }: Props) {
  const { message } = AntApp.useApp();
  const [active, setActiveState] = useState(initialActive);
  const [rules, setRules] = useState<SaveRule[]>(initialRules);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SaveRule | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [filesDir, setFilesDir] = useState<string | null>(null);

  const activePending = useRef(false);

  const mutate = (next: SaveRule[]) => {
    setRules(next);
    setDirty(true);
  };

  const upsert = (rule: SaveRule) => {
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

  const duplicateRule = (rule: SaveRule, index: number) => {
    const copy = {
      ...rule,
      id: genId(),
      name: `${rule.name || rule.pattern} 副本`,
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
    setActive(checked, 'save')
      .then(() => {
        activePending.current = false;
        message[checked ? 'success' : 'info'](checked ? '已启用自动保存' : '已关闭自动保存');
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
    setSaveRules(rules)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '保存失败');
          return;
        }
        setDirty(false);
        message.success('保存规则已更新');
      })
      .catch(() => {
        message.error('提交失败，请稍后重试');
      })
      .finally(() => {
        setSaving(false);
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

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <CloudDownloadOutlined className="panel-icon" />
          <span>保存规则</span>
        </div>
        <span className="panel-switch">
          启用
          <Switch checked={active} onChange={handleToggleActive} />
        </span>
      </div>
      <span className="panel-desc">
        命中规则的响应体会写入对应目录，并记下状态码、响应头和请求侧信息。是否回放由右侧「需要回放」开关和白名单决定。URL
        匹配仍是子串或正则，作用在完整 URL 上。
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
          steps={['打开上方总开关', '添加一条保存规则并填写目录', '点击更新配置后开始抓包']}
          title="暂无保存规则"
        />
      ) : visibleRules.length === 0 ? (
        <EmptyState steps={['清空筛选后再试']} title="没有符合筛选的规则" />
      ) : (
        <div className="rule-list">
          {visibleRules.map((rule) => {
            const index = rules.findIndex((item) => item.id === rule.id);
            return (
              <RuleCard
                enabled={rule.enabled}
                expanded={expanded.has(rule.id)}
                extraActions={
                  <Button
                    disabled={!rule.dir}
                    size="small"
                    type="link"
                    onClick={() => {
                      setFilesDir(rule.dir);
                    }}
                  >
                    已保存文件
                  </Button>
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
                    {rule.maxBodyKB > 0 ? (
                      <Tag style={{ flex: 'none' }}>≤ {rule.maxBodyKB} KB</Tag>
                    ) : null}
                    {rule.prettyJson ? <Tag color="cyan">格式化 JSON</Tag> : null}
                  </>
                }
                tags={
                  <>
                    {rule.methods.length ? (
                      rule.methods.map((method) => <Tag key={method}>{method}</Tag>)
                    ) : (
                      <Tag>全部方法</Tag>
                    )}
                    {rule.saveTypes.map((type) => (
                      <Tag
                        color={type === 'json' ? 'green' : type === 'sse' ? 'geekblue' : 'default'}
                        key={type}
                      >
                        {TYPE_LABEL[type]}
                      </Tag>
                    ))}
                    {rule.statusCodes ? <Tag color="purple">{rule.statusCodes}</Tag> : null}
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
                    <span className="detail-label">匹配范围</span>
                    <span className="detail-value mono">{rule.pattern}</span>
                  </div>
                  <div>
                    <span className="detail-label">保存目录</span>
                    <span className="detail-value mono">{rule.dir}</span>
                  </div>
                  <div>
                    <span className="detail-label">响应状态</span>
                    <span className="detail-value">{rule.statusCodes || '全部状态码'}</span>
                  </div>
                  <div>
                    <span className="detail-label">大小限制</span>
                    <span className="detail-value">
                      {rule.maxBodyKB > 0 ? `${String(rule.maxBodyKB)} KB` : '不限制'}
                    </span>
                  </div>
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
        添加保存规则
      </Button>

      {dirty ? <DirtyBar saving={saving} onSave={handleSave} /> : null}

      <SavedFilesDrawer
        dir={filesDir}
        onClose={() => {
          setFilesDir(null);
        }}
      />

      {editing ? (
        <SaveRuleEditor
          rule={editing}
          onCancel={() => {
            setEditing(null);
          }}
          onOk={upsert}
        />
      ) : null}
    </section>
  );
}
