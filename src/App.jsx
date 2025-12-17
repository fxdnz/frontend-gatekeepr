import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { lazy, Suspense } from "react";
import store from "./store";
import Layout from "./hocs/Layout";
import PrivateRoute from "./components/PrivateRoute";

// Lazy load all page components
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const Activate = lazy(() => import("./pages/Activate"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ResetPasswordConfirm = lazy(() => import("./pages/ResetPasswordConfirm"));
const Logs = lazy(() => import("./pages/Logs"));
const Report = lazy(() => import("./pages/Report"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Parking = lazy(() => import("./pages/Parking"));
const CreateUsers = lazy(() => import("./pages/CreateUsers"));
const RFID = lazy(() => import("./pages/RFID"));
const Residents = lazy(() => import("./pages/Residents"));
const Visitors = lazy(() => import("./pages/Visitors"));
const Settings = lazy(() => import("./pages/Settings"));

// Loading component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/password-reset/confirm/:uid/:token"
                element={<ResetPasswordConfirm />}
              />
              <Route path="/activate/:uid/:token" element={<Activate />} />

              {/* Protected Routes - Accessible to all authenticated users */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <PrivateRoute>
                    <Logs />
                  </PrivateRoute>
                }
              />
              <Route
                path="/visitors"
                element={
                  <PrivateRoute>
                    <Visitors />
                  </PrivateRoute>
                }
              />
              <Route
                path="/parking"
                element={
                  <PrivateRoute>
                    <Parking />
                  </PrivateRoute>
                }
              />

              {/* Reports - accessible to user_admin and system_admin */}
              <Route
                path="/reports"
                element={
                  <PrivateRoute allowedRoles={["system_admin", "user_admin"]}>
                    <Report />
                  </PrivateRoute>
                }
              />

              {/* Admin Only Routes - Only for system_admin and user_admin */}
              <Route
                path="/rfid"
                element={
                  <PrivateRoute allowedRoles={["system_admin", "user_admin"]}>
                    <RFID />
                  </PrivateRoute>
                }
              />
              <Route
                path="/residents"
                element={
                  <PrivateRoute allowedRoles={["system_admin", "user_admin"]}>
                    <Residents />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-users"
                element={
                  <PrivateRoute allowedRoles={["system_admin", "user_admin"]}>
                    <CreateUsers />
                  </PrivateRoute>
                }
              />

              {/* Settings - Only for system_admin */}
              <Route
                path="/settings"
                element={
                  <PrivateRoute allowedRoles={["system_admin"]}>
                    <Settings />
                  </PrivateRoute>
                }
              />

              {/* Error Routes */}
              <Route path="/403" element={<Forbidden />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </Provider>
  );
};

export default App;
