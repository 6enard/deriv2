import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { OpenContractsProvider } from './context/OpenContractsContext'
import { BotRunnerProvider } from './context/BotRunnerContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RequireAdmin from './components/RequireAdmin'
import FloatingScannerButton from './components/FloatingScannerButton'
import FloatingBotStatus from './components/FloatingBotStatus'
import NavigationGuard from './components/NavigationGuard'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import CallbackPage from './pages/CallbackPage'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import Portfolio from './pages/Portfolio'
import History from './pages/History'
import BotBuilder from './pages/BotBuilder'
import Scanner from './pages/Scanner'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <OpenContractsProvider>
        <BotRunnerProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/callback" element={<Layout><CallbackPage /></Layout>} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/trade" element={
            <ProtectedRoute>
              <Layout><Trade /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <ProtectedRoute>
              <Layout><Portfolio /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <Layout><History /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/bot-builder" element={
            <ProtectedRoute>
              <Layout><BotBuilder /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/scanner" element={
            <ProtectedRoute>
              <Layout><Scanner /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <RequireAdmin>
              <Layout><Admin /></Layout>
            </RequireAdmin>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ScrollToTop />
        <NavigationGuard />
        <FloatingScannerButton />
        <FloatingBotStatus />
      </BrowserRouter>
        </BotRunnerProvider>
        </OpenContractsProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
