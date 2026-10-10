import { useEffect, useState } from 'react';

import { App as AntApp, theme as antdTheme, ConfigProvider, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import type { Settings } from './types';

import { getSettings } from './api';
import AppHeader from './components/AppHeader';
import CapturesPage from './components/CapturesPage';
import ReplayPanel from './components/ReplayPanel';
import SavePanel from './components/SavePanel';
import { getInitialDark, persistDark, ThemeContext } from './theme';

import './App.css';

const { Text } = Typography;

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dark, setDark] = useState(getInitialDark);
  const [saveActive, setSaveActive] = useState(false);
  const [replayActive, setReplayActive] = useState(true);
  const [capturesOpen, setCapturesOpen] = useState(false);

  useEffect(() => {
    document.title = 'whistle.replay';
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    persistDark(dark);
  }, [dark]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      getSettings()
        .then((data) => {
          if (!alive) {
            return;
          }
          setSettings(data);
          setSaveActive(data.saveActive);
          setReplayActive(data.replayActive);
        })
        .catch(() => {
          if (alive) {
            setTimeout(load, 1000);
          }
        });
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#C2410C',
          colorInfo: '#C2410C',
          borderRadius: 6,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AntApp>
        <ThemeContext.Provider value={dark}>
          {settings ? (
            <div className="container">
              <AppHeader
                dark={dark}
                replayActive={replayActive}
                saveActive={saveActive}
                capturesOpen={capturesOpen}
                onToggleCaptures={() => {
                  setCapturesOpen((value) => !value);
                }}
                onToggleDark={() => {
                  setDark((value) => !value);
                }}
              />
              {capturesOpen ? (
                <CapturesPage />
              ) : (
                <main className="layout">
                  <SavePanel
                    initialActive={settings.saveActive}
                    initialRules={settings.saveRules}
                    onActiveChange={setSaveActive}
                  />
                  <div className="side-stack">
                    <ReplayPanel
                      initialActive={settings.replayActive}
                      initialRules={settings.replayRules}
                      variant="allow"
                      onActiveChange={setReplayActive}
                    />
                    <ReplayPanel initialRules={settings.blockRules} variant="block" />
                  </div>
                </main>
              )}
            </div>
          ) : (
            <div className="app-loading">
              <Text type="secondary">加载中…</Text>
            </div>
          )}
        </ThemeContext.Provider>
      </AntApp>
    </ConfigProvider>
  );
}
