import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import logo from '../assets/logo.svg';

import './AppHeader.css';

interface Props {
  saveActive: boolean;
  replayActive: boolean;
  dark: boolean;
  onToggleDark: () => void;
}

export default function AppHeader({ saveActive, replayActive, dark, onToggleDark }: Props) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <img alt="" className="app-header-logo" height={28} src={logo} width={28} />
        <div>
          <strong className="app-header-title">Replay</strong>
          <span className="app-header-sub">保存并回放</span>
        </div>
      </div>
      <div className="app-header-status">
        <span className={`status-pill${saveActive ? ' on' : ''}`}>
          保存 {saveActive ? '开' : '关'}
        </span>
        <span className={`status-pill${replayActive ? ' on' : ''}`}>
          回放 {replayActive ? '开' : '关'}
        </span>
        <Button
          aria-label={dark ? '切换为浅色主题' : '切换为暗色主题'}
          icon={dark ? <SunOutlined /> : <MoonOutlined />}
          type="text"
          onClick={onToggleDark}
        />
      </div>
    </header>
  );
}
