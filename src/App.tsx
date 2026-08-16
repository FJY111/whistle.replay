import { useCallback, useEffect, useState } from 'react';

import { App as AntApp, theme as antdTheme, ConfigProvider, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import type { MockRule, SaveRule, Settings } from './types';

import { getSettings } from './api';
import AppHeader from './components/AppHeader';
import MockPanel from './components/MockPanel';
import SavePanel from './components/SavePanel';
import { getInitialDark, persistDark, ThemeContext } from './theme';
import { genId } from './types';

import './App.css';

const { Text } = Typography;

const mockFromSave = (rule: SaveRule): MockRule => ({
  id: genId(),
  name: rule.name,
  enabled: true,
  pattern: rule.pattern,
  methods: [...rule.methods],
  dir: rule.dir,
  files: [],
  mode: 'fixed',
  type: rule.saveTypes.includes('sse') ? 'sse' : rule.saveTypes.includes('json') ? 'json' : 'text',
  delay: 50,
  delayJitter: 0,
  hitRate: 100,
  statusCode: 200,
  headers: {},
});

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dark, setDark] = useState(getInitialDark);
  const [saveActive, setSaveActive] = useState(false);
  const [mockActive, setMockActive] = useState(false);
  const [mockSeed, setMockSeed] = useState<MockRule | null>(null);

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
          setMockActive(data.mockActive);
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

  const handleSeedConsumed = useCallback(() => {
    setMockSeed(null);
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
                mockActive={mockActive}
                saveActive={saveActive}
                onToggleDark={() => {
                  setDark((value) => !value);
                }}
              />
              <main className="layout">
                <SavePanel
                  initialActive={settings.saveActive}
                  initialRules={settings.saveRules}
                  onActiveChange={setSaveActive}
                  onCreateMock={(rule) => {
                    setMockSeed(mockFromSave(rule));
                  }}
                />
                <MockPanel
                  initialActive={settings.mockActive}
                  initialRules={settings.mockRules}
                  seed={mockSeed}
                  onActiveChange={setMockActive}
                  onSeedConsumed={handleSeedConsumed}
                />
              </main>
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
