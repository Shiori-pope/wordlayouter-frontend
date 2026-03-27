import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import App from './App';
import './taskpane.css';

/* global document, Office */

const rootElement = document.getElementById('container');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
}
