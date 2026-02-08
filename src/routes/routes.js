import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import history from "../services/history";
import NotFound from "../views/NotFoundPage/index";
import MinistriesSection from "../components/Ministries/MinistriesSection";
import MinistryDetailsPage from "../views/MinistryDetails/MinistryDetailsPage";
import Home from "../views/HomePage";
import ProtectedRoute from "../Admin/Auth/ProtectedRoute";
import Login from "../Admin/Pages/Login";
import Dashboard from "../Admin/Pages/Dashboard";
import AdminRoute from "../Admin/Auth/AdminRoute";
import AdminLayout from "../Admin/Layout/AdminLayout";
import AdminUsers from "../Admin/Pages/AdminUsers";

const AllPages = () => (
  <Router history={history}>
    <Routes>
      <Route exact path="/" element={<Home />} />
      <Route path="/" element={<MinistriesSection />} />
      <Route path="/ministries/:id" element={<MinistryDetailsPage />} />
      {/* <Route path="/contact" element={<ContactPage />} /> */}
      <Route path="*" element={<NotFound />} />

      {/* //=========ADMIN=======// */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/create" element={<AdminUsers />} />

      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      /> */}
    </Routes>
  </Router>
);

export default AllPages;
