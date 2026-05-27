import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import App from './App';
import './taskpane.css';

/* global document, Office */

function renderApp() {
  const rootElement = document.getElementById('container');
  if (!rootElement) return;

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
}

if (typeof Office !== 'undefined' && Office.onReady) {
  Office.onReady(() => renderApp());
} else {
  renderApp();
}
