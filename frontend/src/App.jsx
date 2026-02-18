import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <LoginPage />
          } />
        <Route path="/register" element={
          <RegisterPage />
          } />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


