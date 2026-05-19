"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAuthToken } from "@/lib/supabase/getToken";

type Perfil = {
  nombre: string | null;
  dni: string | null;
  cuil: string | null;
  telefono: string | null;
  telefono_verificado: boolean | null;
  email: string;
  tipo_cliente: string;
  tipo_interes: string | null;
  estado_registro: string;
  bcra_situacion: number | null;
  nombre_comercio: string | null;
  domicilio: { calle?: string; numero?: string; piso?: string; depto?: string; localidad?: string; provincia?: string; codigo_postal?: string } | null;
  avatar_url: string | null;
  created_at: string;
};

async function comprimirImagen(file: File, maxDim = 400, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas no disponible")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Error al comprimir")),
        "image/jpeg", quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

type LocalidadSugerida = {
  nombre: string;
  provincia: string;
  codigo_postal: string;
};

const BCRA_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: "Sin deudas", color: "text-green-400" },
  1: { label: "Normal", color: "text-green-400" },
  2: { label: "Con seguimiento", color: "text-yellow-400" },
  3: { label: "Con problemas", color: "text-yellow-400" },
  4: { label: "Alto riesgo", color: "text-red-400" },
  5: { label: "Irrecuperable", color: "text-red-400" },
};

const getToken = getAuthToken;

