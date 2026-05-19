"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import OtpInput from "@/components/auth/OtpInput";
import OtpCountdown from "@/components/auth/OtpCountdown";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

function validarPassword(pwd: string): string[] {
  const errores: string[] = [];
  if (pwd.length < 10) errores.push("Mínimo 10 caracteres");
  if (!/[A-Z]/.test(pwd)) errores.push("Al menos 1 letra mayúscula");
  if (!/[0-9]/.test(pwd)) errores.push("Al menos 1 número");
  if (!/[$#%&/()]/.test(pwd)) errores.push("Al menos 1 símbolo: $  #  %  &  /  (  )");
  return errores;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function PasswordInput({ value, onChange, name, autoComplete, placeholder, className, show, onToggle }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string; autoComplete?: string; placeholder?: string; className: string;
  show: boolean; onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} name={name} autoComplete={autoComplete}
        placeholder={placeholder} value={value} onChange={onChange}
        className={`${className} pr-11`} />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition">
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

function PasswordReqs({ password }: { password: string }) {
  if (!password) return null;
  const reqs = [
    { label: "Mínimo 10 caracteres", ok: password.length >= 10 },
    { label: "Al menos 1 mayúscula", ok: /[A-Z]/.test(password) },
    { label: "Al menos 1 número", ok: /[0-9]/.test(password) },
    { label: "Al menos 1 símbolo ($  #  %  &  /  (  ))", ok: /[$#%&/()]/.test(password) },
  ];
  return (
    <ul className="mt-2 space-y-1">
      {reqs.map(r => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs transition ${r.ok ? "text-green-400" : "text-white/35"}`}>
          <span className="font-bold">{r.ok ? "✓" : "·"}</span> {r.label}
        </li>
      ))}
    </ul>
  );
}

function calcularCUIL(dni: string, prefijo = "20"): string {
  const d = dni.replace(/\D/g, "").padStart(8, "0");
  if (d.replace(/^0+/, "").length < 7) return "";
  const n = `${prefijo}${d}`;
  const c = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = n.split("").reduce((a, x, i) => a + parseInt(x) * c[i], 0);
  const r = s % 11;
  const dv = r === 0 ? "0" : r === 1 ? (prefijo === "27" ? "4" : "9") : String(11 - r);
  return `${prefijo}${d}${dv}`;
}

const MENSAJES_ESTADO: Record<string, string> = {
  inactivo: "Tu cuenta está inactiva. Contactá a soporte en contacto@zprest.com.ar",
  bloqueado: "Tu cuenta está temporalmente bloqueada. Contactá a soporte en contacto@zprest.com.ar",
  eliminado: "Tu cuenta fue eliminada. Para más información contactá a seguridad@zprest.com.ar",
};

const PROVINCIAS = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

type View = "home" | "login-email" | "admin-otp" | "registro-paso1" | "registro-paso2" | "registro-otp" | "reset-email" | "reset-otp" | "reset-nueva";
type TipoInteres = "personal" | "pyme";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams?.get("error") ?? null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Admin OTP / Reset
  const [otpKey, setOtpKey] = useState(0);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtpVerificado, setResetOtpVerificado] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevaPasswordConfirm, setNuevaPasswordConfirm] = useState("");

  // Registro
  const [regData, setRegData] = useState({
    nombre: "", dni: "", cuil: "", email: "", telefono: "",
    password: "", passwordConfirm: "",
    nombreComercio: "",
    calle: "", numero: "", piso: "", depto: "", localidad: "", provincia: "Neuquén", cp: "",
  });
  const [cuilPrefijo, setCuilPrefijo] = useState<"20" | "27" | "30">("20");
  const [tipoInteres, setTipoInteres] = useState<TipoInteres | null>(null);

  // Visibilidad contraseñas
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegPwdConfirm, setShowRegPwdConfirm] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [showResetPwdConfirm, setShowResetPwdConfirm] = useState(false);

  // ── Mock admin ─────────────────────────────────────────────────────────
  const handleMockAdmin = () => {
    localStorage.setItem("zprest_mock_session", JSON.stringify({ role: "admin", email: "admin@zprest.com" }));
    router.push("/admin");
  };

  // ── Login con contraseña ────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setError("Completá email y contraseña");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Chequear baneo antes de intentar autenticar
      const { data: baneado } = await supabase
        .from("emails_baneados")
        .select("email")
        .eq("email", loginEmail.trim().toLowerCase())
        .maybeSingle();
      if (baneado) {
        setError("Esta cuenta fue eliminada. Para más información contactá a contacto@zprest.com.ar");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (signInError) {
        setError("Email o contraseña incorrectos");
        return;
      }

      // Obtener datos del usuario
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("role, estado, estado_registro")
        .eq("email", loginEmail)
        .single();

      // Verificar estado de cuenta
      const estado = usuario?.estado ?? "activo";
      if (estado === "inactivo" || estado === "bloqueado" || estado === "eliminado") {
        await supabase.auth.signOut();
        router.push(`/login?error=${estado}`);
        return;
      }

      // Admin: requiere OTP
      if (usuario?.role === "admin") {
        await supabase.auth.signOut();
        await enviarAdminOtp();
        return;
      }

      // Usuario común: redirigir según estado_registro
      if (usuario?.estado_registro === "aprobado") {
        router.push("/dashboard");
      } else {
        router.push("/espera");
      }
    } catch {
      setError("Error al iniciar sesión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Enviar OTP admin ────────────────────────────────────────────────────
  const enviarAdminOtp = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, tipo: "admin-otp" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error al enviar código");
      setOtpKey((k) => k + 1);
      setView("admin-otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al enviar código");
    } finally {
      setLoading(false);
    }
  }, [loginEmail]);

  // ── Verificar OTP admin ────────────────────────────────────────────────
  const handleAdminOtp = useCallback(async (code: string) => {
    setLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, code, tipo: "admin-otp" }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOtpError(data.error ?? "Código incorrecto");
        return;
      }
      // OTP verificado → iniciar sesión con contraseña
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (signInError) {
        setOtpError("Error al iniciar sesión. Intentá de nuevo.");
        return;
      }
      router.push("/admin");
    } catch {
      setOtpError("Error al verificar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [loginEmail, loginPassword, supabase, router]);

  // ── Registro paso 1 → 2 ────────────────────────────────────────────────
  const handleRegistroPaso1 = async () => {
    const { nombre, dni, cuil, email, telefono } = regData;
    if (!nombre || !dni || !cuil || !email || !telefono) {
      setError("Completá todos los campos obligatorios");
      return;
    }
    if (!/^\d{7,8}$/.test(dni)) {
      setError("DNI inválido (7-8 dígitos)");
      return;
    }
    if (!/^\d{11}$/.test(cuil.replace(/\D/g, ""))) {
      setError("CUIL/CUIT inválido (11 dígitos, ej: 20-12345678-9)");
      return;
    }
    if (!/^\+?[\d\s\-()]{8,20}$/.test(telefono)) {
      setError("Ingresá un teléfono válido (ej: 1123456789)");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido");
      return;
    }
    if (!tipoInteres) {
      setError("Seleccioná el tipo de crédito que te interesa");
      return;
    }
    setError("");

    setLoading(true);
    try {
      // Verificar BCRA antes de avanzar
      const bcraRes = await fetch("/api/auth/check-bcra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuil: regData.cuil }),
      });
      const bcraData = await bcraRes.json();
      if (!bcraData.ok) {
        setError(bcraData.error ?? "No es posible continuar con el registro");
        return;
      }
      setView("registro-paso2");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al verificar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Registro paso 2 — contraseña → enviar OTP ─────────────────────────
  const handleRegistroPaso2 = async () => {
    const { password, passwordConfirm } = regData;
    if (!password || !passwordConfirm) {
      setError("Completá ambos campos de contraseña");
      return;
    }
    const erroresPwd = validarPassword(password);
    if (erroresPwd.length > 0) {
      setError(erroresPwd[0]);
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regData.email, tipo: "registro" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error al enviar código");
      setOtpKey((k) => k + 1);
      setView("registro-otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al enviar código de verificación");
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar OTP de registro → crear cuenta directamente ─────────────
  const handleRegistroOtp = useCallback(async (code: string) => {
    setLoading(true);
    setOtpError("");
    try {
      // 1. Verificar OTP
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regData.email, code, tipo: "registro" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.ok) { setOtpError(verifyData.error ?? "Código incorrecto"); return; }

      // 2. Crear cuenta directamente
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: regData.nombre,
          dni: regData.dni,
          cuil: regData.cuil,
          email: regData.email,
          telefono: regData.telefono,
          password: regData.password,
          tipo_interes: tipoInteres,
        }),
      });
      const regResult = await regRes.json();
      if (!regResult.ok) { setOtpError(regResult.error ?? "Error al crear la cuenta"); return; }

      // 3. Iniciar sesión automáticamente
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: regData.email,
        password: regData.password,
      });
      if (signInError) { setOtpError("Cuenta creada, pero no se pudo iniciar sesión automáticamente"); return; }

      router.push("/espera");
    } catch {
      setOtpError("Error al verificar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [regData, tipoInteres, supabase, router]);

  // ── Reset: enviar OTP ────────────────────────────────────────────────
  const handleResetEnviarOtp = async () => {
    if (!resetEmail) { setError("Ingresá tu email"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, tipo: "reset" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error al enviar código");
      setOtpKey((k) => k + 1);
      setView("reset-otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al enviar código");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset: verificar OTP ──────────────────────────────────────────────
  const handleResetVerificarOtp = useCallback(async (code: string) => {
    setLoading(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, code, tipo: "reset" }),
      });
      const data = await res.json();
      if (!data.ok) { setOtpError(data.error ?? "Código incorrecto"); return; }
      setResetOtpVerificado(true);
      setView("reset-nueva");
    } catch {
      setOtpError("Error al verificar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [resetEmail]);

  // ── Reset: actualizar contraseña ──────────────────────────────────────
  const handleResetNuevaPassword = async () => {
    if (!nuevaPassword || !nuevaPasswordConfirm) { setError("Completá ambos campos"); return; }
    const erroresPwd = validarPassword(nuevaPassword);
    if (erroresPwd.length > 0) { setError(erroresPwd[0]); return; }
    if (nuevaPassword !== nuevaPasswordConfirm) { setError("Las contraseñas no coinciden"); return; }
    if (!resetOtpVerificado) { setError("Verificación no completada"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, nuevaPassword }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Error al actualizar contraseña");
      setView("login-email");
      setLoginEmail(resetEmail);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar contraseña");
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof regData) => ({
    value: regData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setRegData((p) => ({ ...p, [key]: e.target.value })),
  });

  const INPUT = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10";
  const LABEL = "mb-1 block text-xs font-medium text-white/60";

  // ── HOME ────────────────────────────────────────────────────────────────
  if (view === "home") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-10 flex flex-col items-center gap-0">
        <span className="font-serif text-3xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      {errorParam && MENSAJES_ESTADO[errorParam] && (
        <div className="mb-6 w-full max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorParam === "eliminado" ? (
            <>
              Tu cuenta fue eliminada. Para más información contactá a{" "}
              <a href="mailto:seguridad@zprest.com.ar" className="font-semibold underline hover:text-red-200">
                seguridad@zprest.com.ar
              </a>
            </>
          ) : (
            MENSAJES_ESTADO[errorParam]
          )}
        </div>
      )}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => { setView("registro-paso1"); setError(""); }}
          className="btn-lift w-full rounded-xl bg-yellow-400 py-3.5 font-bold text-[#060d1f] hover:bg-yellow-300"
        >
          Registrarse
        </button>
        <button
          onClick={() => { setView("login-email"); setError(""); }}
          className="btn-lift w-full rounded-xl border border-white/20 py-3.5 font-medium text-white hover:bg-white/5"
        >
          Ingresar
        </button>
        {IS_MOCK && (
          <button onClick={handleMockAdmin} className="w-full rounded-xl border border-yellow-400/30 py-2.5 text-xs font-medium text-yellow-400 hover:bg-yellow-400/5">
            Entrar como Admin (demo)
          </button>
        )}
      </div>
    </div>
  );

  // ── LOGIN EMAIL + CONTRASEÑA ────────────────────────────────────────────
  if (view === "login-email") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="w-full max-w-sm space-y-5" autoComplete="on">
        <div>
          <h2 className="text-xl font-bold text-white">Ingresar</h2>
          <p className="mt-1 text-sm text-white/50">Ingresá con tu email y contraseña</p>
        </div>
        <div>
          <label className={LABEL}>Email *</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Contraseña *</label>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className={INPUT}
            show={showLoginPwd}
            onToggle={() => setShowLoginPwd(v => !v)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !loginEmail || !loginPassword}
          className="btn-lift w-full rounded-xl bg-sky-500 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar →"}
        </button>
        <button
          type="button"
          onClick={() => { setResetEmail(loginEmail); setView("reset-email"); setError(""); }}
          className="w-full text-sm text-white/40 hover:text-white/70"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <button type="button" onClick={() => setView("home")} className="w-full text-sm text-white/40 hover:text-white/70">← Volver</button>
      </form>
    </div>
  );

  // ── ADMIN OTP ──────────────────────────────────────────────────────────
  if (view === "admin-otp") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Verificación de seguridad</h2>
          <p className="mt-2 text-sm text-white/50">
            Enviamos un código a <span className="text-white">{loginEmail}</span>
          </p>
        </div>
        <OtpInput onComplete={handleAdminOtp} disabled={loading} error={otpError} />
        {loading && <p className="text-center text-sm text-white/50">Verificando...</p>}
        <OtpCountdown
          key={otpKey}
          seconds={90}
          onExpire={() => {}}
          onResend={enviarAdminOtp}
        />
        <button onClick={() => setView("login-email")} className="w-full text-sm text-white/40 hover:text-white/70">← Volver</button>
      </div>
    </div>
  );

  // ── REGISTRO PASO 1 ─────────────────────────────────────────────────────
  if (view === "registro-paso1") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4 py-10">
      <Link href="/" className="mb-6 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <div className="w-full max-w-md space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Paso 1 de 2</p>
          <h2 className="mt-1 text-xl font-bold text-white">Datos personales</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={LABEL}>Nombre y apellido *</label>
            <input placeholder="Juan García" className={INPUT} {...field("nombre")} />
          </div>
          <div>
            <label className={LABEL}>DNI *</label>
            <input
              placeholder="12345678"
              className={INPUT}
              inputMode="numeric"
              value={regData.dni}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                const calc = calcularCUIL(val, cuilPrefijo);
                setRegData(p => ({ ...p, dni: val, ...(calc ? { cuil: calc } : {}) }));
              }}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={LABEL}>CUIL/CUIT <span className="text-red-400">*</span></label>
              <div className="flex gap-1">
                {(["20", "27", "30"] as const).map(p => (
                  <button key={p} type="button"
                    onClick={() => {
                      setCuilPrefijo(p);
                      const calc = calcularCUIL(regData.dni, p);
                      if (calc) setRegData(prev => ({ ...prev, cuil: calc }));
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${cuilPrefijo === p ? "bg-yellow-400 text-black" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                    {p === "20" ? "M" : p === "27" ? "F" : "Emp"}
                  </button>
                ))}
              </div>
            </div>
            <input placeholder="20-12345678-9" className={INPUT} {...field("cuil")} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Email *</label>
          <input type="email" placeholder="tu@email.com" className={INPUT} {...field("email")} />
        </div>
        <div>
          <label className={LABEL}>Teléfono *</label>
          <input placeholder="299 629-3921" className={INPUT} inputMode="tel" {...field("telefono")} />
        </div>
        <div>
          <label className={LABEL}>¿Qué tipo de crédito te interesa? *</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={() => setTipoInteres("personal")}
              className={`rounded-xl border p-4 text-left transition ${
                tipoInteres === "personal"
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
            >
              <p className="text-base font-bold text-white">Crédito Personal</p>
              <p className="mt-0.5 text-xs text-white/50">Personas físicas · Cuotas mensuales · desde $1.000.000</p>
            </button>
            <button
              type="button"
              onClick={() => setTipoInteres("pyme")}
              className={`rounded-xl border p-4 text-left transition ${
                tipoInteres === "pyme"
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
            >
              <p className="text-base font-bold text-white">Crédito Comercial</p>
              <p className="mt-0.5 text-xs text-white/50">Pymes · Cuotas diarias · desde $1.000.000</p>
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={handleRegistroPaso1}
          disabled={!tipoInteres || loading}
          className="btn-lift w-full rounded-xl bg-yellow-400 py-3 font-bold text-[#060d1f] disabled:opacity-50"
        >
          {loading ? "Verificando..." : "Siguiente →"}
        </button>
        <button onClick={() => setView("home")} className="w-full text-sm text-white/40 hover:text-white/70">← Volver</button>
      </div>
    </div>
  );

  // ── REGISTRO OTP ────────────────────────────────────────────────────────
  if (view === "registro-otp") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="text-center">
          <div className="mb-3 text-3xl">📧</div>
          <h2 className="text-lg font-bold text-white">Verificá tu email</h2>
          <p className="mt-1 text-sm text-white/50">
            Enviamos un código de 6 dígitos a{" "}
            <strong className="text-white/80">{regData.email}</strong>
          </p>
        </div>
        <OtpInput key={otpKey} onComplete={handleRegistroOtp} disabled={loading} error={otpError} />
        {otpError && <p className="text-center text-sm text-red-400">{otpError}</p>}
        <OtpCountdown seconds={600} onExpire={() => {}} onResend={() => {
          fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: regData.email, tipo: "registro" }) })
            .finally(() => setOtpKey((k) => k + 1));
        }} />
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => {
              setLoading(true);
              fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: regData.email, tipo: "registro" }) })
                .finally(() => { setOtpKey((k) => k + 1); setLoading(false); });
            }}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-white/60 hover:text-white transition disabled:opacity-40"
          >
            Reenviar código
          </button>
          <button onClick={() => setView("registro-paso2")} className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm text-white/40 hover:text-white/70 transition">
            ← Volver
          </button>
        </div>
      </div>
    </div>
  );

  // ── REGISTRO PASO 2 — CONTRASEÑA ─────────────────────────────────────────
  if (view === "registro-paso2") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Paso 2 de 2</p>
          <h2 className="mt-1 text-xl font-bold text-white">Creá tu contraseña</h2>
          <p className="mt-1 text-sm text-white/50">Luego verificaremos tu email con un código.</p>
        </div>
        <div>
          <label className={LABEL}>Contraseña *</label>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            placeholder="Mínimo 10 caracteres"
            value={regData.password}
            onChange={e => setRegData(p => ({ ...p, password: e.target.value }))}
            className={INPUT}
            show={showRegPwd}
            onToggle={() => setShowRegPwd(v => !v)}
          />
          <PasswordReqs password={regData.password} />
        </div>
        <div>
          <label className={LABEL}>Repetir contraseña *</label>
          <PasswordInput
            name="confirm-password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={regData.passwordConfirm}
            onChange={e => setRegData(p => ({ ...p, passwordConfirm: e.target.value }))}
            className={INPUT}
            show={showRegPwdConfirm}
            onToggle={() => setShowRegPwdConfirm(v => !v)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={handleRegistroPaso2} disabled={loading}
          className="btn-lift w-full rounded-xl bg-yellow-400 py-3 font-bold text-[#060d1f] disabled:opacity-60">
          {loading ? "Enviando código..." : "Verificar email →"}
        </button>
        <button onClick={() => setView("registro-paso1")} className="w-full text-sm text-white/40 hover:text-white/70">← Paso anterior</button>
      </div>
    </div>
  );

  // ── RESET: INGRESAR EMAIL ───────────────────────────────────────────────
  if (view === "reset-email") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <div className="w-full max-w-sm space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white">Restablecer contraseña</h2>
          <p className="mt-1 text-sm text-white/50">Te enviamos un código de verificación a tu email</p>
        </div>
        <div>
          <label className={LABEL}>Email *</label>
          <input
            type="email"
            placeholder="tu@email.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className={INPUT}
            onKeyDown={(e) => e.key === "Enter" && handleResetEnviarOtp()}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          onClick={handleResetEnviarOtp}
          disabled={loading || !resetEmail}
          className="btn-lift w-full rounded-xl bg-sky-500 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar código →"}
        </button>
        <button onClick={() => setView("login-email")} className="w-full text-sm text-white/40 hover:text-white/70">← Volver</button>
      </div>
    </div>
  );

  // ── RESET: VERIFICAR OTP ────────────────────────────────────────────────
  if (view === "reset-otp") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Verificá tu identidad</h2>
          <p className="mt-2 text-sm text-white/50">
            Enviamos un código a <span className="text-white">{resetEmail}</span>
          </p>
        </div>
        <OtpInput onComplete={handleResetVerificarOtp} disabled={loading} error={otpError} />
        {loading && <p className="text-center text-sm text-white/50">Verificando...</p>}
        <OtpCountdown
          key={otpKey}
          seconds={90}
          onExpire={() => {}}
          onResend={handleResetEnviarOtp}
        />
        <button onClick={() => setView("reset-email")} className="w-full text-sm text-white/40 hover:text-white/70">← Volver</button>
      </div>
    </div>
  );

  // ── RESET: NUEVA CONTRASEÑA ─────────────────────────────────────────────
  if (view === "reset-nueva") return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1f] px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-0">
        <span className="font-serif text-2xl font-bold tracking-widest text-white">ZPREST</span>
        <span className="text-[12px] font-bold tracking-[0.18em] text-white/30 transition-colors hover:text-[#D4AF37]">IS45.123</span>
      </Link>
      <form onSubmit={(e) => { e.preventDefault(); handleResetNuevaPassword(); }} className="w-full max-w-sm space-y-5" autoComplete="off">
        <div>
          <h2 className="text-xl font-bold text-white">Nueva contraseña</h2>
          <p className="mt-1 text-sm text-white/50">Elegí una contraseña nueva para tu cuenta</p>
        </div>
        <div>
          <label className={LABEL}>Nueva contraseña *</label>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            placeholder="Mínimo 10 caracteres"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            className={INPUT}
            show={showResetPwd}
            onToggle={() => setShowResetPwd(v => !v)}
          />
          <PasswordReqs password={nuevaPassword} />
        </div>
        <div>
          <label className={LABEL}>Repetir contraseña *</label>
          <PasswordInput
            name="confirm-password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={nuevaPasswordConfirm}
            onChange={(e) => setNuevaPasswordConfirm(e.target.value)}
            className={INPUT}
            show={showResetPwdConfirm}
            onToggle={() => setShowResetPwdConfirm(v => !v)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-lift w-full rounded-xl bg-yellow-400 py-3 font-bold text-[#060d1f] disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar contraseña →"}
        </button>
      </form>
    </div>
  );

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#060d1f]">
        <div className="text-white font-serif text-2xl animate-pulse">ZPREST...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
