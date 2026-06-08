"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getAuthToken } from "@/lib/supabase/getToken";
import { calcularCuotaDiariaComercial, formatearPesos } from "@/lib/loan-calculator";
import { LOCALIDADES } from "@/lib/constants";
import type { PlanSimulador } from "@/types";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

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

const BANCOS_AR = [
  "Banco Nación Argentina", "Banco Provincia de Buenos Aires", "Banco Ciudad de Buenos Aires",
  "Banco Galicia", "Banco Santander Argentina", "BBVA Argentina", "HSBC Argentina",
  "Banco Macro", "Banco Supervielle", "Banco Patagonia", "Banco Comafi", "Banco Hipotecario",
  "ICBC Argentina", "Banco Industrial", "Banco Credicoop", "Banco de Corrientes",
  "Banco de Entre Ríos", "Banco de Neuquén", "Banco de San Juan", "Banco de Santa Cruz",
  "Banco de Santa Fe", "Banco del Chaco", "Banco del Tucumán", "Banco Meridian",
  "Brubank", "Mercado Pago", "Ualá", "Naranja X", "Personal Pay", "Lemon Cash",
];

const MONTOS = [1000000, 2000000, 3000000, 5000000, 7000000, 10000000, 15000000];
const DIAS_OPTS = [30, 60, 90, 120];
const PASOS = ["Crédito", "Datos", "CBU/CVU", "Comercio", "Documentos", "Confirmar"];
const DOCS = ["DNI frente", "DNI dorso", "Constancia de inscripción AFIP", "Licencia Comercial", "Comprobante de ingresos (últimos 3 meses)"];
const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp";
const ACCEPT_IMG = "image/*";

interface ArchivoSubido {
  label: string; file: File; url: string | null; path: string | null;
  uploading: boolean; error: string | null;
}
interface BCRACheck {
  loading: boolean; checked: boolean; situacion: number | null;
  denominacion: string | null; error: string | null; excepcion?: boolean;
}

