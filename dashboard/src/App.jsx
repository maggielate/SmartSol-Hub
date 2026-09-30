import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import IotMonitor from './pages/IotMonitor';
import UssdSimulator from './pages/UssdSimulator';
import MobilePreview from './pages/MobilePreview';
import PayAsYouGo from './pages/PayAsYouGo';
import BatteryManagement from './pages/BatteryManagement';
import AiPredictions from './pages/AiPredictions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Dashboard />} />
        <Route path="/payg"    element={<PayAsYouGo />} />
        <Route path="/mobile"  element={<MobilePreview />} />
        <Route path="/ussd"    element={<UssdSimulator />} />
        <Route path="/iot"     element={<IotMonitor />} />
        <Route path="/battery" element={<BatteryManagement />} />
        <Route path="/map"     element={<MapPage />} />
        <Route path="/ai"      element={<AiPredictions />} />
      </Routes>
    </BrowserRouter>
  );
}
