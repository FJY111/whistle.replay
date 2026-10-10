import { useEffect, useState } from 'react';

import { PlusOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Input, Tag } from 'antd';

import DirtyBar from './DirtyBar';
import EmptyState from './EmptyState';
import ExcludeRuleEditor from './ExcludeRuleEditor';
import RuleCard from './RuleCard';

import type { ExcludeRule } from '../types';

import { setExcludeRules } from '../api';
import { genId } from '../types';
import { matchesQuery } from '../utils';

import './Panel.css';

interface Props {
  initialRules: ExcludeRule[];
}

const newRule = (): ExcludeRule => ({
  id: genId(),
  name: '',
  enabled: true,
  pattern: '',
  methods: [],
});

export default function ExcludePanel({ initialRules }: Props) {
  const { message } = AntApp.useApp();
  const [rules, setRules] = useState<ExcludeRule[]>(initialRules);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ExcludeRule | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');

  const mutate = (next: ExcludeRule[]) => {
    setRules(next);
    setDirty(true);
  };

  const upsert = (rule: ExcludeRule) => {
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

  const duplicateRule = (rule: ExcludeRule, index: number) => {
    const copy = {
      ...rule,
      id: genId(),
      name: `${rule.name || rule.pattern} 副本`,
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

  function handleSave() {
    setSaving(true);
    setExcludeRules(rules)
      .then((data) => {
        if (data.ec) {
          message.error(data.em ?? '保存失败');
          return;
        }
        setDirty(false);
        message.success('排除规则已更新');
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

  const visibleRules = rules.filter((rule) => matchesQuery(query, rule.name, rule.pattern));

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">
          <StopOutlined className="panel-icon" />
          <span>排除回放</span>
        </div>
      </div>
      <span className="panel-desc">
        已保存的响应会按路径和 HTTP
        方法自动回放最早的一份。命中下面任一启用规则的请求不回放，继续访问真实服务器。
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
          steps={['添加一条排除规则，只填写路径', '需要时再限制 HTTP 方法', '点击更新配置后生效']}
          title="暂无排除规则"
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
                pattern={rule.pattern}
                summary={<span>命中后不回放，继续访问真实服务器</span>}
                tags={
                  <>
                    {rule.methods.length ? (
                      rule.methods.map((method) => <Tag key={method}>{method}</Tag>)
                    ) : (
                      <Tag>全部方法</Tag>
                    )}
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
                    <span className="detail-label">路径匹配</span>
                    <span className="detail-value mono">{rule.pattern}</span>
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
        添加排除规则
      </Button>

      {dirty ? <DirtyBar saving={saving} onSave={handleSave} /> : null}

      {editing ? (
        <ExcludeRuleEditor
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
