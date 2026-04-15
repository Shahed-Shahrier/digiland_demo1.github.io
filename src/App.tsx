import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFound from "@/pages/NotFound";

import CitizenDashboard from "@/pages/citizen/CitizenDashboard";
import NewApplicationPage from "@/pages/citizen/NewApplicationPage";
import MyApplicationsPage from "@/pages/citizen/MyApplicationsPage";
import ApplicationDetailsPage from "@/pages/citizen/ApplicationDetailsPage";
import LandSearchPage from "@/pages/citizen/LandSearchPage";
import NotificationsPage from "@/pages/citizen/NotificationsPage";
import ProfilePage from "@/pages/citizen/ProfilePage";

import OfficerDashboard from "@/pages/officer/OfficerDashboard";
import AllApplicationsPage from "@/pages/officer/AllApplicationsPage";
import ReviewApplicationPage from "@/pages/officer/ReviewApplicationPage";
import ClarificationsPage from "@/pages/officer/ClarificationsPage";

import SurveyDashboard from "@/pages/survey/SurveyDashboard";
import AssignedVerificationsPage from "@/pages/survey/AssignedVerificationsPage";
import VerificationDetailsPage from "@/pages/survey/VerificationDetailsPage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import LandRecordsManagementPage from "@/pages/admin/LandRecordsManagementPage";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Citizen */}
            <Route path="/citizen" element={<ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />
            <Route path="/citizen/new-application" element={<ProtectedRoute allowedRoles={['citizen']}><NewApplicationPage /></ProtectedRoute>} />
            <Route path="/citizen/applications" element={<ProtectedRoute allowedRoles={['citizen']}><MyApplicationsPage /></ProtectedRoute>} />
            <Route path="/citizen/applications/:id" element={<ProtectedRoute allowedRoles={['citizen']}><ApplicationDetailsPage /></ProtectedRoute>} />
            <Route path="/citizen/land-search" element={<ProtectedRoute allowedRoles={['citizen']}><LandSearchPage /></ProtectedRoute>} />
            <Route path="/citizen/notifications" element={<ProtectedRoute allowedRoles={['citizen']}><NotificationsPage /></ProtectedRoute>} />
            <Route path="/citizen/profile" element={<ProtectedRoute allowedRoles={['citizen']}><ProfilePage /></ProtectedRoute>} />

            {/* Land Officer */}
            <Route path="/officer" element={<ProtectedRoute allowedRoles={['land_officer']}><OfficerDashboard /></ProtectedRoute>} />
            <Route path="/officer/applications" element={<ProtectedRoute allowedRoles={['land_officer']}><AllApplicationsPage /></ProtectedRoute>} />
            <Route path="/officer/applications/:id" element={<ProtectedRoute allowedRoles={['land_officer']}><ReviewApplicationPage /></ProtectedRoute>} />
            <Route path="/officer/clarifications" element={<ProtectedRoute allowedRoles={['land_officer']}><ClarificationsPage /></ProtectedRoute>} />

            {/* Survey Officer */}
            <Route path="/survey" element={<ProtectedRoute allowedRoles={['survey_officer']}><SurveyDashboard /></ProtectedRoute>} />
            <Route path="/survey/verifications" element={<ProtectedRoute allowedRoles={['survey_officer']}><AssignedVerificationsPage /></ProtectedRoute>} />
            <Route path="/survey/verifications/:id" element={<ProtectedRoute allowedRoles={['survey_officer']}><VerificationDetailsPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
            <Route path="/admin/land-records" element={<ProtectedRoute allowedRoles={['admin']}><LandRecordsManagementPage /></ProtectedRoute>} />
            <Route path="/admin/audit-log" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
