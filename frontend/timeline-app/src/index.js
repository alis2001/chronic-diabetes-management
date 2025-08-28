import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{padding: '20px', fontFamily: 'Arial'}}>
    <h1>🏥 Diabetes Timeline Management</h1>
    <h2>📅 Timeline Service Frontend</h2>
    <div style={{background: '#f0f8ff', padding: '20px', borderRadius: '8px', marginTop: '20px'}}>
      <h3>✅ Frontend Service Running</h3>
      <p>This React frontend is ready for development!</p>
      <p><strong>Backend API:</strong> <a href="http://localhost:8001/docs" target="_blank">http://localhost:8001/docs</a></p>
      <p><strong>Status:</strong> Under Development 🚧</p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