export default function MisDatosPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Campos personales
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombreComercio, setNombreComercio] = useState("");

  // Domicilio
  const [calle, setCalle] = useState("");
  const [altura, setAltura] = useState("");
  const [piso, setPiso] = useState("");
  const [depto, setDepto] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");

  // Buscador de localidades
  const [localidadQuery, setLocalidadQuery] = useState("");
  const [sugerencias, setSugerencias] = useState<LocalidadSugerida[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputLocalidadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const res = await fetch("/api/auth/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { perfil: p } = await res.json();
        setPerfil(p);
        setNombre(p.nombre ?? "");
        setDni(p.dni ?? "");
        setCuil(p.cuil ?? "");
        setTelefono(p.telefono ?? "");
        setNombreComercio(p.nombre_comercio ?? "");
        setAvatarUrl(p.avatar_url ? `${p.avatar_url}?v=${Date.now()}` : null);
        setCalle(p.domicilio?.calle ?? "");
        setAltura(p.domicilio?.numero ?? "");
        setPiso(p.domicilio?.piso ?? "");
        setDepto(p.domicilio?.depto ?? "");
        setLocalidad(p.domicilio?.localidad ?? "");
        setLocalidadQuery(p.domicilio?.localidad ?? "");
        setProvincia(p.domicilio?.provincia ?? "");
        setCodigoPostal(p.domicilio?.codigo_postal ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoAvatar(true);
    setAvatarError("");
    try {
      const compressed = await comprimirImagen(file);
      const fd = new FormData();
      fd.append("file", compressed, "avatar.jpg");
      const token = await getToken();
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setAvatarUrl(data.url);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Error al subir foto");
    } finally {
      setSubiendoAvatar(false);
      e.target.value = "";
    }
  };

  const buscarLocalidades = useCallback(async (q: string) => {
    if (q.length < 2) { setSugerencias([]); return; }
    setBuscando(true);
    try {
      const res = await fetch(
        `https://apis.datos.gob.ar/georef/api/localidades?nombre=${encodeURIComponent(q)}&max=8&campos=nombre,provincia.nombre,codigo_postal&orden=nombre`
      );
      const data = await res.json();
      const resultados: LocalidadSugerida[] = (data.localidades ?? []).map((l: { nombre: string; provincia: { nombre: string }; codigo_postal: string }) => ({
        nombre: l.nombre,
        provincia: l.provincia?.nombre ?? "",
        codigo_postal: l.codigo_postal ?? "",
      }));
      setSugerencias(resultados);
      setMostrarSugerencias(true);
    } catch {
      setSugerencias([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const handleLocalidadChange = (val: string) => {
    setLocalidadQuery(val);
    setLocalidad(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarLocalidades(val), 300);
  };

  const seleccionarLocalidad = (s: LocalidadSugerida) => {
    setLocalidad(s.nombre);
    setLocalidadQuery(s.nombre);
    setProvincia(s.provincia);
    if (s.codigo_postal) setCodigoPostal(s.codigo_postal);
    setSugerencias([]);
    setMostrarSugerencias(false);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setExito(false);
    const token = await getToken();
    const res = await fetch("/api/auth/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre, dni, cuil, telefono, nombre_comercio: nombreComercio || null, domicilio: { calle: calle || null, numero: altura || null, piso: piso || null, depto: depto || null, localidad: localidad || null, provincia: provincia || null, codigo_postal: codigoPostal || null } }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
    } else {
      setExito(true);
      setTimeout(() => setExito(false), 4000);
    }
    setGuardando(false);
  };

  if (loading) {
    return <div className="mx-auto max-w-xl py-16 text-center text-gray-500">Cargando...</div>;
  }

  const esPyme = perfil?.tipo_interes === "pyme" || perfil?.tipo_cliente === "pyme" || !!perfil?.nombre_comercio;
  const iniciales = nombre.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || (perfil?.email?.[0]?.toUpperCase() ?? "U");
  const nombreCompleto = nombre || perfil?.email?.split("@")[0] || "—";

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">

      {/* ── Header de perfil ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-gradient-to-br from-[#d4af37]/15 via-gray-900 to-gray-900">
        <div className="p-6">
          <div className="flex items-center gap-5">
            {/* Avatar con upload */}
            <div className="group relative flex-shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-full shadow-lg ring-2 ring-[#d4af37]/50">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#d4af37] text-2xl font-bold text-black">
                    {iniciales}
                  </div>
                )}
                <label className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full transition ${subiendoAvatar ? "bg-black/70 opacity-100" : "bg-black/60 opacity-0 group-hover:opacity-100"}`}>
                  {subiendoAvatar ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[9px] font-semibold text-white">Cambiar</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={subiendoAvatar} />
                </label>
              </div>
            </div>
            {/* Info principal */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-white">{nombreCompleto}</h1>
              <p className="mt-0.5 truncate text-sm text-gray-400">{perfil?.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  esPyme ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                         : perfil?.tipo_cliente === "personal" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                         : "bg-gray-600/40 text-gray-400 border border-gray-600/50"
                }`}>
                  {esPyme ? "Crédito Comercial" : perfil?.tipo_cliente === "personal" ? "Crédito Personal" : "Sin clasificar"}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  perfil?.estado_registro === "aprobado"
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                }`}>
                  {perfil?.estado_registro === "aprobado" ? "✓ Aprobado" : "⏳ Pendiente"}
                </span>
                {perfil?.bcra_situacion !== null && perfil?.bcra_situacion !== undefined && (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    perfil.bcra_situacion <= 1 ? "border-green-500/30 bg-green-500/10 text-green-300"
                    : perfil.bcra_situacion <= 3 ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}>
                    BCRA Sit. {perfil.bcra_situacion} — {BCRA_LABEL[perfil.bcra_situacion]?.label}
                  </span>
                )}
              </div>
            </div>
            {/* Miembro desde */}
            {perfil?.created_at && (
              <div className="hidden flex-shrink-0 text-right sm:block">
                <p className="text-[10px] uppercase tracking-widest text-gray-600">Miembro desde</p>
                <p className="mt-0.5 text-sm font-medium text-gray-400">
                  {new Date(perfil.created_at).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Separador decorativo */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
        <div className="flex divide-x divide-[#d4af37]/10 text-center">
          <div className="flex-1 py-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">DNI</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-white">{dni || "—"}</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">CUIL / CUIT</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-white">{cuil || "—"}</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">Teléfono</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{telefono || "—"}</p>
          </div>
        </div>
      </div>

      {avatarError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {avatarError}
        </p>
      )}

      <form onSubmit={guardar} className="space-y-6">

        {/* Datos personales */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Datos personales</h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Nombre y apellido *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
              placeholder="Juan García" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">DNI *</label>
              <input value={dni} onChange={(e) => setDni(e.target.value)} required maxLength={8}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60 font-mono"
                placeholder="12345678" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">CUIL / CUIT *</label>
              <input value={cuil} onChange={(e) => setCuil(e.target.value)} required maxLength={11}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60 font-mono"
                placeholder="20123456789" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Teléfono *{" "}
              {perfil?.telefono_verificado && <span className="text-emerald-400">✓ Verificado</span>}
            </label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} required
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
              placeholder="299155414422" />
          </div>

          {esPyme && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Nombre de Comercio *</label>
              <input
                value={nombreComercio}
                onChange={(e) => setNombreComercio(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
                placeholder="Ej: Ferretería El Tornillo"
              />
            </div>
          )}
        </div>

        {/* Domicilio */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {esPyme ? "Domicilio Comercial" : "Domicilio"}
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-400">Calle</label>
              <input value={calle} onChange={(e) => setCalle(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
                placeholder="Av. Siempre Viva" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Altura / Nro.</label>
              <input value={altura} onChange={(e) => setAltura(e.target.value)} type="number" min="1"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60 font-mono"
                placeholder="742" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Piso</label>
              <input value={piso} onChange={(e) => setPiso(e.target.value)} type="number" min="1"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60 font-mono"
                placeholder="3" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Departamento</label>
              <input value={depto} onChange={(e) => setDepto(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
                placeholder="A" />
            </div>
          </div>

          {/* Buscador de localidad */}
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-400">Localidad</label>
            <input
              ref={inputLocalidadRef}
              value={localidadQuery}
              onChange={(e) => handleLocalidadChange(e.target.value)}
              onFocus={() => sugerencias.length > 0 && setMostrarSugerencias(true)}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
              placeholder="Escribí tu localidad..."
              autoComplete="off"
            />
            {buscando && (
              <span className="absolute right-3 top-8 text-xs text-gray-500">buscando...</span>
            )}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 shadow-xl overflow-hidden">
                {sugerencias.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => seleccionarLocalidad(s)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-800 transition"
                    >
                      <span>
                        <span className="font-medium text-white">{s.nombre}</span>
                        <span className="ml-2 text-xs text-gray-400">{s.provincia}</span>
                      </span>
                      {s.codigo_postal && (
                        <span className="ml-2 font-mono text-xs text-[#d4af37]">{s.codigo_postal}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Provincia</label>
              <input value={provincia} onChange={(e) => setProvincia(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60"
                placeholder="Se completa automáticamente" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Código Postal</label>
              <input value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} maxLength={8}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#d4af37]/60 font-mono"
                placeholder="Se completa automáticamente" />
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Provincia y código postal se completan automáticamente al seleccionar la localidad.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}
        {exito && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm text-green-400">
            ✓ Datos actualizados correctamente
          </p>
        )}

        <button type="submit" disabled={guardando}
          className="w-full rounded-xl bg-[#d4af37] py-3 font-semibold text-black hover:bg-[#c9a227] disabled:opacity-50 transition-colors">
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
