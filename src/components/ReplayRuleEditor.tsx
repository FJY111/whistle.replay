import { useState } from 'react';

import { Button, Drawer, Input, Select } from 'antd';

import Field from './Field';

import { HTTP_METHODS, type ReplayRule } from '../types';
import { isValidPattern } from '../utils';

import './RuleEditor.css';

interface Props {
  rule: ReplayRule;
  title: string;
  methodHint: string;
  onCancel: () => void;
  onOk: (rule: ReplayRule) => void;
}

interface Errors {
  host?: string;
  pattern?: string;
}

export default function ReplayRuleEditor({ rule, title, methodHint, onCancel, onOk }: Props) {
  const [draft, setDraft] = useState<ReplayRule>(() => ({
    ...rule,
    host: rule.host,
    methods: [...rule.methods],
  }));
  const [errors, setErrors] = useState<Errors>({});

  const patch = (part: Partial<ReplayRule>) => {
    setDraft((prev) => ({ ...prev, ...part }));
  };

  function handleSubmit() {
    const host = draft.host.trim();
    const pattern = draft.pattern.trim();
    const next: Errors = {};
    if (host && !isValidPattern(host)) {
      next.host = '正则表达式无法编译';
    } else if (!host && !pattern) {
      next.host = '请填写域名或路径';
    }
    if (pattern && !isValidPattern(pattern)) {
      next.pattern = '正则表达式无法编译';
    } else if (!host && !pattern) {
      next.pattern = '请填写域名或路径';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      return;
    }
    onOk({
      ...draft,
      host,
      pattern,
      name: draft.name.trim() || host || pattern,
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
      title={title}
      onClose={onCancel}
    >
      <Field extra="留空时以域名或路径作为名称" label="名称">
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
        error={errors.host}
        extra="可选。只比较主机名，不含协议和端口。子串如 shop.example，或正则如 /^api\\./。留空表示任意域名。"
        label="域名"
      >
        <Input
          className="mono"
          maxLength={512}
          placeholder="shop.example 或 /正则/i"
          value={draft.host}
          onChange={(event) => {
            patch({ host: event.target.value });
          }}
        />
      </Field>

      <Field
        error={errors.pattern}
        extra="可选。只和路径（pathname）比较。子串如 /api/items，或正则如 /^\\/api\\/items$/。留空表示任意路径。域名和路径都填时必须同时命中。"
        label="路径匹配"
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

      <Field extra={methodHint} label="HTTP 方法">
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
