import { useContext, useMemo } from 'react';

import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';

import { ThemeContext } from '../theme';

interface Props {
  name: string;
  content: string;
  height?: number;
  editable?: boolean;
  onChange?: (content: string) => void;
}

/** 独立成异步 chunk：仅打开响应文件时才加载 CodeMirror */
export default function CodePreview({ name, content, height, editable = false, onChange }: Props) {
  const dark = useContext(ThemeContext);
  const isJson = name.endsWith('.json');

  const display = useMemo(() => {
    if (!isJson || editable) {
      return content;
    }
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }, [content, editable, isJson]);

  return (
    <CodeMirror
      basicSetup={{
        lineNumbers: true,
        foldGutter: isJson,
        highlightActiveLine: editable,
      }}
      editable={editable}
      extensions={isJson ? [json()] : []}
      height={height ? `${String(height)}px` : '380px'}
      readOnly={!editable}
      theme={dark ? 'dark' : 'light'}
      value={display}
      onChange={onChange}
    />
  );
}
