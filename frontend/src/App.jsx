import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";

const Home            = lazy(() => import("./pages/Home.jsx"));
const Login           = lazy(() => import("./pages/Login.jsx"));
const Register        = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword  = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword   = lazy(() => import("./pages/ResetPassword.jsx"));
const VerifyEmail     = lazy(() => import("./pages/VerifyEmail.jsx"));
const Contact         = lazy(() => import("./pages/Contact.jsx"));
const Profile         = lazy(() => import("./pages/Profile.jsx"));
const FAQ             = lazy(() => import("./pages/FAQ.jsx"));
const Privacy         = lazy(() => import("./pages/Privacy.jsx"));
const Terms           = lazy(() => import("./pages/Terms.jsx"));
const About           = lazy(() => import("./pages/About.jsx"));
const CreateTrip      = lazy(() => import("./pages/CreateTrip.jsx"));
const GeneratingTrip  = lazy(() => import("./pages/GeneratingTrip.jsx"));
const MyTrips         = lazy(() => import("./pages/MyTrips.jsx"));
const ViewTrip        = lazy(() => import("./pages/ViewTrip.jsx"));
const EditTrip        = lazy(() => import("./pages/EditTrip.jsx"));
const AdminContacts   = lazy(() => import("./pages/AdminContacts.jsx"));
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard.jsx"));
const Hotels          = lazy(() => import("./pages/Hotels.jsx"));
const Flights         = lazy(() => import("./pages/Flights.jsx"));
const Attractions     = lazy(() => import("./pages/Attractions.jsx"));
const Cars            = lazy(() => import("./pages/Cars.jsx"));
const NotFound        = lazy(() => import("./pages/NotFound.jsx"));

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: location.pathname,
        page_title: document.title,
      });
    }
  }, [location.pathname]);

  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                      element={<Home />} />
          <Route path="/login"                 element={<Login />} />
          <Route path="/register"              element={<Register />} />
          <Route path="/forgot-password"       element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify/:token"         element={<VerifyEmail />} />
          <Route path="/hotels"                element={<Hotels />} />
          <Route path="/flights"               element={<Flights />} />
          <Route path="/attractions"           element={<Attractions />} />
          <Route path="/cars"                  element={<Cars />} />
          <Route path="/contact"               element={<Contact />} />
          <Route path="/profile"               element={<Profile />} />
          <Route path="/faq"                   element={<FAQ />} />
          <Route path="/privacy"               element={<Privacy />} />
          <Route path="/terms"                 element={<Terms />} />
          <Route path="/about"                 element={<About />} />

          <Route path="/create"               element={<P><CreateTrip /></P>} />
          <Route path="/generating-trip"      element={<P><GeneratingTrip /></P>} />
          <Route path="/trips"                element={<P><MyTrips /></P>} />
          <Route path="/trip/:id"             element={<P><ViewTrip /></P>} />
          <Route path="/trip/:id/edit"        element={<P><EditTrip /></P>} />
          <Route path="/admin/contacts"        element={<P><AdminContacts /></P>} />
          <Route path="/admin/dashboard"       element={<P><AdminDashboard /></P>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
