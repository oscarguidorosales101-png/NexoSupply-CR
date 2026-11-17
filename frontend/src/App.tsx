import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProveedoresPage } from './pages/proveedores/ProveedoresPage';
import { ProductosPage } from './pages/productos/ProductosPage';
import { ComprasPage } from './pages/compras/ComprasPage';
import { InventarioPage } from './pages/inventario/InventarioPage';
import { EvaluacionesPage } from './pages/evaluaciones/EvaluacionesPage';
import { RiesgosPage } from './pages/riesgos/RiesgosPage';
import { SimulacionesPage } from './pages/simulaciones/SimulacionesPage';
import { ReportesPage } from './pages/reportes/ReportesPage';
import { ConocimientoPage } from './pages/conocimiento/ConocimientoPage';
import { ConfiguracionPage } from './pages/configuracion/ConfiguracionPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/30 animate-pulse mb-4">
          N
        </div>
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2" />
        <p className="text-xs text-slate-400 font-medium">Iniciando entorno NexoSupply CR...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas Autenticadas dentro del Layout Maestro */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="compras" element={<ComprasPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="evaluaciones" element={<EvaluacionesPage />} />
          <Route path="riesgos" element={<RiesgosPage />} />
          <Route path="simulaciones" element={<SimulacionesPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="conocimiento" element={<Navigate to="/dashboard" replace />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
