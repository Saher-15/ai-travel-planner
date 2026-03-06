import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import CreateTrip from "./pages/CreateTrip.jsx";
import TripResult from "./pages/TripResult.jsx";
import MyTrips from "./pages/MyTrips.jsx";
import ViewTrip from "./pages/ViewTrip.jsx";

import Contact from "./pages/Contact.jsx";
import Profile from "./pages/Profile.jsx";

import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";

import ProtectedRoute from "./auth/ProtectedRoute.jsx";

import "leaflet/dist/leaflet.css";

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* forgot/reset password */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* email verification */}
          <Route path="/verify/:token" element={<VerifyEmail />} />

          <Route path="/contact" element={<Contact />} />

          {/* protected */}
          <Route path="/create" element={<P><CreateTrip /></P>} />
          <Route path="/result" element={<P><TripResult /></P>} />
          <Route path="/trips" element={<P><MyTrips /></P>} />
          <Route path="/trip/:id" element={<P><ViewTrip /></P>} />
          <Route path="/profile" element={<P><Profile /></P>} />

          {/* fallback */}
          <Route
            path="*"
            element={<div className="text-sm text-slate-600">Not found</div>}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
