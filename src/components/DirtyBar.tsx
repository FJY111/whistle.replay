import { Button } from 'antd';

import './DirtyBar.css';

interface Props {
  saving: boolean;
  onSave: () => void;
}

export default function DirtyBar({ saving, onSave }: Props) {
  return (
    <div className="dirty-bar">
      <span>有未保存的更改 · ⌘/Ctrl + S</span>
      <Button loading={saving} size="small" type="primary" onClick={onSave}>
        更新配置
      </Button>
    </div>
  );
}
