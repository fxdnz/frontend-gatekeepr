import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/SignUp";
import Activate from "./pages/Activate";
import ResetPassword from "./pages/ResetPassword";
import Logs from "./pages/Logs";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import Layout from "./hocs/Layout";
import Parking from "./pages/Parking";

import { Provider } from "react-redux";
import store from "./store";
import PrivateRoute from "./components/PrivateRoute"; // Add this line
import Residents from "./pages/Residents";

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/password/reset/confirm/:uid/:token"
              element={<ResetPasswordConfirm />}
            />
            <Route path="/activate/:uid/:token" element={<Activate />} />

            {/* Protected Routes */}
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
              path="/residents"
              element={
                <PrivateRoute>
                  <Residents />
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
          </Routes>
        </Layout>
      </Router>
    </Provider>
  );
};

export default App;
