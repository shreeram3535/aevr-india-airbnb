import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HostLayout } from './components/HostLayout';
import { Home } from './pages/Home';
import { ListingDetails } from './pages/ListingDetails';
import { Favorites } from './pages/Favorites';
import { HostAuth } from './pages/HostAuth';
import { GuestAuth } from './pages/GuestAuth';
import { Auth } from './pages/Auth';
import { HostDashboard } from './pages/HostDashboard';
import { HostNewProperty } from './pages/HostNewProperty';
import { Trips } from './pages/Trips';
import { AdminFlashSales } from './pages/AdminFlashSales';
import { AdminHostApprovals } from './pages/AdminHostApprovals';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminGuestVerification } from './pages/AdminGuestVerification';
import { AdminProperties } from './pages/AdminProperties';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import HelpCenter from './pages/HelpCenter';
import { MapExplore } from './pages/MapExplore';
import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/guest/auth" element={<GuestAuth />} />
        <Route path="/host/auth" element={<HostAuth />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="rooms/:id" element={<ListingDetails />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="trips" element={<Trips />} />
          <Route path="bookings" element={<Trips />} />
          <Route path="map" element={<MapExplore />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
        </Route>
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/host" element={<HostLayout />}>
          <Route index element={<HostDashboard />} />
          <Route path="new" element={<HostNewProperty />} />
          <Route path="edit/:id" element={<HostNewProperty />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="flash-sales" element={<AdminFlashSales />} />
          <Route path="host-approvals" element={<AdminHostApprovals />} />
          <Route path="guest-verification" element={<AdminGuestVerification />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
