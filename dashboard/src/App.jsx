import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Login from './pages/Login';
import IotMonitor from './pages/IotMonitor';
import UssdSimulator from './pages/UssdSimulator';
import MobilePreview from './pages/MobilePreview';
import PayAsYouGo from './pages/PayAsYouGo';
import BatteryManagement from './pages/BatteryManagement';
import AiPredictions from './pages/AiPredictions';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/payg"    element={<PrivateRoute><PayAsYouGo /></PrivateRoute>} />
        <Route path="/mobile"  element={<PrivateRoute><MobilePreview /></PrivateRoute>} />
        <Route path="/ussd"    element={<PrivateRoute><UssdSimulator /></PrivateRoute>} />
        <Route path="/iot"     element={<PrivateRoute><IotMonitor /></PrivateRoute>} />
        <Route path="/battery" element={<PrivateRoute><BatteryManagement /></PrivateRoute>} />
        <Route path="/map"     element={<PrivateRoute><MapPage /></PrivateRoute>} />
        <Route path="/ai"      element={<PrivateRoute><AiPredictions /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
