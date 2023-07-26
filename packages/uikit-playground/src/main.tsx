import React from 'react';
import { createRoot } from 'react-dom/client';
import '@rocket.chat/icons/dist/rocketchat.css';

import './index.css';
import App from './App';
import { Provider } from './Context';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
);