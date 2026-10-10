import { useEffect, useRef, useState } from 'react';

import { PlayCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Input, Switch, Tag } from 'antd';

import DirtyBar from './DirtyBar';
import EmptyState from './EmptyState';
import ReplayRuleEditor from './ReplayRuleEditor';
import RuleCard from './RuleCard';

import type { ReplayRule } from '../types';

import { setActive, setReplayRules } from '../api';
import { genId } from '../types';
import { matchesQuery } from '../utils';

import './Panel.css';

interface Props {
  initialActive: boolean;
  initialRules: ReplayRule[];
  onActiveChange: (active: boolean) => void;
}

const newRule = (): ReplayRule => ({
  id: genId(),
  name: '',
  enabled: true,
  host: '',
  pattern: '',
  methods: [],
});

function matchLabel(rule: ReplayRule): string {
  if (rule.host && rule.pattern) {
    return `${rule.host} ${rule.pattern}`;
  }
  if (rule.host) {
    return `${rule.host} · 任意路径`;
  }
  return `${rule.pattern} · 任意域名`;
}

export default function ReplayPanel({ initialActive, initialRules, onActiveChange }: Props) {
  const { message } = AntApp.useApp();
  const [active, setActiveState] = useState(initialActive);
  const [rules, setRules] = useState<ReplayRule[]>(initialRules);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ReplayRule | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const activePending = useRef(false);

  const mutate = (next: ReplayRule[]) => {
    setRules(next);
    setDirty(true);
  };

  const upsert = (rule: ReplayRule) => {
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

  const duplicateRule = (rule: ReplayRule, index: number) => {
    const copy = {
      ...rule,
      id: genId(),
      name: `${rule.name || rule.host || rule.pattern} 副本`,
      methods: [...rule.methods],
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
    setActive(checked, 'replay')
      .then(() => {
        activePending.current = false;
        message[checked ? 'success' : 'info'](checked ? '已启用回放' : '已关闭回放');
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
    setReplayRules(rules)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '保存失败');
          return;
        }
        setDirty(false);
        message.success('回放规则已更新');
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
    matchesQuery(query, rule.name, rule.host, rule.pattern),
  );
  const hasEnabled = rules.some((rule) => rule.enabled);
  const statusText = !active
    ? '回放已关闭，请求继续访问真实服务器。'
    : hasEnabled
      ? '只有命中下面启用规则的请求才会回放。'
      : '开关已开，但没有启用的白名单，请求继续访问真实服务器。';

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <PlayCircleOutlined className="panel-icon" />
          <span>需要回放</span>
        </div>
        <span className="panel-switch">
          启用
          <Switch checked={active} onChange={handleToggleActive} />
        </span>
      </div>
      <span className="panel-desc">
        {statusText}
        白名单可按域名、路径或两者一起匹配。域名只比较主机名，路径只比较 pathname，都支持子串或
        /正则/i。两者都填时必须同时命中，还可限制 HTTP 方法。未命中则访问真实服务器。
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
          steps={[
            '打开上方回放开关',
            '添加一条白名单，填写域名、路径，或两者都填',
            '点击更新配置后，命中的请求才会回放',
          ]}
          title="暂无回放规则"
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
                index={index}
                key={rule.id}
                moveDownDisabled={index === rules.length - 1}
                moveUpDisabled={index === 0}
                pattern={matchLabel(rule)}
                summary={
                  <span>
                    {rule.host && rule.pattern
                      ? '域名和路径都命中后才回放最新的一条'
                      : '命中后才回放最新的一条'}
                  </span>
                }
                tags={
                  <>
                    {rule.methods.length ? (
                      rule.methods.map((method) => <Tag key={method}>{method}</Tag>)
                    ) : (
                      <Tag>全部方法</Tag>
                    )}
                  </>
                }
                title={rule.name || rule.host || rule.pattern}
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
                    <span className="detail-label">域名</span>
                    <span className="detail-value mono">{rule.host || '任意域名'}</span>
                  </div>
                  <div>
                    <span className="detail-label">路径匹配</span>
                    <span className="detail-value mono">{rule.pattern || '任意路径'}</span>
                  </div>
                  <div>
                    <span className="detail-label">方法</span>
                    <span className="detail-value">
                      {rule.methods.length ? rule.methods.join(', ') : '全部方法'}
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
        添加回放规则
      </Button>

      {dirty ? <DirtyBar saving={saving} onSave={handleSave} /> : null}

      {editing ? (
        <ReplayRuleEditor
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
