import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from '@getmocha/users-service/react';
import HomePage from "@/react-app/pages/Home";
import ProductPage from "@/react-app/pages/Product";
import DashboardPage from "@/react-app/pages/Dashboard";
import PricingPage from "@/react-app/pages/Pricing";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import OffersPage from "@/react-app/pages/Offers";
import WishlistPage from "@/react-app/pages/Wishlist";
import Admin from "@/react-app/pages/Admin";
import AdminOffers from "@/react-app/pages/AdminOffers";
import Analytics from "@/react-app/components/Analytics";
import { useToast } from "@/react-app/hooks/useToast";

export default function App() {
  const { ToastContainer } = useToast();

  return (
    <AuthProvider>
      <Router>
        <Analytics />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/offers" element={<AdminOffers />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
        <ToastContainer />
      </Router>
    </AuthProvider>
  );
}
