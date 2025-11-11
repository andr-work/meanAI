/* eslint-disable @typescript-eslint/no-explicit-any */

import { DialogBox } from './DialogBox';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { DialogBoxProps } from './DialogBox';

const root = document.createElement('chrome-extension-boilerplate-react-vite-content-view-root');
document.body.after(root);

const shadowRoot = root.attachShadow({ mode: 'open' });
const shadowContainer = document.createElement('div');
shadowContainer.id = 'shadow-root';
shadowRoot.appendChild(shadowContainer);

// Shadow DOM + MUI Theme
const cache = createCache({ key: 'shadow-css', prepend: true, container: shadowRoot });
const theme = createTheme({});

const App = () => {
  const [data, setData] = useState<DialogBoxProps | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleDialogClose = () => setData(null);

  // React マウント完了時に ready ping を送信
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CONTENT_READY' });
  }, []);

  // message 受信時に data をセット
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'SHOW' && message.data?.description) {
        const newData: DialogBoxProps = {
          originText: message.data.originText || '',
          partOfSpeech: message.data.partOfSpeech || '',
          description: message.data.description || '',
          similarText1: message.data.similar1 || '',
          similarText2: message.data.similar2 || '',
          similarText3: message.data.similar3 || '',
          onClose: handleDialogClose,
        };
        if (rect === null) {
          setRect(window.getSelection()?.getRangeAt(0).getBoundingClientRect() ?? null);
        }
        setData(newData);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [rect]);

  return (
    <>
      {data && data.description && rect !== null && (
        <div style={{ position: 'absolute', width: '100%', left: 0, top: 0, zIndex: 2147483550 }}>
          <div
            style={{
              position: 'absolute',
              left: window.scrollX + rect.left,
              top: window.scrollY + rect.bottom + 10,
              zIndex: 2147483550,
            }}>
            <DialogBox {...data} />
          </div>
        </div>
      )}
    </>
  );
};

createRoot(shadowContainer).render(
  <CacheProvider value={cache}>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </CacheProvider>,
);
