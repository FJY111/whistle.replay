import { useState } from 'react';

import { Button, Checkbox, Collapse, Drawer, Input, InputNumber, Select, Switch } from 'antd';

import Field from './Field';

import { getRecentDirs, rememberDir } from '../recentDirs';
import { HTTP_METHODS, type SaveRule, type SaveType } from '../types';
import { isValidPattern, isValidStatusCodes } from '../utils';

import './RuleEditor.css';

const SAVE_TYPE_OPTIONS: { value: SaveType; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: '文本' },
  { value: 'sse', label: 'SSE 流式' },
];

interface Props {
  rule: SaveRule;
  onCancel: () => void;
  onOk: (rule: SaveRule) => void;
}

interface Errors {
  pattern?: string;
  dir?: string;
  statusCodes?: string;
}

export default function SaveRuleEditor({ rule, onCancel, onOk }: Props) {
  const [draft, setDraft] = useState<SaveRule>(() => ({ ...rule }));
  const [errors, setErrors] = useState<Errors>({});
  const [recentDirs] = useState(getRecentDirs);

  const patch = (p: Partial<SaveRule>) => {
    setDraft((prev) => ({ ...prev, ...p }));
  };

  function handleSubmit() {
    const next: Errors = {};
    if (!isValidPattern(draft.pattern)) {
      next.pattern = draft.pattern.trim() ? '正则表达式无法编译' : '请输入匹配规则';
    }
    if (!draft.dir.trim()) {
      next.dir = '请输入保存目录';
    }
    if (!isValidStatusCodes(draft.statusCodes)) {
      next.statusCodes = '请输入合法状态码，例如 200-299,304,404';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      return;
    }
    const dir = draft.dir.trim();
    rememberDir(dir);
    onOk({
      ...draft,
      pattern: draft.pattern.trim(),
      dir,
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
      title="编辑保存规则"
      onClose={onCancel}
    >
      <Field extra="留空时以匹配规则作为名称" label="名称">
        <Input
          maxLength={64}
          placeholder="例如：用户接口"
          value={draft.name}
          onChange={(e) => {
            patch({ name: e.target.value });
          }}
        />
      </Field>

      <Field
        error={errors.pattern}
        extra="支持子串（如 /api/user）或正则（如 /\\/api\\/user\\/\\d+/i）"
        label="URL 匹配"
        required
      >
        <Input
          className="mono"
          maxLength={512}
          placeholder="/api/user 或 /正则/i"
          value={draft.pattern}
          onChange={(e) => {
            patch({ pattern: e.target.value });
          }}
        />
      </Field>

      <Field extra="不选表示匹配全部方法" label="HTTP 方法">
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

      <Field error={errors.dir} extra="本地绝对路径，需已存在" label="保存目录" required>
        <Input
          className="mono"
          maxLength={512}
          placeholder="/Users/you/sessions"
          value={draft.dir}
          onChange={(e) => {
            patch({ dir: e.target.value });
          }}
        />
        {recentDirs.length > 0 ? (
          <div className="recent-dirs">
            {recentDirs.map((dir) => (
              <Button
                key={dir}
                size="small"
                type="link"
                onClick={() => {
                  patch({ dir });
                }}
              >
                {dir}
              </Button>
            ))}
          </div>
        ) : null}
      </Field>

      <Field label="保存类型">
        <Checkbox.Group
          options={SAVE_TYPE_OPTIONS}
          value={draft.saveTypes}
          onChange={(vals) => {
            patch({ saveTypes: vals });
          }}
        />
      </Field>

      <Field extra="响应体超过该大小则跳过，0 表示不限" label="大小上限">
        <div className="field-with-unit">
          <InputNumber
            max={10240}
            min={0}
            style={{ width: 160 }}
            value={draft.maxBodyKB}
            onChange={(val) => {
              patch({ maxBodyKB: typeof val === 'number' ? val : 0 });
            }}
          />
          <span>KB</span>
        </div>
      </Field>

      <Collapse
        className="advanced-collapse"
        ghost
        items={[
          {
            key: 'advanced',
            label: '高级保存选项',
            children: (
              <>
                <Field
                  error={errors.statusCodes}
                  extra="支持单个状态码或区间，逗号分隔；留空表示全部"
                  label="响应状态码"
                >
                  <Input
                    className="mono"
                    placeholder="例如：200-299,304"
                    value={draft.statusCodes}
                    onChange={(e) => {
                      patch({ statusCodes: e.target.value });
                    }}
                  />
                </Field>
                <Field
                  extra="保存有效 JSON 时使用 2 空格缩进，便于阅读和版本对比"
                  label="格式化 JSON"
                >
                  <Switch
                    checked={draft.prettyJson}
                    onChange={(prettyJson) => {
                      patch({ prettyJson });
                    }}
                  />
                </Field>
              </>
            ),
          },
        ]}
      />

      <Field label="启用该规则">
        <Switch
          checked={draft.enabled}
          onChange={(enabled) => {
            patch({ enabled });
          }}
        />
      </Field>
    </Drawer>
  );
}
