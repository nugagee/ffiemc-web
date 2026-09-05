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
import { PrivacyPolicy, TermsOfService } from "../pages/LegalPages";
import { Testimonies } from "../pages/Testimonies";
import { ShareTestimony } from "../pages/ShareTestimony";
import { VisitorTracker } from "../components/VisitorTracker";
import { AnnouncementPopup } from "../components/AnnouncementPopup";
import { MonthWelcomePopup } from "../components/MonthWelcomePopup";
import { PopupPriorityProvider } from "../context/PopupPriorityContext";
import { StickyEventBanner } from "../components/StickyEventBanner";
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
import BlogAnalyticsPage from "../pages/admin/blog/BlogAnalyticsPage";
import BlogCommentsPage from "../pages/admin/blog/BlogCommentsPage";
import ChurchResourcesPage from "../pages/admin/blog/ChurchResourcesPage";
import PrayerInboxPage from "../pages/admin/PrayerInboxPage";
import PastorsPage from "../pages/admin/PastorsPage";
import ProgramsPage from "../pages/admin/programs/ProgramsPage";
import ProgramTypesPage from "../pages/admin/programs/ProgramTypesPage";
import ProgramRegistrationsPage from "../pages/admin/programs/ProgramRegistrationsPage";
import ChurchRolesPage from "../pages/admin/programs/ChurchRolesPage";
import ChurchMembersPage from "../pages/admin/programs/ChurchMembersPage";
import ChurchBranchesPage from "../pages/admin/programs/ChurchBranchesPage";
import MemberNotificationsPage from "../pages/admin/programs/MemberNotificationsPage";
import { ProgramRegisterPage } from "../pages/ProgramRegisterPage";
import { ChurchMembershipPage } from "../pages/ChurchMembershipPage";
import { VolunteerRegisterPage } from "../pages/VolunteerRegisterPage";
import VolunteersPage from "../pages/admin/programs/VolunteersPage";
import FormDropdownsPage from "../pages/admin/programs/FormDropdownsPage";
import ApprovalsPage from "../pages/admin/ApprovalsPage";
import MeetingsPage from "../pages/admin/programs/MeetingsPage";
import SpeechToTextPage from "../pages/admin/utilities/SpeechToTextPage";
import NotesDiaryPage from "../pages/admin/utilities/NotesDiaryPage";
import TranslatePage from "../pages/admin/utilities/TranslatePage";
import TextToolsPage from "../pages/admin/utilities/TextToolsPage";
import { MeetingJoinPage } from "../pages/MeetingJoinPage";
import AnnouncementsPanel from "../components/admin/AnnouncementsPanel";
import BannerAnalyticsPage from "../components/admin/BannerAnalyticsPage";
import { BlogPreview } from "../pages/BlogPreview";