function iconTipo(tipo: string) {
  if (tipo.includes("pdf")) return "📄";
  if (tipo.includes("word") || tipo.includes("document")) return "📝";
  if (tipo.startsWith("image/")) return "🖼️";
  return "📎";
}
function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function StepIndicator({ paso, total }: { paso: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
            i < paso ? "bg-green-500 text-white" : i === paso ? "bg-yellow-500 text-black" : "bg-gray-700 text-gray-400"
          }`}>
            {i < paso ? "✓" : i + 1}
          </div>
          {i < total - 1 && <div className={`h-0.5 w-8 rounded ${i < paso ? "bg-green-500" : "bg-gray-700"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function SolicitarPymePage() {
  const { usuario } = useAuth();
  const [paso, setPaso] = useState(() =>
    typeof window !== "undefined" ? parseInt(sessionStorage.getItem("zprest_sol_c_paso") || "0") : 0
  );
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [planes, setPlanes] = useState<PlanSimulador[]>([]);

  const [monto, setMonto] = useState(() => {
    if (typeof window !== "undefined") {
      const s = sessionStorage.getItem("zprest_sol_c_monto");
      return s ? parseInt(s) : 1000000;
    }
    return 1000000;
  });
  const [montoStr, setMontoStr] = useState(() => {
    if (typeof window !== "undefined") {
      const s = sessionStorage.getItem("zprest_sol_c_monto");
      return s ? parseInt(s).toLocaleString("es-AR") : "1.000.000";
    }
    return "1.000.000";
  });
  const [planSelId, setPlanSelId] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("zprest_sol_c_plan_id") || "" : ""
  );

  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cuilPrefijo, setCuilPrefijo] = useState<"20" | "27" | "30">("20");
  const [nombreComercio, setNombreComercio] = useState("");
  const [profesion, setProfesion] = useState("");
  const [domCalle, setDomCalle] = useState("");
  const [domAltura, setDomAltura] = useState("");
  const [domPiso, setDomPiso] = useState("");
  const [domDepto, setDomDepto] = useState("");
  const [domLocalidad, setDomLocalidad] = useState("");
  const [domProvincia, setDomProvincia] = useState("");
  const [domCodPostal, setDomCodPostal] = useState("");
  const [cbu, setCbu] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("zprest_sol_c_cbu") || "" : ""
  );
  const [banco, setBanco] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("zprest_sol_c_banco") || "" : ""
  );
  const [archivos, setArchivos] = useState<ArchivoSubido[]>([]);
  const [bcra, setBcra] = useState<BCRACheck>({ loading: false, checked: false, situacion: null, denominacion: null, error: null });

  const [docsPrevios, setDocsPrevios] = useState(false);

  const [phoneVerified, setPhoneVerifiedState] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("zprest_phone_verified_c") === "1"
  );
  const [otpSent, setOtpSentState] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("zprest_otp_sent_c") === "1"
  );
  const [otpToken, setOtpTokenState] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("zprest_otp_token_c") || "" : ""
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const setPhoneVerified = (v: boolean) => { setPhoneVerifiedState(v); v ? sessionStorage.setItem("zprest_phone_verified_c", "1") : sessionStorage.removeItem("zprest_phone_verified_c"); };
  const setOtpSent = (v: boolean) => { setOtpSentState(v); v ? sessionStorage.setItem("zprest_otp_sent_c", "1") : sessionStorage.removeItem("zprest_otp_sent_c"); };
  const setOtpToken = (v: string) => { setOtpTokenState(v); v ? sessionStorage.setItem("zprest_otp_token_c", v) : sessionStorage.removeItem("zprest_otp_token_c"); };

  useEffect(() => { sessionStorage.setItem("zprest_sol_c_paso", String(paso)); }, [paso]);
  useEffect(() => { sessionStorage.setItem("zprest_sol_c_monto", String(monto)); }, [monto]);
  useEffect(() => { if (planSelId) sessionStorage.setItem("zprest_sol_c_plan_id", planSelId); }, [planSelId]);
  useEffect(() => { sessionStorage.setItem("zprest_sol_c_cbu", cbu); }, [cbu]);
  useEffect(() => { sessionStorage.setItem("zprest_sol_c_banco", banco); }, [banco]);

  const [planesPreferenciales, setPlanesPreferenciales] = useState<PlanSimulador[]>([]);

  useEffect(() => {
    fetch("/api/planes/simulador").then(r => r.json()).then(d => { if (Array.isArray(d)) setPlanes(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuario) return;
    setNombre(prev => prev || usuario.nombre || "");
    setDni(prev => prev || usuario.dni || "");
    setCuil(prev => prev || usuario.cuil || "");
    setTelefono(prev => prev || usuario.telefono || "");
    setNombreComercio(prev => prev || usuario.nombre_comercio || "");
    setProfesion(prev => prev || (usuario as any).profesion || "");
    const dom = usuario.domicilio;
    if (dom) {
      setDomCalle(prev => prev || dom.calle || "");
      setDomAltura(prev => prev || dom.numero || "");
      setDomPiso(prev => prev || dom.piso || "");
      setDomDepto(prev => prev || dom.depto || "");
      setDomLocalidad(prev => prev || dom.localidad || "");
      setDomProvincia(prev => prev || dom.provincia || "");
      setDomCodPostal(prev => prev || dom.codigo_postal || "");
    }
  }, [usuario?.id]);

  // Detectar si tiene documentación de operaciones anteriores
  useEffect(() => {
    if (!usuario?.id) return;
    getToken().then(async token => {
      if (!token) return;
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("solicitudes")
        .select("documentos")
        .eq("user_id", usuario.id)
        .not("documentos", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]?.documentos?.length >= DOCS.length) setDocsPrevios(true);
    });
  }, [usuario?.id]);

  // Cargar plan(es) preferencial(es) del usuario
  useEffect(() => {
    if (!usuario?.plan_preferencial_id) return;
    getToken().then(token => {
      if (!token) return;
      fetch("/api/planes/preferencial", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.plan?.tipo === "pyme") setPlanesPreferenciales([d.plan]); })
        .catch(() => {});
    });
  }, [usuario?.plan_preferencial_id]);

  const planesComercial = planes.filter(p => p.tipo === "pyme" && p.activo);
  const todosLosPlanes = [...planesPreferenciales, ...planesComercial];

  // Seleccionar plan por defecto cuando cargan los planes
  useEffect(() => {
    if (planSelId || todosLosPlanes.length === 0) return;
    setPlanSelId(todosLosPlanes[0].id);
  }, [todosLosPlanes.length]);

  const planActivo = todosLosPlanes.find(p => p.id === planSelId) ?? todosLosPlanes[0];
  const dias = planActivo?.plazo_min ?? 90;
  const cuotaPreview = planActivo?.ted ? calcularCuotaDiariaComercial(monto, planActivo.ted, dias) : 0;

  const getToken = getAuthToken;

  const sendOtp = async () => {
    setOtpLoading(true); setOtpError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin sesión");
      const res = await fetch("/api/verify/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "send", phone: telefono, channel: "sms" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      setOtpToken(data.otpToken || ""); setOtpSent(true);
    } catch (e) { setOtpError(e instanceof Error ? e.message : "Error"); }
    finally { setOtpLoading(false); }
  };

  const confirmOtp = async () => {
    setOtpLoading(true); setOtpError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin sesión");
      const res = await fetch("/api/verify/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "confirm", code: otpCode, otpToken, phone: telefono, channel: "sms" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código incorrecto");
      setPhoneVerified(true);
    } catch (e) { setOtpError(e instanceof Error ? e.message : "Código incorrecto"); }
    finally { setOtpLoading(false); }
  };

  const consultarBCRA = async (): Promise<boolean> => {
    const clean = (cuil || dni).replace(/\D/g, "");
    if (!clean || clean.length < 7) return true;
    setBcra({ loading: true, checked: false, situacion: null, denominacion: null, error: null });
    try {
      const res = await fetch(`/api/bcra/deudas/${clean}`);
      const data = await res.json();
      if (data.error) { setBcra({ loading: false, checked: true, situacion: null, denominacion: null, error: "No se pudo verificar BCRA" }); return true; }
      const periodos = data.results?.periodos ?? [];
      const entidades = periodos[0]?.entidades ?? [];
      const situacion = entidades.length ? Math.max(...entidades.map((e: { situacion: number }) => e.situacion)) : 0;
      const denominacion = data.results?.denominacion ?? null;

      let excepcion = false;
      if (situacion >= 4 && /^\d{11}$/.test(clean)) {
        try {
          const token = await getToken();
          const excRes = await fetch(`/api/bcra/excepcion/${clean}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const excData = await excRes.json();
          excepcion = excData?.excepcion === true;
        } catch { /* si falla la consulta de excepción, no desbloquear */ }
      }

      setBcra({ loading: false, checked: true, situacion, denominacion, error: null, excepcion });
      return situacion < 4 || excepcion;
    } catch {
      setBcra({ loading: false, checked: true, situacion: null, denominacion: null, error: "Error al consultar BCRA" });
      return true;
    }
  };

  const subirArchivo = async (file: File, label: string) => {
    const nuevo: ArchivoSubido = { label, file, url: null, path: null, uploading: true, error: null };
    setArchivos(prev => [...prev, nuevo]);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sin sesión");
      const fd = new FormData();
      fd.append("file", file); fd.append("label", label);
      const res = await fetch("/api/documentos/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Error al subir");
      const result = await res.json() as { url: string | null; path: string };
      setArchivos(prev => prev.map(a => a.file === file ? { ...a, url: result.url, path: result.path, uploading: false } : a));
    } catch (e) {
      setArchivos(prev => prev.map(a => a.file === file ? { ...a, uploading: false, error: e instanceof Error ? e.message : "Error" } : a));
    }
  };

  const quitarArchivo = (file: File) => setArchivos(prev => prev.filter(a => a.file !== file));

  const handleContinuar = async () => {
    setError("");
    if (paso === 1) { const ok = await consultarBCRA(); if (!ok) return; }
    if (paso === 4) {
      const docsSubidos = archivos.filter(a => a.url).length;
      if (docsSubidos < DOCS.length && !docsPrevios) {
        setError(`Debés completar todos los documentos antes de continuar (${docsSubidos}/${DOCS.length} subidos).`);
        return;
      }
    }
    setPaso(p => p + 1);
  };

  const handleSubmit = async () => {
    setEnviando(true); setError("");
    try {
      if (IS_MOCK) { await new Promise(r => setTimeout(r, 1200)); setEnviado(true); return; }
      if (archivos.some(a => a.uploading)) throw new Error("Esperá a que terminen de subir los archivos");
      const token = await getToken();
      if (!token) throw new Error("Sin sesión");

      const domicilioComercial = (domCalle || domAltura || domLocalidad || domProvincia) ? {
        calle: domCalle || null,
        numero: domAltura || null,
        piso: domPiso || null,
        depto: domDepto || null,
        localidad: domLocalidad || null,
        provincia: domProvincia || null,
        codigo_postal: domCodPostal || null,
      } : null;

      // Guardar nombre_comercio + profesion + domicilio en el perfil del usuario
      await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre_comercio: nombreComercio || null,
          profesion: profesion || null,
          domicilio: domicilioComercial,
        }),
      });

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: planActivo?.id, monto, plazo: dias, cuotas: dias, cbu,
          banco: banco || null,
          nombre_comercio: nombreComercio || null,
          domicilio: domicilioComercial,
          documentos: archivos.filter(a => a.url).map(a => a.url as string),
          bcra_situacion: bcra.situacion, bcra_advertencia: bcra.situacion !== null && bcra.situacion >= 2,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al enviar");
      sessionStorage.removeItem("zprest_phone_verified_c");
      sessionStorage.removeItem("zprest_otp_sent_c");
      sessionStorage.removeItem("zprest_otp_token_c");
      sessionStorage.removeItem("zprest_sol_c_paso");
      sessionStorage.removeItem("zprest_sol_c_monto");
      sessionStorage.removeItem("zprest_sol_c_dias");
      sessionStorage.removeItem("zprest_sol_c_cbu");
      sessionStorage.removeItem("zprest_sol_c_banco");
      setEnviado(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error desconocido"); }
    finally { setEnviando(false); }
  };

  if (enviado) return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-900/30">
          <span className="text-4xl">✓</span>
        </div>
      </div>
      <h1 className="text-2xl font-bold text-white">¡Solicitud enviada!</h1>
      <p className="text-gray-400">Recibimos tu solicitud de {formatearPesos(monto)}. Nuestro equipo la revisará en menos de 24 hs y te notificaremos por email.</p>
      <a href="/dashboard" className="inline-block rounded-lg bg-yellow-500 px-6 py-3 text-sm font-semibold text-black hover:bg-yellow-400">Ir al dashboard</a>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Solicitar crédito comercial</h1>
        <p className="mt-1 text-sm text-gray-400">Paso {paso + 1} de {PASOS.length} — {PASOS[paso]}</p>
      </div>

      <StepIndicator paso={paso} total={PASOS.length} />

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-sm">

        {/* ── Paso 0: Crédito ── */}
        {paso === 0 && (
          <div className="space-y-5">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <label className="font-medium text-white">Monto a solicitar</label>
                <span className="text-xs text-gray-500">Mín. $1.000.000 · Máx. $15.000.000</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-yellow-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoStr}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const num = parseInt(raw || "0", 10);
                    setMonto(num);
                    setMontoStr(raw ? num.toLocaleString("es-AR") : "");
                  }}
                  onBlur={() => {
                    const clamped = Math.min(15000000, Math.max(1000000, monto || 1000000));
                    setMonto(clamped);
                    setMontoStr(clamped.toLocaleString("es-AR"));
                  }}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 py-3 pl-8 pr-4 text-xl font-bold text-yellow-400 placeholder-gray-600 outline-none focus:border-yellow-500"
                  placeholder="1.000.000"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">Plan comercial</label>
              <select
                value={planSelId}
                onChange={e => setPlanSelId(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-3 text-sm font-medium text-white outline-none focus:border-yellow-500"
              >
                {planesPreferenciales.length > 0 && (
                  <optgroup label="⭐ Tasa preferencial">
                    {planesPreferenciales.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {p.plazo_min} días (TED {p.ted}%)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={planesPreferenciales.length > 0 ? "Planes estándar" : "Plan comercial"}>
                  {planesComercial.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.plazo_min} días — cuota diaria
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {cuotaPreview > 0 && (
              <div className={`rounded-xl p-4 text-center ${planesPreferenciales.some(p => p.id === planSelId) ? "bg-amber-500/10 border border-amber-500/30" : "bg-gray-800"}`}>
                {planesPreferenciales.some(p => p.id === planSelId) && (
                  <p className="mb-1 text-xs font-bold text-amber-400">⭐ Tasa preferencial aplicada</p>
                )}
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Cuota diaria estimada</p>
                <p className={`mt-1 text-3xl font-bold ${planesPreferenciales.some(p => p.id === planSelId) ? "text-amber-400" : "text-yellow-400"}`}>
                  {formatearPesos(cuotaPreview)}
                </p>
                <p className="mt-1 text-xs text-gray-400">{dias} días · se cobra todos los días hábiles · incluye IVA</p>
              </div>
            )}
          </div>
        )}

        {/* ── Paso 1: Datos ── */}
        {paso === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-yellow-700/30 bg-yellow-900/10 px-3 py-2 text-xs text-yellow-400/80">
              🔒 Datos tomados de tu perfil. Para modificarlos <Link href="/mis-datos" className="underline hover:text-yellow-300">actualizá tu PERFIL</Link>.
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">Nombre completo del titular</label>
              <div className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-300">
                {nombre || <span className="text-gray-600">—</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-white">DNI del titular</label>
                <div className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-300">
                  {dni || <span className="text-gray-600">—</span>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">CUIT</label>
                <div className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-300">
                  {cuil || <span className="text-gray-600">—</span>}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white">Teléfono</label>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500"
                  value={telefono} onChange={e => { setTelefono(e.target.value); setPhoneVerified(false); setOtpSent(false); setOtpCode(""); }}
                  placeholder="+54 9 11 1234-5678" inputMode="tel" disabled={phoneVerified} />
                {!phoneVerified && (
                  <button onClick={sendOtp} disabled={otpLoading || !telefono.trim()}
                    className="shrink-0 rounded-lg bg-yellow-500 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-400 disabled:opacity-50">
                    {otpLoading && !otpSent ? "..." : otpSent ? "Reenviar" : "Verificar"}
                  </button>
                )}
                {phoneVerified && <span className="flex items-center gap-1 rounded-lg bg-green-900/30 px-3 text-xs font-semibold text-green-400">✓ Verificado</span>}
              </div>
              {otpSent && !phoneVerified && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-400">Código enviado por SMS a <strong className="text-white">{telefono}</strong>. Expira en 60 segundos.</p>
                  <div className="flex gap-2">
                    <input className="w-36 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-center font-mono text-lg tracking-widest text-white placeholder-gray-600 outline-none focus:border-yellow-500"
                      value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength={6} />
                    <button onClick={confirmOtp} disabled={otpLoading || otpCode.length !== 6}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      {otpLoading ? "..." : "Confirmar"}
                    </button>
                  </div>
                  {otpError && <p className="text-xs text-red-400">{otpError}</p>}
                </div>
              )}
            </div>

            {bcra.loading && (
              <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                Verificando situación en BCRA...
              </div>
            )}
            {bcra.checked && !bcra.loading && (bcra.situacion === 0 || bcra.situacion === 1) && (
              <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-semibold text-green-400">{bcra.denominacion ? `${bcra.denominacion} — ` : ""}Situación {bcra.situacion} · Normal</p>
                  <p className="text-xs text-green-500">Probable aprobación — perfil crediticio en orden.</p>
                </div>
              </div>
            )}
            {bcra.checked && !bcra.loading && (bcra.situacion === 2 || bcra.situacion === 3) && (
              <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-400">{bcra.denominacion} — Situación {bcra.situacion}</p>
                  <p className="text-xs text-yellow-500">A consultar — tu solicitud quedará en revisión.</p>
                </div>
              </div>
            )}
            {bcra.checked && !bcra.loading && bcra.situacion !== null && bcra.situacion >= 4 && bcra.excepcion && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-sm">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-semibold text-blue-400">{bcra.denominacion} — Situación {bcra.situacion}</p>
                  <p className="text-xs text-blue-400">Autorizado por administración para continuar pese a la situación crediticia.</p>
                </div>
              </div>
            )}
            {bcra.checked && !bcra.loading && bcra.situacion !== null && bcra.situacion >= 4 && !bcra.excepcion && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
                <span className="text-xl">🚫</span>
                <div>
                  <p className="font-semibold text-red-400">{bcra.denominacion} — Situación {bcra.situacion}</p>
                  <p className="text-xs text-red-500">No es posible procesar tu crédito en este momento.</p>
                </div>
              </div>
            )}
            {bcra.checked && bcra.error && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-800 p-3 text-xs text-gray-400">
                <span>ℹ️</span> {bcra.error}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 2: CBU/CVU ── */}
        {paso === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-yellow-900/20 p-4 text-sm text-yellow-300">
              <p className="font-semibold">¿Para qué sirve el CBU/CVU?</p>
              <p className="mt-1 text-xs">Usamos tu CBU o CVU para acreditar el préstamo una vez aprobado y para gestionar los cobros automáticos de las cuotas (DEBIN). Aceptamos billeteras virtuales (Mercado Pago, Ualá, Naranja X, etc.).</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">CBU/CVU (22 dígitos)</label>
              <input className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500"
                value={cbu} onChange={e => setCbu(e.target.value.replace(/\D/g, "").slice(0, 22))}
                placeholder="0000000000000000000000" inputMode="numeric" maxLength={22} />
              <p className="mt-1 text-xs text-gray-400">{cbu.length}/22 dígitos</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white">Banco / Entidad financiera</label>
              <input
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500"
                value={banco} onChange={e => setBanco(e.target.value)}
                placeholder="Ej: Banco Nación, Mercado Pago..."
                list="bancos-list-c"
                autoComplete="off"
              />
              <datalist id="bancos-list-c">
                {BANCOS_AR.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>
          </div>
        )}

        {/* ── Paso 3: Comercio ── */}
        {paso === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-yellow-700/30 bg-yellow-900/10 px-3 py-2 text-xs text-yellow-400/80">
              ✏️ Podés editar estos datos antes de continuar. Se actualizarán en tu perfil al enviar.
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-yellow-500">Nombre del comercio *</label>
              <input
                type="text"
                value={nombreComercio}
                onChange={e => setNombreComercio(e.target.value)}
                placeholder="Ej: Almacén Don Pedro, Ferretería El Tornillo..."
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-yellow-500">Actividad / Rubro</label>
              <input
                type="text"
                value={profesion}
                onChange={e => setProfesion(e.target.value)}
                placeholder="Ej: Venta minorista, Gastronomía, Servicios profesionales..."
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500"
              />
            </div>
            <div className="pt-1">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-yellow-500">Domicilio Comercial</p>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-300">Calle</label>
                    <input type="text" value={domCalle} onChange={e => setDomCalle(e.target.value)}
                      placeholder="Av. San Martín" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">Altura / Nro.</label>
                    <input type="text" value={domAltura} onChange={e => setDomAltura(e.target.value)}
                      placeholder="1234" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">Piso</label>
                    <input type="text" value={domPiso} onChange={e => setDomPiso(e.target.value)}
                      placeholder="2" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">Departamento</label>
                    <input type="text" value={domDepto} onChange={e => setDomDepto(e.target.value)}
                      placeholder="A" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">Localidad *</label>
                    <select
                      value={domLocalidad}
                      onChange={e => {
                        const sel = LOCALIDADES.find(l => l.nombre === e.target.value);
                        setDomLocalidad(e.target.value);
                        setDomProvincia(sel?.provincia ?? "");
                      }}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
                    >
                      <option value="">Seleccioná...</option>
                      {LOCALIDADES.map(l => (
                        <option key={l.nombre} value={l.nombre}>{l.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-300">Provincia</label>
                    <div className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-gray-300">
                      {domProvincia || <span className="text-gray-600">—</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-300">Código Postal</label>
                  <input type="text" value={domCodPostal} onChange={e => setDomCodPostal(e.target.value)}
                    placeholder="8300" inputMode="numeric" className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Documentos ── */}
        {paso === 4 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-white">Documentos requeridos — Plan Comercial</p>
              <p className="mt-0.5 text-xs text-gray-400">PDF, Word, JPG, PNG o foto · máx 10 MB por archivo</p>
            </div>

            {/* Banner documentación previa */}
            {docsPrevios && archivos.filter(a => a.url).length < DOCS.length && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-sm font-semibold text-green-400">✓ Documentación ya registrada</p>
                <p className="mt-1 text-xs text-green-300/80">
                  Ya tenemos tu documentación de operaciones anteriores. Podés continuar sin subir nuevos archivos, o actualizarlos si hubo cambios.
                </p>
              </div>
            )}
            {DOCS.map(label => {
              const subidos = archivos.filter(a => a.label === label);
              return (
                <div key={label} className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">{label}</p>
                  {subidos.map(a => (
                    <div key={a.file.name + a.file.size} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${a.error ? "border-red-500/40 bg-red-500/10" : a.uploading ? "border-yellow-500/30 bg-yellow-500/10" : "border-green-500/30 bg-green-500/10"}`}>
                      <span className="shrink-0 text-xl">{a.uploading ? "⏳" : a.error ? "❌" : iconTipo(a.file.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{a.file.name}</p>
                        <p className="text-xs text-gray-400">{a.uploading ? "Subiendo..." : a.error ? a.error : `${fmtSize(a.file.size)} · subido ✓`}</p>
                      </div>
                      {!a.uploading && <button onClick={() => quitarArchivo(a.file)} className="shrink-0 text-gray-500 hover:text-red-400 transition">✕</button>}
                    </div>
                  ))}
                  {subidos.filter(a => !a.error).length === 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-600 p-4 text-center hover:border-yellow-500 hover:bg-yellow-500/5 transition">
                        <span className="text-2xl">📁</span>
                        <span className="text-xs font-medium text-gray-300">Elegir archivo</span>
                        <span className="text-[10px] text-gray-500">PDF · Word · JPG · PNG</span>
                        <input type="file" accept={ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f, label); e.target.value = ""; }} />
                      </label>
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-600 p-4 text-center hover:border-cyan-500 hover:bg-cyan-500/5 transition">
                        <span className="text-2xl">📷</span>
                        <span className="text-xs font-medium text-gray-300">Sacar foto</span>
                        <span className="text-[10px] text-gray-500">Cámara del celular</span>
                        <input type="file" accept={ACCEPT_IMG} capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f, label); e.target.value = ""; }} />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
            {(() => {
              const subidos = archivos.filter(a => a.url).length;
              const completo = subidos === DOCS.length || docsPrevios;
              return (
                <div className={`rounded-xl px-4 py-3 text-sm ${completo ? "bg-green-500/10 border border-green-500/30" : "bg-gray-800"}`}>
                  <span className="text-gray-400">Subidos: </span>
                  <span className={`font-semibold ${completo ? "text-green-400" : "text-yellow-400"}`}>
                    {subidos}/{DOCS.length}
                  </span>
                  {completo
                    ? <span className="ml-2 text-xs text-green-400">✓ Listo para continuar</span>
                    : <span className="ml-2 text-xs text-red-400">* Todos los documentos son obligatorios</span>
                  }
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Paso 5: Confirmar ── */}
        {paso === 5 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Resumen de tu solicitud</h2>
            <dl className="divide-y divide-gray-800 text-sm">
              {[
                ["Plan", "Comercial (diario)"],
                ["Comercio", nombreComercio || "—"],
                ["Domicilio", [domCalle, domAltura, domPiso && `Piso ${domPiso}`, domDepto, domLocalidad, domProvincia, domCodPostal].filter(Boolean).join(" ") || "—"],
                ["Monto solicitado", formatearPesos(monto)],
                ["Plazo", `${dias} días`],
                ...(cuotaPreview > 0 ? [["Cuota diaria estimada", formatearPesos(cuotaPreview)]] : []),
                ["Titular", nombre],
                ["DNI", dni],
                ["CUIT", cuil],
                ["CBU/CVU", cbu || "—"],
                ["Banco", banco || "—"],
                ["Documentos adjuntos", `${archivos.filter(a => a.url).length}/${DOCS.length}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2">
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="font-medium text-white text-right max-w-[60%]">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => {
                const domicilioStr = [domCalle, domAltura, domPiso && `Piso ${domPiso}`, domDepto, domLocalidad, domProvincia, domCodPostal].filter(Boolean).join(" ") || "—";
                const win = window.open("", "_blank");
                if (!win) return;
                win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Resumen Solicitud Zprest</title><style>
                  body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#111;font-size:14px}
                  h1{font-size:22px;margin-bottom:4px}p.sub{color:#555;font-size:12px;margin-bottom:24px}
                  table{width:100%;border-collapse:collapse}
                  tr{border-bottom:1px solid #eee}td{padding:10px 8px}td:first-child{color:#666;width:45%}td:last-child{font-weight:600;text-align:right}
                  .footer{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:12px}
                  @media print{body{margin:20px}}
                </style></head><body>
                  <h1>Solicitud de Crédito Comercial</h1>
                  <p class="sub">Zprest · ${new Date().toLocaleDateString("es-AR", { day:"2-digit", month:"long", year:"numeric" })}</p>
                  <table>
                    <tr><td>Plan</td><td>Comercial (diario)</td></tr>
                    <tr><td>Nombre del comercio</td><td>${nombreComercio || "—"}</td></tr>
                    <tr><td>Domicilio comercial</td><td>${domicilioStr}</td></tr>
                    <tr><td>Monto solicitado</td><td>${formatearPesos(monto)}</td></tr>
                    <tr><td>Plazo</td><td>${dias} días</td></tr>
                    ${cuotaPreview > 0 ? `<tr><td>Cuota diaria estimada</td><td>${formatearPesos(cuotaPreview)}</td></tr>` : ""}
                    <tr><td>Titular</td><td>${nombre}</td></tr>
                    <tr><td>DNI</td><td>${dni}</td></tr>
                    <tr><td>CUIT</td><td>${cuil}</td></tr>
                    <tr><td>CBU/CVU</td><td>${cbu || "—"}</td></tr>
                    <tr><td>Documentos adjuntos</td><td>${archivos.filter(a => a.url).length} de ${DOCS.length}</td></tr>
                  </table>
                  <div class="footer">Este es un resumen de la solicitud ingresada. La aprobación queda sujeta a evaluación crediticia. Cuota estimada, no definitiva.</div>
                </body></html>`);
                win.document.close();
                setTimeout(() => win.print(), 400);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/20 transition"
            >
              ⬇ Descargar resumen en PDF
            </button>
            <div className="rounded-xl bg-amber-900/20 p-3 text-xs text-amber-300">
              Al confirmar aceptás los Términos y Condiciones de Zprest. La cuota indicada es una estimación sujeta a aprobación.
            </div>
            {error && <p className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setPaso(p => p - 1)} disabled={paso === 0}
          className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-30 hover:bg-gray-800">
          ← Atrás
        </button>
        {paso < PASOS.length - 1 ? (
          <button onClick={paso === 1 ? handleContinuar : () => setPaso(p => p + 1)}
            disabled={
              bcra.loading ||
              (paso === 1 && !phoneVerified) ||
              (paso === 4 && archivos.filter(a => a.url).length < DOCS.length && !docsPrevios)
            }
            className="rounded-lg bg-yellow-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-60">
            {bcra.loading ? "Verificando..." : paso === 1 && !phoneVerified ? "Verificá el teléfono" : "Continuar →"}
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={enviando}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {enviando ? "Enviando..." : "Enviar solicitud"}
          </button>
        )}
      </div>
    </div>
  );
}
