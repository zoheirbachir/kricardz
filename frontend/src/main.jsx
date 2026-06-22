import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

// StrictMode removed — it double-mounts components in dev,
// which crashes react-leaflet (Map container already initialized).
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
