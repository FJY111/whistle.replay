import { useState } from 'react';

import { Button, Drawer, Input, Select } from 'antd';

import Field from './Field';

import { HTTP_METHODS, type ReplayRule } from '../types';
import { isValidPattern } from '../utils';

import './RuleEditor.css';

interface Props {
  rule: ReplayRule;
  onCancel: () => void;
  onOk: (rule: ReplayRule) => void;
}

interface Errors {
  pattern?: string;
}

export default function ReplayRuleEditor({ rule, onCancel, onOk }: Props) {
  const [draft, setDraft] = useState<ReplayRule>(() => ({ ...rule, methods: [...rule.methods] }));
  const [errors, setErrors] = useState<Errors>({});

  const patch = (part: Partial<ReplayRule>) => {
    setDraft((prev) => ({ ...prev, ...part }));
  };

  function handleSubmit() {
    const next: Errors = {};
    if (!isValidPattern(draft.pattern)) {
      next.pattern = draft.pattern.trim() ? '正则表达式无法编译' : '请输入匹配规则';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      return;
    }
    onOk({
      ...draft,
      pattern: draft.pattern.trim(),
      name: draft.name.trim() || draft.pattern.trim(),
    });
  }

  return (
    <Drawer
      footer={
        <div className="editor-footer">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            确定
          </Button>
        </div>
      }
      open
      size={420}
      title="编辑回放规则"
      onClose={onCancel}
    >
      <Field extra="留空时以匹配规则作为名称" label="名称">
        <Input
          maxLength={64}
          placeholder="例如：商品接口"
          value={draft.name}
          onChange={(event) => {
            patch({ name: event.target.value });
          }}
        />
      </Field>

      <Field
        error={errors.pattern}
        extra="只和路径（pathname）比较。子串如 /api/items，或正则如 /^\\/api\\/items$/。不比较协议、主机和 query。命中才回放。"
        label="路径匹配"
        required
      >
        <Input
          className="mono"
          maxLength={512}
          placeholder="/api/items 或 /正则/i"
          value={draft.pattern}
          onChange={(event) => {
            patch({ pattern: event.target.value });
          }}
        />
      </Field>

      <Field extra="不选表示命中该路径的全部方法都回放" label="HTTP 方法">
        <Select
          allowClear
          mode="multiple"
          options={HTTP_METHODS.map((method) => ({ value: method, label: method }))}
          placeholder="全部方法"
          style={{ width: '100%' }}
          value={draft.methods}
          onChange={(methods) => {
            patch({ methods });
          }}
        />
      </Field>
    </Drawer>
  );
}
