import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  Outlet,
} from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Navbar } from "../components/SiteNavbar";
import { Footer } from "../components/SiteFooter";
import NotFound from "../views/NotFoundPage/index";
import { Home } from "../pages/Home";
import { About } from "../pages/About";
import { Services } from "../pages/Services";
import { Leadership } from "../pages/Leadership";
import { Contact } from "../pages/Contact";
import { Ministries } from "../pages/Ministries";
import { Events } from "../pages/Events";
import { Sermons } from "../pages/Sermons";
import { Blog } from "../pages/Blog";
import { BlogPost } from "../pages/BlogPost";
import { PrayerRequest } from "../pages/PrayerRequest";
import { Donate } from "../pages/Donate";
import { PaymentCallback } from "../pages/PaymentCallback";
import { Testimonies } from "../pages/Testimonies";
import { ShareTestimony } from "../pages/ShareTestimony";
import { VisitorTracker } from "../components/VisitorTracker";
import { AnnouncementPopup } from "../components/AnnouncementPopup";
import { Login } from "../pages/Login";
import AdminLayout from "../pages/admin/AdminLayout";
import { AdminHome, RequirePermission } from "../components/RequirePermission";
import VisitorsPage from "../pages/admin/VisitorsPage";
import ContactsPage from "../pages/admin/ContactsPage";
import AdminsPage from "../pages/admin/AdminsPage";
import AdminActivityPage from "../pages/admin/AdminActivityPage";
import PageEditor from "../pages/admin/PageEditor";
import BlogPostList from "../pages/admin/blog/BlogPostList";
import BlogPostEditor from "../pages/admin/blog/BlogPostEditor";
import PrayerInboxPage from "../pages/admin/PrayerInboxPage";
import PastorsPage from "../pages/admin/PastorsPage";
import { BlogPreview } from "../pages/BlogPreview";

const PublicShell = () => {
  const location = useLocation();
  const isAdminShell =
    location.pathname.startsWith("/admin") || location.pathname === "/login";

  return (
    <div className={`${isAdminShell ? "h-screen overflow-hidden" : "min-h-screen w-full max-w-full overflow-x-hidden"} flex flex-col bg-white`}>
      {!isAdminShell && <VisitorTracker />}
      {!isAdminShell && <AnnouncementPopup />}
      {!isAdminShell && <Navbar />}
      <main className={isAdminShell ? "flex-1 min-h-0 overflow-hidden" : "flex-1 w-full max-w-full"}>
        <Outlet />
      </main>
      {!isAdminShell && <Footer />}
      <Toaster richColors position="top-right" />
    </div>
  );
};

const AllPages = () => (
  <Router>
    <AuthProvider>
      <SettingsProvider>
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-us" element={<Navigate to="/about" replace />} />
            <Route path="/services" element={<Services />} />
            <Route path="/leadership" element={<Leadership />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/events" element={<Events />} />
            <Route path="/sermons" element={<Sermons />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/preview" element={<BlogPreview />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/contact-us"
              element={<Navigate to="/contact" replace />}
            />
            <Route path="/prayer-request" element={<PrayerRequest />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/donate/callback" element={<PaymentCallback />} />
            <Route path="/testimonies" element={<Testimonies />} />
            <Route path="/share-testimony" element={<ShareTestimony />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminHome />} />
              <Route
                path="visitors"
                element={
                  <RequirePermission feature="visitors">
                    <VisitorsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="contacts"
                element={
                  <RequirePermission feature="contacts">
                    <ContactsPage />
                  </RequirePermission>
                }
              />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route
                path="blog/new"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <BlogPostEditor />
                  </RequirePermission>
                }
              />
              <Route
                path="blog/:id/edit"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <BlogPostEditor />
                  </RequirePermission>
                }
              />
              <Route
                path="blog"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <BlogPostList />
                  </RequirePermission>
                }
              />
              <Route
                path="prayer"
                element={
                  <RequirePermission feature="prayer.inbox" action="view">
                    <PrayerInboxPage />
                  </RequirePermission>
                }
              />
              <Route
                path="prayer/pastors"
                element={
                  <RequirePermission feature="prayer.inbox" action="view">
                    <PastorsPage />
                  </RequirePermission>
                }
              />
              <Route path="pages/:pageKey" element={<PageEditor />} />
              <Route path="website" element={<Navigate to="/admin/pages/contact" replace />} />
              <Route path="hero" element={<Navigate to="/admin/pages/home" replace />} />
              <Route path="events" element={<Navigate to="/admin/pages/events" replace />} />
              <Route path="sermons" element={<Navigate to="/admin/pages/sermons" replace />} />
              <Route path="ministries" element={<Navigate to="/admin/pages/ministries" replace />} />
              <Route path="testimonies" element={<Navigate to="/admin/pages/testimonies" replace />} />
              <Route path="prayers" element={<Navigate to="/admin/prayer" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SettingsProvider>
    </AuthProvider>
  </Router>
);

export default AllPages;
