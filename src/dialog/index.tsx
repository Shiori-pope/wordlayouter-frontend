import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import Popup from './Popup';

/* global Office */

const rootElement = document.getElementById('container');
if (rootElement) {
  const root = createRoot(rootElement);

  Office.onReady(() => {
    root.render(
      <FluentProvider theme={webLightTheme}>
        <Popup />
      </FluentProvider>
    );
  });
}