const PublicShell = () => {
  const location = useLocation();
  const isAdminShell =
    location.pathname.startsWith("/admin") || location.pathname === "/login";

  return (
    <div className={`${isAdminShell ? "h-screen overflow-hidden" : "min-h-screen w-full max-w-full overflow-x-hidden"} flex flex-col bg-white`}>
      {!isAdminShell && <VisitorTracker />}
      {!isAdminShell && <StickyEventBanner />}
      {!isAdminShell && (
        <PopupPriorityProvider>
          <MonthWelcomePopup />
          <AnnouncementPopup />
        </PopupPriorityProvider>
      )}
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
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
            <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
            <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
            <Route path="/testimonies" element={<Testimonies />} />
            <Route path="/share-testimony" element={<ShareTestimony />} />
            <Route path="/register/:slug" element={<ProgramRegisterPage />} />
            <Route path="/join-church" element={<ChurchMembershipPage />} />
            <Route path="/volunteer/:slug" element={<VolunteerRegisterPage />} />
            <Route path="/meeting/:id" element={<MeetingJoinPage />} />
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
                path="approvals/mine"
                element={<ApprovalsPage mine />}
              />
              <Route
                path="approvals/mine/:featureKey"
                element={<ApprovalsPage mine />}
              />
              <Route
                path="approvals"
                element={
                  <RequirePermission feature="approvals">
                    <ApprovalsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="approvals/:featureKey"
                element={
                  <RequirePermission feature="approvals">
                    <ApprovalsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="blog/bible-study"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <ChurchResourcesPage kind="bible_study" />
                  </RequirePermission>
                }
              />
              <Route
                path="blog/daily-manna"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <ChurchResourcesPage kind="daily_manna" />
                  </RequirePermission>
                }
              />
              <Route
                path="blog/analytics"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <BlogAnalyticsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="blog/comments"
                element={
                  <RequirePermission feature="blog.posts" action="edit">
                    <BlogCommentsPage />
                  </RequirePermission>
                }
              />
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
              <Route
                path="programs/new"
                element={
                  <RequirePermission feature="programs" action="edit">
                    <ProgramsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="programs"
                element={
                  <RequirePermission feature="programs">
                    <ProgramsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="programs/types"
                element={
                  <RequirePermission feature="program_types">
                    <ProgramTypesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="programs/branches"
                element={
                  <RequirePermission feature="church_branches">
                    <ChurchBranchesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="programs/roles"
                element={
                  <RequirePermission feature="church_roles">
                    <ChurchRolesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="programs/notifications"
                element={
                  <RequirePermission feature="member_notifications">
                    <MemberNotificationsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="programs/meetings"
                element={<Navigate to="/admin/utilities/meetings" replace />}
              />
              <Route
                path="utilities/meetings"
                element={
                  <RequirePermission feature="church_meetings">
                    <MeetingsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="utilities/speech"
                element={
                  <RequirePermission feature="utilities">
                    <SpeechToTextPage />
                  </RequirePermission>
                }
              />
              <Route
                path="utilities/notes"
                element={
                  <RequirePermission feature="utilities">
                    <NotesDiaryPage />
                  </RequirePermission>
                }
              />
              <Route
                path="utilities/translate"
                element={
                  <RequirePermission feature="utilities">
                    <TranslatePage />
                  </RequirePermission>
                }
              />
              <Route
                path="utilities/text"
                element={
                  <RequirePermission feature="utilities">
                    <TextToolsPage />
                  </RequirePermission>
                }
              />
              <Route path="programs/registrations" element={<Navigate to="/admin/registrations/programs" replace />} />
              <Route path="programs/members" element={<Navigate to="/admin/registrations/members" replace />} />
              <Route path="programs/volunteers" element={<Navigate to="/admin/registrations/volunteers" replace />} />
              <Route
                path="banners"
                element={
                  <RequirePermission feature="banners">
                    <AnnouncementsPanel />
                  </RequirePermission>
                }
              />
              <Route
                path="banners/analytics"
                element={
                  <RequirePermission feature="banners">
                    <BannerAnalyticsPage view="analytics" />
                  </RequirePermission>
                }
              />
              <Route
                path="banners/activity"
                element={
                  <RequirePermission feature="banners">
                    <BannerAnalyticsPage view="activity" />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/programs/:programId"
                element={
                  <RequirePermission feature="program_registrations">
                    <ProgramRegistrationsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/programs"
                element={
                  <RequirePermission feature="program_registrations">
                    <ProgramRegistrationsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/volunteers"
                element={
                  <RequirePermission feature="volunteer_applications">
                    <VolunteersPage view="applications" />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/volunteers/audit"
                element={
                  <RequirePermission feature="volunteer_applications">
                    <VolunteersPage view="audit" />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/members/pending"
                element={
                  <RequirePermission feature="church_members">
                    <ChurchMembersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/members/approved"
                element={
                  <RequirePermission feature="church_members">
                    <ChurchMembersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/members"
                element={
                  <RequirePermission feature="church_members">
                    <ChurchMembersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="registrations/form-options"
                element={
                  <RequirePermission feature="form_dropdowns">
                    <FormDropdownsPage />
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
