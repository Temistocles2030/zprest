-- Zprest: Schema Supabase PostgreSQL
-- Proyecto: ngisdicmwbknwlkxtkka.supabase.co
-- Ejecutar en: Supabase Dashboard > SQL Editor > Run

create extension if not exists "uuid-ossp";

-- ── usuarios (extiende auth.users de Supabase Auth) ──────────────────────────
create table if not exists public.usuarios (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nombre text,
  apellido text,
  dni text,
  cuil text,
  telefono text,
  telefono_verificado boolean default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  tipo_interes text check (tipo_interes in ('personal','pyme')),
  estado_registro text default 'pendiente_aprobacion'
    check (estado_registro in ('pendiente_aprobacion','aprobado')),
  estado text not null default 'activo'
    check (estado in ('activo','inactivo','bloqueado','eliminado')),
  estado_motivo text,
  estado_hasta timestamptz,
  estado_cambiado_at timestamptz,
  estado_cambiado_por uuid references public.usuarios(id),
  nombre_comercio text,
  empleador text,
  profesion text,
  domicilio jsonb,
  bcra_situacion integer,
  bcra_advertencia text,
  afip_activo boolean,
  afip_actividad text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── planes de crédito ─────────────────────────────────────────────────────────
create table if not exists public.planes (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  tipo text not null check (tipo in ('personal', 'pyme', 'dependencia')),
  tem numeric,
  ted numeric,
  frecuencia text check (frecuencia in ('diario', 'quincenal', 'mensual')),
  monto_min bigint not null,
  monto_max bigint not null,
  plazo_min int not null,
  plazo_max int not null,
  activo boolean default true,
  created_at timestamptz default now()
);

-- ── solicitudes ───────────────────────────────────────────────────────────────
create table if not exists public.solicitudes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.usuarios(id) on delete cascade not null,
  plan_id uuid references public.planes(id) not null,
  monto bigint not null,
  plazo int not null,
  cuotas int not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','en_revision','pre_aprobado','pausado','aprobado','rechazado','activo','completado')),
  cbu text,
  banco text,
  documentos text[] default '{}',
  notas_admin text,
  motivo_rechazo text,
  bind_transferencia_id text,
  comprobante_transferencia text,
  pausado_hasta timestamptz,
  pausado_motivo text,
  pre_aprobado_condiciones text,
  historial_estados jsonb,
  signatura_documento_id text,
  contrato_enviado_at timestamptz,
  contrato_firmado boolean default false,
  contrato_firmado_at timestamptz,
  contrato_url text,
  biometria_firmante jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── prestamos ─────────────────────────────────────────────────────────────────
create table if not exists public.prestamos (
  id uuid default uuid_generate_v4() primary key,
  solicitud_id uuid references public.solicitudes(id) not null,
  user_id uuid references public.usuarios(id) on delete cascade not null,
  plan_id uuid references public.planes(id) not null,
  capital_original bigint not null,
  saldo_remanente bigint not null,
  total_abonado bigint default 0,
  cuotas_monto bigint not null,
  cuotas_total int not null,
  cuotas_pagadas int default 0,
  proximo_vencimiento date,
  bind_debin_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── cuotas ────────────────────────────────────────────────────────────────────
create table if not exists public.cuotas (
  id uuid default uuid_generate_v4() primary key,
  prestamo_id uuid references public.prestamos(id) on delete cascade not null,
  user_id uuid references public.usuarios(id) on delete cascade not null,
  numero_cuota int not null,
  monto bigint not null,
  fecha_vencimiento date not null,
  fecha_pago timestamptz,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','pagada','vencida','fallida')),
  bind_operacion_id text,
  bind_estado text,
  reintentos_count int default 0,
  created_at timestamptz default now()
);

-- ── billeteras (ledger financiero — fuente de verdad) ─────────────────────────
create table if not exists public.billeteras (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.usuarios(id) on delete cascade unique not null,
  cvu text unique,
  saldo_disponible bigint default 0,
  saldo_retenido bigint default 0,
  bind_account_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── movimientos ───────────────────────────────────────────────────────────────
create table if not exists public.movimientos (
  id uuid default uuid_generate_v4() primary key,
  billetera_id uuid references public.billeteras(id) on delete cascade not null,
  user_id uuid references public.usuarios(id) on delete cascade not null,
  tipo text not null check (tipo in ('credito','debito','retencion','liberacion')),
  monto bigint not null check (monto > 0),
  concepto text not null,
  referencia_externa text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmado','revertido')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ── WebAuthn credentials ──────────────────────────────────────────────────────
create table if not exists public.webauthn_credentials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.usuarios(id) on delete cascade not null,
  credential_id text unique not null,
  public_key text not null,
  counter bigint default 0,
  device_type text check (device_type in ('platform','cross-platform')),
  backed_up boolean default false,
  transports text[] default '{}',
  created_at timestamptz default now()
);

-- ── WebAuthn challenges (temporales) ─────────────────────────────────────────
create table if not exists public.webauthn_challenges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.usuarios(id) on delete cascade not null,
  challenge text not null,
  tipo text not null check (tipo in ('registro','login')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ── email_logs ────────────────────────────────────────────────────────────────
create table if not exists public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  tipo text not null,
  destinatario text not null,
  asunto text,
  estado text check (estado in ('enviado','fallido')),
  created_at timestamptz default now()
);

-- ── actividad_admin ───────────────────────────────────────────────────────────
create table if not exists public.actividad_admin (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references public.usuarios(id) not null,
  accion text not null,
  entidad_tipo text,
  entidad_id text,
  detalle text,
  created_at timestamptz default now()
);

-- ── emails_baneados ───────────────────────────────────────────────────────────
create table if not exists public.emails_baneados (
  email text primary key,
  motivo text,
  banned_by uuid references public.usuarios(id) on delete set null,
  banned_at timestamptz default now()
);

-- ── otp_codes ─────────────────────────────────────────────────────────────────
create table if not exists public.otp_codes (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  usado boolean default false,
  intentos_fallidos int default 0,
  created_at timestamptz default now()
);

-- ── ziro_config (config IA Ziro) ──────────────────────────────────────────────
create table if not exists public.ziro_config (
  id int primary key default 1,
  prompt_vendedor text,
  prompt_asesor text,
  model text default 'gemini-2.5-flash',
  temperature numeric default 0.7,
  updated_at timestamptz default now(),
  check (id = 1)
);

-- ── signatura_eventos (log webhooks Signatura) ────────────────────────────────
create table if not exists public.signatura_eventos (
  id uuid default gen_random_uuid() primary key,
  received_at timestamptz default now(),
  notification_action text,
  document_id text,
  signature_id text,
  new_status text,
  raw_payload jsonb,
  solicitud_id uuid references public.solicitudes(id) on delete set null,
  procesado boolean default false,
  error_msg text
);

-- ══════════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.usuarios enable row level security;
alter table public.solicitudes enable row level security;
alter table public.prestamos enable row level security;
alter table public.cuotas enable row level security;
alter table public.billeteras enable row level security;
alter table public.movimientos enable row level security;
alter table public.webauthn_credentials enable row level security;
alter table public.webauthn_challenges enable row level security;
alter table public.email_logs enable row level security;
alter table public.actividad_admin enable row level security;
alter table public.emails_baneados enable row level security;
alter table public.otp_codes enable row level security;
alter table public.ziro_config enable row level security;
alter table public.signatura_eventos enable row level security;

create policy usuarios_own      on public.usuarios      for select using (auth.uid() = id);
create policy solicitudes_own   on public.solicitudes   for select using (auth.uid() = user_id);
create policy prestamos_own     on public.prestamos     for select using (auth.uid() = user_id);
create policy cuotas_own        on public.cuotas        for select using (auth.uid() = user_id);
create policy billeteras_own    on public.billeteras    for select using (auth.uid() = user_id);
create policy movimientos_own   on public.movimientos   for select using (auth.uid() = user_id);
create policy webauthn_own      on public.webauthn_credentials for select using (auth.uid() = user_id);
-- Las siguientes tablas solo accesibles desde server (admin client):
create policy deny_all_challenges  on public.webauthn_challenges  using (false);
create policy deny_all_email_logs  on public.email_logs           using (false);
create policy deny_all_actividad   on public.actividad_admin      using (false);
create policy deny_all_baneados    on public.emails_baneados      using (false);
create policy deny_all_otp         on public.otp_codes            using (false);
create policy deny_all_ziro        on public.ziro_config          using (false);
create policy deny_all_signatura   on public.signatura_eventos    using (false);

-- ══════════════════════════════════════════════════════════════════════════════
-- Índices para performance
-- ══════════════════════════════════════════════════════════════════════════════

create index if not exists idx_sol_user        on public.solicitudes(user_id);
create index if not exists idx_sol_estado      on public.solicitudes(estado);
create index if not exists idx_sol_signatura   on public.solicitudes(signatura_documento_id) where signatura_documento_id is not null;
create index if not exists idx_pre_user        on public.prestamos(user_id);
create index if not exists idx_cuo_pre         on public.cuotas(prestamo_id);
create index if not exists idx_cuo_vcto        on public.cuotas(fecha_vencimiento) where estado = 'pendiente';
create index if not exists idx_mov_bill        on public.movimientos(billetera_id);
create index if not exists idx_wa_user         on public.webauthn_credentials(user_id);
create index if not exists idx_sig_ev_doc      on public.signatura_eventos(document_id);
create index if not exists idx_sig_ev_sol      on public.signatura_eventos(solicitud_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Trigger: auto-crear usuario + billetera al registrarse
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as
$$
begin
  insert into public.usuarios (id, email, nombre)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  insert into public.billeteras (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════════
-- Función: limpiar challenges WebAuthn expirados
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.cleanup_expired_challenges()
returns void language plpgsql security definer as
$$
begin
  delete from public.webauthn_challenges where expires_at < now();
end;
$$;
