import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { SelectCompany } from './pages/SelectCompany';
import { Sales } from './pages/Sales';
import { Batches } from './pages/Batches';
import { Items } from './pages/Items';
import { Cash } from './pages/Cash';
import { Forbidden } from './pages/Forbidden';
import { NoAccess } from './pages/NoAccess';
import { Members } from './pages/Members';
import { Clients } from './pages/Clients';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/403" element={<Forbidden />} />
          <Route path="/no-access" element={<NoAccess />} />
          <Route path="/seleccionar-empresa" element={<Navigate to="/select-company" replace />} />
          <Route path="/venta" element={<Navigate to="/sales" replace />} />
          <Route
            path="/select-company"
            element={
              <ProtectedRoute requireCompany={false}>
                <SelectCompany />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/batches"
            element={
              <ProtectedRoute>
                <Batches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/items"
            element={
              <ProtectedRoute>
                <Items />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash"
            element={
              <ProtectedRoute>
                <Cash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/members"
            element={
              <ProtectedRoute roles={['admin']}>
                <Members />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
