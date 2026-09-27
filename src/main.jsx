import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/landing.css';
import './styles/app.css';
import { setupPWA } from './lib/pwa.js';

setupPWA();

const Router = __HASH_ROUTER__ ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <I18nProvider>
        <AuthProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </AuthProvider>
      </I18nProvider>
    </Router>
  </React.StrictMode>
);
