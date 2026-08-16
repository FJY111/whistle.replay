import type { ReactNode } from 'react';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm, Switch, Tooltip } from 'antd';

import './RuleCard.css';

interface Props {
  index: number;
  title: string;
  pattern: string;
  enabled: boolean;
  expanded: boolean;
  tags: ReactNode;
  summary: ReactNode;
  children: ReactNode;
  extraActions?: ReactNode;
  onToggle: (enabled: boolean) => void;
  onExpand: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  moveUpDisabled: boolean;
  moveDownDisabled: boolean;
}

export default function RuleCard({
  index,
  title,
  pattern,
  enabled,
  expanded,
  tags,
  summary,
  children,
  extraActions,
  onToggle,
  onExpand,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  moveUpDisabled,
  moveDownDisabled,
}: Props) {
  return (
    <article className={`rule-card${enabled ? '' : ' off'}`}>
      <div className="rule-card-main">
        <button
          aria-expanded={expanded}
          aria-label={expanded ? '收起规则详情' : '展开规则详情'}
          className="rule-expand"
          type="button"
          onClick={onExpand}
        >
          {expanded ? <DownOutlined /> : <RightOutlined />}
        </button>
        <span className="rule-order">{index + 1}</span>
        <div className="rule-card-content">
          <div className="rule-title-line">
            <span className="rule-name" title={title}>
              {title}
            </span>
            <span className="rule-tags">{tags}</span>
          </div>
          <button className="rule-pattern mono" title={pattern} type="button" onClick={onExpand}>
            {pattern}
          </button>
          <div className="rule-summary">{summary}</div>
        </div>
        <div className="rule-card-controls">
          <Switch
            aria-label={enabled ? '停用规则' : '启用规则'}
            checked={enabled}
            size="small"
            onChange={onToggle}
          />
          <Tooltip title="编辑">
            <Button icon={<EditOutlined />} size="small" type="text" onClick={onEdit} />
          </Tooltip>
        </div>
      </div>

      {expanded ? (
        <div className="rule-detail">
          <div className="rule-detail-body">{children}</div>
          <div className="rule-detail-actions">
            <span className="rule-detail-hint">规则按列表顺序匹配</span>
            <div>
              {extraActions}
              <Tooltip title="上移">
                <Button
                  disabled={moveUpDisabled}
                  icon={<ArrowUpOutlined />}
                  size="small"
                  type="text"
                  onClick={onMoveUp}
                />
              </Tooltip>
              <Tooltip title="下移">
                <Button
                  disabled={moveDownDisabled}
                  icon={<ArrowDownOutlined />}
                  size="small"
                  type="text"
                  onClick={onMoveDown}
                />
              </Tooltip>
              <Tooltip title="复制规则">
                <Button icon={<CopyOutlined />} size="small" type="text" onClick={onDuplicate} />
              </Tooltip>
              <Popconfirm cancelText="取消" okText="删除" title="删除该规则？" onConfirm={onDelete}>
                <Button danger icon={<DeleteOutlined />} size="small" type="text" />
              </Popconfirm>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
