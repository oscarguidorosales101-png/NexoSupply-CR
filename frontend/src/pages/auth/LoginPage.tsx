import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  User,
  Phone,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { register, verifyEmail, resendVerificationCode } from '../../api/auth.api';

export const LoginPage: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'verify'>('login');
  const [email, setEmail] = useState('admin@pacificocr-demo.com');
  const [password, setPassword] = useState('DemoPacifico2026!');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Campos para Registro
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmpresaNombre, setRegEmpresaNombre] = useState('');
  const [regCedula, setRegCedula] = useState('');
  const [regMoneda, setRegMoneda] = useState<'CRC' | 'USD'>('CRC');

  // Campos para Verificación
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const { login, refreshSession } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.message?.includes('verificar su correo') || err?.message?.includes('inactivo')) {
        setVerifyEmailAddress(email);
        setView('verify');
        setError('Tu cuenta requiere verificación de correo. Ingresa el código enviado.');
      } else {
        setError(err?.message || 'Credenciales inválidas o error de conexión al servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await register({
        nombreCompleto: regNombre,
        email: regEmail,
        password: regPassword,
        empresa: {
          rfcCedula: regCedula || `3-101-${Math.floor(100000 + Math.random() * 900000)}`,
          razonSocial: regEmpresaNombre,
          nombreComercial: regEmpresaNombre,
          emailContacto: regEmail,
          monedaBase: regMoneda,
        },
      });

      setVerifyEmailAddress(regEmail);
      if (res.codigoSimulado) {
        setSimulatedCode(res.codigoSimulado);
      }
      setSuccessMsg('Registro exitoso. Se ha enviado un código de verificación.');
      setView('verify');
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el registro empresarial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await verifyEmail(verifyEmailAddress, verifyCode);
      setSuccessMsg('¡Correo verificado con éxito! Sesión iniciada.');
      await refreshSession();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Código de verificación incorrecto o expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await resendVerificationCode(verifyEmailAddress);
      if (res.codigoSimulado) {
        setSimulatedCode(res.codigoSimulado);
      }
      setSuccessMsg('Nuevo código generado y enviado correctamente.');
    } catch (err: any) {
      setError(err?.message || 'Error al solicitar nuevo código.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemo = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#0B192C] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-500/30">
          N
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">NexoSupply CR</h2>
        <p className="mt-1 text-sm text-slate-300 font-medium">
          Plataforma SaaS para Abastecimiento, Compras, Proveedores e Inventario
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
          {/* Tabs Selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setView('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                view === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setView('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                view === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Registrar Nueva Empresa
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-xs text-rose-700 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VISTA 1: INICIAR SESIÓN */}
          {view === 'login' && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <Input
                label="Correo Electrónico Corporativo"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
              />

              <Input
                label="Contraseña"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />

              <Button type="submit" className="w-full py-2.5 mt-2" isLoading={isLoading}>
                Acceder a la Plataforma <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* VISTA 2: REGISTRO EMPRESARIAL */}
          {view === 'register' && (
            <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nombre Completo"
                  type="text"
                  required
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  placeholder="Ej. Ing. Carlos Soto"
                />
                <Input
                  label="Correo Corporativo"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="carlos@miempresa.com"
                />
              </div>

              <Input
                label="Contraseña (mínimo 8 caracteres)"
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••••••"
              />

              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Datos de tu Empresa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nombre Comercial / Razón Social"
                    type="text"
                    required
                    value={regEmpresaNombre}
                    onChange={(e) => setRegEmpresaNombre(e.target.value)}
                    placeholder="Distribuidora Costa Rica S.A."
                  />
                  <Input
                    label="Cédula Jurídica / RFC"
                    type="text"
                    required
                    value={regCedula}
                    onChange={(e) => setRegCedula(e.target.value)}
                    placeholder="3-101-554433"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Moneda Operativa Base
                  </label>
                  <select
                    value={regMoneda}
                    onChange={(e) => setRegMoneda(e.target.value as 'CRC' | 'USD')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="CRC">CRC — Colones Costarricenses (₡)</option>
                    <option value="USD">USD — Dólares Estadounidenses ($)</option>
                  </select>
                </div>
              </div>

              <Button type="submit" className="w-full py-2.5 mt-3" isLoading={isLoading}>
                Crear Cuenta y Recibir Código <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* VISTA 3: VERIFICACIÓN DE CÓDIGO */}
          {view === 'verify' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-center">
                <KeyRound className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-blue-900">Verificación de Correo</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Hemos generado un código de 6 dígitos para:{' '}
                  <span className="font-semibold">{verifyEmailAddress}</span>
                </p>
                {simulatedCode && (
                  <div className="mt-3 p-2 bg-white rounded-lg border border-blue-300 inline-block shadow-sm">
                    <span className="text-[11px] text-slate-500 block">
                      Código generado para pruebas:
                    </span>
                    <span className="text-lg font-black tracking-widest text-blue-700">
                      {simulatedCode}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <Input
                  label="Código de 6 Dígitos"
                  type="text"
                  required
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="text-center font-mono text-lg tracking-widest font-bold"
                />

                <Button type="submit" className="w-full py-2.5" isLoading={isLoading}>
                  Verificar y Continuar <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reenviar código</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Volver al login
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Access Pills */}
          {view === 'login' && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">
                Accesos Rápidos de Demostración:
              </span>
              <div className="grid grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => setDemo('admin@pacificocr-demo.com', 'DemoPacifico2026!')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800 block">👑 Admin Pacífico</span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    admin@pacificocr-demo.com
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDemo('comprador@pacificocr-demo.com', 'DemoPacifico2026!')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800 block">🛒 Comprador</span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    comprador@pacificocr-demo.com
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDemo('auditor@pacificocr-demo.com', 'DemoAuditor2026!')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-slate-800 block">📋 Auditor Interno</span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    auditor@pacificocr-demo.com
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDemo('proveedor@sumimed-demo.com', 'DemoProveedor2026!')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-emerald-200 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-emerald-800 block">
                    🚚 Portal Proveedor
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    proveedor@sumimed-demo.com
                  </span>
                </button>
              </div>

              <div className="flex justify-between items-center mt-3 pt-2 text-[11px] text-slate-400">
                <span>Multiempresa Activa: 3 Tenants</span>
                <button
                  type="button"
                  onClick={() => setDemo('admin@norteexport-demo.com', 'DemoNorte2026!')}
                  className="text-blue-600 hover:underline"
                >
                  Probar Empresa Norte (USD)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
