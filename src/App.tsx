import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import CallbackPage from './pages/CallbackPage'
import Dashboard from './pages/Dashboard'
import Trade from './pages/Trade'
import Portfolio from './pages/Portfolio'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
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
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
