import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import LandingPage from './LandingPage';
import './landing.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <LandingPage />
    </React.StrictMode>
);
