import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import MsalProviderWrapper from './MsalWrapper';
import './taskpane.css';

/* global document, Office */

const render = (Component: React.ComponentType) => {
  const rootElement = document.getElementById('container');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <FluentProvider theme={webLightTheme}>
        <MsalProviderWrapper />
      </FluentProvider>
    );
  }
};

Office.onReady(() => {
  render(MsalProviderWrapper); // MsalProviderWrapper inside manages its own rendering of App
});
