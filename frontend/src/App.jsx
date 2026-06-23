import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingButtons from './components/FloatingButtons';
import { ScrollProgress } from './lib/motion';

import Home from './pages/Home';
import Search from './pages/Search';
import CarDetail from './pages/CarDetail';
import Agencies from './pages/Agencies';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminKyc from './pages/AdminKyc';
import Admin from './pages/Admin';
import ScrollExperience from './pages/ScrollExperience';
import AddCar from './pages/AddCar';
import TrackCar from './pages/TrackCar';
import HowItWorks from './pages/HowItWorks';
import TrustSafety from './pages/TrustSafety';
import About from './pages/About';
import Contact from './pages/Contact';
import AgencyDetail from './pages/AgencyDetail';

function Spinner() {
  return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!(user.is_admin || user.role === 'admin')) return <Navigate to="/dashboard" replace />;
  return children;
}

function Layout({ children }) {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollProgress />
      <Navbar />
      <motion.main
        key={location.pathname}
        className="flex-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
      <Footer />
      <FloatingButtons />
    </div>
  );
}

function AuthLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth pages (no navbar/footer) */}
              <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
              <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />

              {/* Main pages */}
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/search" element={<Layout><Search /></Layout>} />
              <Route path="/cars/:id" element={<Layout><CarDetail /></Layout>} />
              <Route path="/agencies" element={<Layout><Agencies /></Layout>} />
              <Route path="/agencies/:id" element={<Layout><AgencyDetail /></Layout>} />
              <Route path="/how-it-works" element={<Layout><HowItWorks /></Layout>} />
              <Route path="/trust" element={<Layout><TrustSafety /></Layout>} />
              <Route path="/about" element={<Layout><About /></Layout>} />
              <Route path="/contact" element={<Layout><Contact /></Layout>} />
              <Route path="/experience" element={<Layout><ScrollExperience /></Layout>} />

              {/* GPS tracking — accessible to anyone with the link (renter receives it) */}
              <Route path="/track/:id" element={<Layout><TrackCar /></Layout>} />

              {/* Protected */}
              <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
              <Route path="/dashboard/owner" element={<PrivateRoute><Layout><OwnerDashboard /></Layout></PrivateRoute>} />
              <Route path="/dashboard/owner/add" element={<PrivateRoute><Layout><AddCar /></Layout></PrivateRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<AdminRoute><Layout><Admin /></Layout></AdminRoute>} />
              <Route path="/admin/kyc" element={<AdminRoute><Layout><AdminKyc /></Layout></AdminRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}
