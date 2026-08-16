import { useState } from 'react';

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  EditOutlined,
  EyeOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Collapse, Drawer, Input, InputNumber, Radio, Select, Switch, Tooltip } from 'antd';

import Field from './Field';
import FilePicker from './FilePicker';
import FilePreviewModal, { type EditorMode } from './FilePreviewModal';

import { getRecentDirs, rememberDir } from '../recentDirs';
import { HTTP_METHODS, type MockMode, type MockRule, type MockType } from '../types';
import { isValidPattern } from '../utils';

import './RuleEditor.css';

const MODE_OPTIONS: { value: MockMode; label: string; hint: string }[] = [
  { value: 'fixed', label: '固定', hint: '始终返回第一个文件' },
  { value: 'round-robin', label: '轮换', hint: '按列表顺序依次返回' },
  { value: 'random', label: '随机', hint: '每次随机返回一个' },
];

const TYPE_OPTIONS: { value: MockType; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: '文本' },
  { value: 'sse', label: 'SSE 流式' },
];

interface Props {
  rule: MockRule;
  onCancel: () => void;
  onOk: (rule: MockRule) => void;
}

interface Errors {
  pattern?: string;
  dir?: string;
  files?: string;
  headers?: string;
}

export default function MockRuleEditor({ rule, onCancel, onOk }: Props) {
  const [draft, setDraft] = useState<MockRule>(() => ({
    ...rule,
    files: [...rule.files],
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openFile, setOpenFile] = useState<{
    name: string;
    mode: EditorMode;
  } | null>(null);
  const [headersText, setHeadersText] = useState(() =>
    Object.keys(rule.headers).length ? JSON.stringify(rule.headers, null, 2) : '',
  );
  const [recentDirs] = useState(getRecentDirs);

  const patch = (p: Partial<MockRule>) => {
    setDraft((prev) => ({ ...prev, ...p }));
  };

  const moveFile = (index: number, offset: number) => {
    const files = [...draft.files];
    const target = index + offset;
    const current = files[index];
    const swapped = files[target];
    if (target < 0 || target >= files.length || current == null || swapped == null) {
      return;
    }
    files[index] = swapped;
    files[target] = current;
    patch({ files });
  };

  function handleSubmit() {
    const next: Errors = {};
    if (!isValidPattern(draft.pattern)) {
      next.pattern = draft.pattern.trim() ? '正则表达式无法编译' : '请输入匹配规则';
    }
    if (!draft.dir.trim()) {
      next.dir = '请输入文件来源目录';
    }
    if (!draft.files.length) {
      next.files = '请至少选择一个响应文件';
    }
    let headers: Record<string, string> = {};
    if (headersText.trim()) {
      try {
        const value = JSON.parse(headersText) as unknown;
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error();
        }
        headers = Object.fromEntries(Object.entries(value).map(([key, val]) => [key, String(val)]));
      } catch {
        next.headers = '请输入 JSON 对象，例如 {"x-mock":"sake"}';
      }
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
      headers,
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
      size={440}
      title="编辑 Mock 规则"
      onClose={onCancel}
    >
      <Field extra="留空时以匹配规则作为名称" label="名称">
        <Input
          maxLength={64}
          placeholder="例如：用户列表"
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

      <Field error={errors.dir} extra="本地绝对路径，需已存在" label="文件来源目录" required>
        <div className="dir-row">
          <Input
            className="mono"
            maxLength={512}
            placeholder="/Users/you/sessions"
            value={draft.dir}
            onChange={(e) => {
              patch({ dir: e.target.value });
            }}
          />
          <Button
            disabled={!draft.dir.trim()}
            icon={<UnorderedListOutlined />}
            onClick={() => {
              setPickerOpen(true);
            }}
          >
            选择文件
          </Button>
        </div>
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

      <Field
        error={errors.files}
        extra={
          draft.mode !== 'fixed' ? '列表顺序即轮换顺序，可上下调整' : '固定模式下始终返回第一个文件'
        }
        label="响应文件"
        required
      >
        {draft.files.length === 0 ? (
          <div className="sel-list">
            <div className="sel-empty">尚未选择文件</div>
          </div>
        ) : (
          <div className="sel-list">
            {draft.files.map((file, index) => (
              <div className="sel-row" key={file}>
                <span className="sel-idx">{index + 1}</span>
                <span className="sel-name mono ellipsis" title={file}>
                  {file}
                </span>
                <Tooltip title="预览文件">
                  <Button
                    icon={<EyeOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      setOpenFile({ name: file, mode: 'preview' });
                    }}
                  />
                </Tooltip>
                <Tooltip title="编辑文件">
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      setOpenFile({ name: file, mode: 'edit' });
                    }}
                  />
                </Tooltip>
                <Tooltip title="上移">
                  <Button
                    disabled={index === 0}
                    icon={<ArrowUpOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      moveFile(index, -1);
                    }}
                  />
                </Tooltip>
                <Tooltip title="下移">
                  <Button
                    disabled={index === draft.files.length - 1}
                    icon={<ArrowDownOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      moveFile(index, 1);
                    }}
                  />
                </Tooltip>
                <Tooltip title="移除">
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    size="small"
                    type="text"
                    onClick={() => {
                      patch({
                        files: draft.files.filter((item) => item !== file),
                      });
                    }}
                  />
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field
        extra={MODE_OPTIONS.find((option) => option.value === draft.mode)?.hint}
        label="返回模式"
      >
        <Radio.Group
          buttonStyle="solid"
          optionType="button"
          options={MODE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={draft.mode}
          onChange={(e) => {
            patch({ mode: e.target.value as MockMode });
          }}
        />
      </Field>

      <Field label="响应类型">
        <Select
          options={TYPE_OPTIONS}
          style={{ width: 160 }}
          value={draft.type}
          onChange={(type) => {
            patch({ type });
          }}
        />
      </Field>

      <Field
        extra={
          draft.type === 'sse' ? 'SSE 事件逐段推送的间隔时间' : '返回响应前等待的时间，0 表示立即'
        }
        label={draft.type === 'sse' ? '推送间隔' : '响应延迟'}
      >
        <div className="field-with-unit">
          <InputNumber
            max={5000}
            min={0}
            step={50}
            style={{ width: 160 }}
            value={draft.delay}
            onChange={(val) => {
              patch({ delay: typeof val === 'number' ? val : 50 });
            }}
          />
          <span>ms</span>
        </div>
      </Field>

      <Collapse
        className="advanced-collapse"
        ghost
        items={[
          {
            key: 'advanced',
            label: '高级响应选项',
            children: (
              <>
                <div className="field-grid">
                  <Field extra="100-599" label="响应状态码">
                    <InputNumber
                      max={599}
                      min={100}
                      value={draft.statusCode}
                      onChange={(value) => {
                        patch({
                          statusCode: typeof value === 'number' ? value : 200,
                        });
                      }}
                    />
                  </Field>
                  <Field extra="未命中时正常回源" label="Mock 命中率">
                    <div className="field-with-unit">
                      <InputNumber
                        max={100}
                        min={1}
                        value={draft.hitRate}
                        onChange={(value) => {
                          patch({
                            hitRate: typeof value === 'number' ? value : 100,
                          });
                        }}
                      />
                      <span>%</span>
                    </div>
                  </Field>
                </div>
                <Field extra="在基础延迟上随机增加 0 到该数值，模拟不稳定网络" label="延迟抖动">
                  <div className="field-with-unit">
                    <InputNumber
                      max={5000}
                      min={0}
                      step={50}
                      value={draft.delayJitter}
                      onChange={(value) => {
                        patch({
                          delayJitter: typeof value === 'number' ? value : 0,
                        });
                      }}
                    />
                    <span>ms</span>
                  </div>
                </Field>
                <Field
                  error={errors.headers}
                  extra="JSON 对象；会覆盖默认 Content-Type 等同名响应头"
                  label="自定义响应头"
                >
                  <Input.TextArea
                    className="mono"
                    placeholder={'{\n  "x-mock-source": "sake"\n}'}
                    rows={5}
                    value={headersText}
                    onChange={(event) => {
                      setHeadersText(event.target.value);
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

      {pickerOpen ? (
        <FilePicker
          dir={draft.dir.trim()}
          selected={draft.files}
          onCancel={() => {
            setPickerOpen(false);
          }}
          onOk={(files) => {
            patch({ files });
            setPickerOpen(false);
          }}
        />
      ) : null}
      <FilePreviewModal
        dir={draft.dir.trim()}
        file={openFile?.name ?? null}
        initialMode={openFile?.mode}
        onClose={() => {
          setOpenFile(null);
        }}
      />
    </Drawer>
  );
}
