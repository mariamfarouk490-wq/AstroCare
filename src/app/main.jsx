import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
 window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>window.dispatchEvent(new Event('astrocare-offline-ready'))).catch(()=>window.dispatchEvent(new Event('astrocare-offline-error'))));
}
