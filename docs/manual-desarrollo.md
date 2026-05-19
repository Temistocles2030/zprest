# Manual de Desarrollo — Zprest V2

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Stack:** Next.js 15 · React 19 · TypeScript 5 · Supabase · Tailwind CSS 4

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Base de datos — Supabase](#4-base-de-datos--supabase)
5. [Autenticación y roles](#5-autenticación-y-roles)
6. [Portal del cliente](#6-portal-del-cliente)
7. [Formularios de solicitud](#7-formularios-de-solicitud)
8. [Panel de administración](#8-panel-de-administración)
9. [API Routes](#9-api-routes)
10. [Integraciones externas](#10-integraciones-externas)
11. [Sistema de contratos PDF](#11-sistema-de-contratos-pdf)
12. [Chatbot Ziro — IA](#12-chatbot-ziro--ia)
13. [Emails transaccionales](#13-emails-transaccionales)
14. [SMS Masivos](#14-sms-masivos)
15. [Seguridad](#15-seguridad)
16. [Deploy y CI/CD](#16-deploy-y-cicd)

---

## 1. Arquitectura general

Zprest es una plataforma fintech argentina de créditos multi-producto. El sistema tiene tres actores principales:

- **Cliente:** se registra, solicita crédito, firma contrato electrónico y gestiona su deuda
- **Administrador:** revisa solicitudes, aprueba/rechaza, registra cobros, gestiona clientes
- **Sistemas externos:** Signatura (firma electrónica), BindX (pagos), BCRA, AFIP, Resend (email), SMSMasivos

```
Cliente
  ↓ Google OAuth
Supabase Auth
  ↓ trigger handle_new_user
public.usuarios
  ↓
Portal /dashboard + /solicitar
  ↓
API Routes (Next.js serverless)
  ↓
Supabase PostgreSQL (fuente de verdad)
  ↓
Signatura / BindX / BCRA / AFIP
```

### Separación cliente/servidor

- **Browser:** `src/lib/supabase/client.ts` — usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, sujeto a RLS
- **Server (API routes):** `src/lib/supabase/server.ts` — usa `SUPABASE_SERVICE_ROLE_KEY`, bypasea RLS
- **Regla:** `lib/bind/*`, `lib/signatura/*`, `lib/supabase/server.ts` **nunca** se importan desde componentes cliente

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 15 |
| UI | React | 19 |
| Lenguaje | TypeScript strict | 5 |
| Estilos | Tailwind CSS | 4 |
| Fuente | Sora (Google Fonts) | — |
| Auth | Supabase Auth + Google OAuth | — |
| Base de datos | Supabase PostgreSQL | — |
| Storage | Supabase Storage | — |
| Firma electrónica | Signatura API | — |
| Pagos/Cobros | BindX API (OBP) | — |
| IA | Gemini 2.5 Flash (`@google/generative-ai`) | — |
| Email | Resend | — |
| SMS | SMSMasivos | — |
| PDF | PDFKit (`pdfkit`) | — |
| Consulta crediticia | BCRA API pública | — |
| Padrón fiscal | AFIP ws_sr_padron_a13 | — |
| Hosting | Vercel (Pro, Static IPs) | — |

---

## 3. Variables de entorno

El archivo `.env.local` se usa en desarrollo. Las variables de producción están en Vercel → Settings → Environment Variables.

```bash
# Modo
NEXT_PUBLIC_MOCK_MODE=false

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ngisdicmwbknwlkxtkka.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # SOLO server-side

# WebAuthn / OTP
WEBAUTHN_RP_NAME=Zprest
WEBAUTHN_RP_ID=zprest.com.ar
WEBAUTHN_ORIGIN=https://zprest.com.ar
BIOMETRIC_JWT_SECRET=<openssl rand -hex 64>    # firma OTP SMS y email

# IA
GOOGLE_GENERATIVE_AI_API_KEY=<gemini-key>

# Email
RESEND_API_KEY=<resend-key>
RESEND_FROM_EMAIL=noreply@zprest.com.ar

# SMS
SMSMASIVOS_API_KEY=<key>

# BindX
BINDX_BASE_URL=https://api-pre.bind.com.ar/v1
BINDX_USERNAME=<usuario>
BINDX_PASSWORD=<password>
BINDX_ACCOUNT_ID=<account-id>
BINDX_WEBHOOK_SECRET=<hmac-secret>
BINDX_CERT_BASE64=<base64 del cert .crt>
BINDX_KEY_BASE64=<base64 de la key .pem>

# Signatura
SIGNATURA_API_URL=https://api.signatura.legal
SIGNATURA_API_KEY=<api-key>
SIGNATURA_WEBHOOK_SECRET=<hex-secret>          # decodificar como hex bytes para HMAC

# AFIP
AFIP_CERT_BASE64=<base64 cert>
AFIP_KEY_BASE64=<base64 key>
AFIP_CUIT=<cuit-empresa>

# App
NEXT_PUBLIC_APP_URL=https://zprest.com.ar
CRON_SECRET=<openssl rand -hex 32>
```

---

## 4. Base de datos — Supabase

### Esquema principal

```
public.usuarios          → usuarios registrados (id = auth.users.id)
public.planes            → productos de crédito (TEM/TED, montos, plazos)
public.solicitudes       → solicitudes de crédito
public.prestamos         → préstamos aprobados y activos
public.cuotas            → cuotas individuales de cada préstamo
public.billeteras        → CVU/CBU por cliente (ledger)
public.movimientos       → débitos y créditos del ledger
public.actividad_admin   → log de auditoría de acciones admin
public.signatura_eventos → webhooks recibidos de Signatura
public.emails_baneados   → emails con acceso bloqueado
public.otp_codes         → OTPs de verificación (email/SMS)
public.ziro_config       → configuración del chatbot Ziro (id=1)
public.webauthn_credentials → credenciales passkey por usuario
public.webauthn_challenges  → challenges temporales WebAuthn (TTL 5min)
public.email_logs        → registro de emails enviados
public.arrepentimientos  → solicitudes de retractación (Art. 34 Ley 24.240)
```

### Columnas clave en `solicitudes`

```sql
id, user_id, plan_id, monto, plazo, estado
cbu, banco
documentos[]                    -- URLs de archivos en Storage
signatura_documento_id          -- ID del contrato en Signatura
contrato_enviado_at
contrato_firmado (boolean)
signatura_firmante_*            -- datos biométricos del firmante
comprobante_transferencia       -- URL comprobante de acreditación manual
historial_estados (jsonb)       -- array de cambios de estado con fecha y motivo
pausado_hasta, pausado_motivo
pre_aprobado_condiciones
```

### Columnas clave en `usuarios`

```sql
id, email, nombre, apellido, dni, cuil, role
tipo_cliente                    -- 'personal' | 'pyme'
tipo_interes                    -- 'personal' | 'pyme' (declarado en registro)
estado_registro                 -- 'pendiente_aprobacion' | 'aprobado'
estado                          -- 'activo' | 'inactivo' | 'bloqueado' | 'eliminado'
bcra_situacion, bcra_advertencia
afip_activo, afip_actividad
telefono, telefono_verificado
nombre_comercio                 -- para clientes pyme
empleador                       -- para clientes personal
domicilio (jsonb)               -- { calle, altura, piso, depto, localidad, provincia, cp }
tasa_preferencial (boolean)
plan_preferencial_id
```

### Trigger de registro

Al crearse un usuario en `auth.users`, el trigger `handle_new_user` inserta automáticamente una fila en `public.usuarios` con los datos del perfil de Google.

Si el trigger tarda más que el código que sigue al registro, usar `upsert` con `onConflict: "id"` en lugar de `update` para evitar race conditions.

### Row Level Security (RLS)

RLS habilitado en todas las tablas. Las API routes del admin usan `createAdminClient()` con `SUPABASE_SERVICE_ROLE_KEY` para bypasear RLS. Las operaciones del cliente usan el cliente anónimo sujeto a políticas.

---

## 5. Autenticación y roles

### Flujo de autenticación (producción)

```
/login → supabase.auth.signInWithOAuth({ provider: 'google' })
       → Google OAuth
       → /auth/callback?code=...
       → supabase.auth.exchangeCodeForSession(code)
       → redirect /dashboard
```

El archivo `src/app/auth/callback/route.ts` maneja el intercambio de código. No agregar lógica extra aquí.

### Protección de rutas

`src/middleware.ts` refresca la sesión de Supabase en cada request para rutas `/(portal)` y `/admin`.

- `AuthGuard` — redirige a `/login` si no hay sesión
- `AdminGuard` — redirige a `/login` si no hay sesión, o a `/dashboard` si `role !== 'admin'`

### Roles

Los roles se leen siempre de `public.usuarios.role`. Nunca se hardcodean.

- `role: 'user'` — se asigna automáticamente por el trigger al registrarse
- `role: 'admin'` — se asigna manualmente vía SQL:

```sql
UPDATE public.usuarios SET role = 'admin' WHERE email = 'admin@zprest.com.ar';
```

### Flujo de registro de cliente

1. Google OAuth → perfil creado
2. Completar datos: nombre, apellido, DNI, CUIL, teléfono, tipo de interés
3. Verificación OTP por email (HMAC-SHA256, 10 min TTL, sin DB)
4. `estado_registro = 'pendiente_aprobacion'` → `/espera`
5. Admin clasifica al cliente → `estado_registro = 'aprobado'`
6. Cliente puede ingresar al portal

### OTP (verificación de identidad)

Los OTPs se generan como HMAC-SHA256 firmados con `BIOMETRIC_JWT_SECRET`. El token contiene `{ userId, phone/email, code, exp }`. No se almacena en base de datos. El cliente guarda el token en `sessionStorage` y lo reenvía en el confirm.

API: `POST /api/verify/phone` con `{ action: "send"|"confirm", channel: "email"|"sms" }`

---

## 6. Portal del cliente

### Estructura

```
/dashboard          → resumen de deuda y próximo vencimiento
/mis-prestamos      → listado de créditos con timeline de cuotas
/mis-datos          → perfil editable
/solicitar          → router → /solicitar/personal o /solicitar/pyme
```

### Hooks principales

| Hook | Archivo | Función |
|------|---------|---------|
| `useAuth` | `src/hooks/useAuth.ts` | Estado de autenticación, datos del usuario |
| `useDeuda` | `src/hooks/useDeuda.ts` | Préstamos y cuotas del usuario |
| `useBilletera` | `src/hooks/useBilletera.ts` | Saldo y movimientos |
| `useLoanCalculator` | `src/hooks/useLoanCalculator.ts` | Calculadora de cuotas |

### IdleGuard

`src/components/auth/IdleGuard.tsx` cierra la sesión automáticamente por inactividad. Monitorea eventos de mouse, teclado y touch.

---

## 7. Formularios de solicitud

### Dos formularios independientes

| Formulario | Ruta | Color | Montos | Plazo |
|-----------|------|-------|--------|-------|
| Personal | `/solicitar/personal` | Azul | $1M–$7M | 3-18 cuotas mensuales |
| Pyme | `/solicitar/pyme` | Amarillo | $1M–$15M | 30-120 días |

### Pasos del formulario Personal

1. **Plan** — Selección de monto y plazo con calculadora en vivo
2. **Datos** — CUIL, teléfono, profesion, empleador (auto-calculado CUIL desde DNI)
3. **Info comercio/empleo** — Empleador (editable), CBU bancario (22 dígitos exactos)
4. **Documentos** — DNI frente/dorso, recibo de sueldo (upload inmediato a Supabase Storage)
5. **Verificación** — OTP por SMS vía SMSMasivos
6. **Confirmar** — Resumen y envío

### Pasos del formulario Pyme

1. **Plan** — Selección de monto y plazo en días con cuota diaria calculada
2. **Datos** — CUIL, teléfono, nombre comercio
3. **Info comercio** — Nombre comercio y domicilio completo (editables)
4. **CBU** — CBU o CVU (billeteras virtuales aceptadas para Pyme)
5. **Documentos** — DNI, Constancia AFIP, Licencia Comercial, Comprobante ingresos
6. **Verificación** — OTP por SMS
7. **Confirmar** — Resumen y envío

### Upload de documentos

`POST /api/documentos/upload` — multipart/form-data  
- Sube a Supabase Storage bucket `documentos`
- Path: `{user_id}/{timestamp}-{label}.ext`
- Tipos aceptados: PDF, Word, JPG, PNG, WEBP, HEIC, HEIF
- Tamaño máximo: 10MB
- Devuelve URL firmada con 1 año de vigencia

### Cálculo de CUIL desde DNI

`calcularCUIL(dni, prefijo)` implementado en tres formularios. El prefijo puede ser 20 (M), 27 (F) o 30 (Empresa). Usa el algoritmo módulo 11 estándar. El campo CUIL se auto-completa al escribir el DNI pero sigue siendo editable.

---

## 8. Panel de administración

### Protección

`AdminGuard` verifica `role === 'admin'` leyendo desde `public.usuarios`. Si el role no es admin, redirige al portal.

### Patrón de datos en páginas admin

Las páginas admin **nunca** usan el cliente Supabase del browser directamente (fallaría por RLS). Usan API routes con `Authorization: Bearer <session-token>`:

```typescript
// En la página (cliente):
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch('/api/admin/solicitudes', {
  headers: { Authorization: `Bearer ${session?.access_token}` }
});

// En la API route (servidor):
async function getAdmin(request: NextRequest) {
  const supabase = createAdminClient();
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  const { data: me } = await supabase.from("usuarios")
    .select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return null;
  return { supabase, adminId: user.id };
}
```

---

## 9. API Routes

### Estructura

```
src/app/api/
├── auth/
│   ├── register/          POST — crear usuario con Google auth
│   ├── perfil/            GET|PATCH — datos del usuario autenticado
│   └── check-bcra/        GET — consulta BCRA antes de enviar OTP
├── verify/phone/          POST — enviar/confirmar OTP (email o SMS)
├── solicitudes/
│   ├── route.ts           GET lista | POST crear
│   └── [id]/
│       ├── aprobar/       POST — aprobar con comprobante
│       └── rechazar/      POST — rechazar con motivo
├── documentos/upload/     POST — subir archivo a Supabase Storage
├── planes/simulador/      GET — planes activos para el simulador público
├── admin/
│   ├── solicitudes/[id]/  GET|PATCH — detalle y cambio de estado
│   │   ├── pre-aprobar/   POST
│   │   ├── pausar/        POST
│   │   ├── enviar-contrato/ POST — generar PDF + enviar a Signatura
│   │   └── confirmar-aprobacion/ POST
│   ├── clientes/
│   │   ├── route.ts       GET lista de clientes
│   │   └── [id]/
│   │       ├── estado/    PATCH — cambiar estado del usuario
│   │       ├── mensaje/   POST — enviar email al cliente
│   │       ├── tasa-preferencial/ PATCH
│   │       └── eliminar/  DELETE — hard delete de todas las tablas
│   ├── prestamos/         GET lista
│   ├── cobros/            GET|POST — lista y registro de pagos manuales
│   ├── planes/            GET|POST|PATCH|DELETE — CRUD planes
│   ├── signatura/         GET — lista documentos + eventos
│   ├── arrepentimientos/  GET|PATCH
│   ├── sms/               POST — envío masivo
│   ├── sms-generar/       POST — generar SMS con Gemini
│   ├── bind/
│   │   ├── setup/         GET — obtener account_id
│   │   ├── estado/        GET — saldo y vars configuradas
│   │   ├── movimientos/   GET
│   │   ├── debins/[id]/   POST — cancelar o reintentar
│   │   └── transferencias/ GET|POST
│   ├── ziro/              GET|PATCH — config del chatbot
│   ├── bcra/              wrapper de consultas BCRA
│   └── afip/padron/[cuit]/ GET — padrón AFIP
├── webhooks/
│   ├── bind/              POST — eventos BindX (HMAC SHA-256)
│   └── signatura/         POST — eventos Signatura (HMAC hex)
├── chat/                  POST — streaming Gemini (Ziro)
├── bcra/deudas/[id]/      GET — deudas por CUIL/DNI
└── cron/cobros/           GET — cobro automático diario (CRON_SECRET)
```

### Convención de respuestas

Todas las API routes devuelven JSON:
- Éxito: `{ ok: true, data: ... }` o `{ ok: true, field: value }`
- Error: `{ error: "mensaje" }` con el HTTP status correspondiente

---

## 10. Integraciones externas

### 10.1 Signatura — Firma electrónica

**Archivo:** `src/lib/signatura/client.ts`

Signatura es la plataforma de firma electrónica con validación biométrica.

#### Flujo de firma

```
Admin → POST /api/admin/solicitudes/[id]/enviar-contrato
  ↓
generarContratoPDF() → Buffer base64
  ↓
crearDocumento(titulo, pdfBase64, email, nombre, dni)
  ↓
Signatura envía email al cliente con link de firma
  ↓
Cliente firma con biometría (foto DNI + selfie)
  ↓
Webhook POST /api/webhooks/signatura
  ↓
UPDATE solicitudes SET contrato_firmado = true, signatura_firmante_* = ...
```

#### Verificación del webhook

El webhook de Signatura usa HMAC-SHA256. **Importante:** el secreto debe decodificarse como bytes hexadecimales, no como texto UTF-8:

```typescript
const key = Buffer.from(SIGNATURA_WEBHOOK_SECRET, "hex");
const expected = crypto.createHmac("sha256", key).update(rawBody).digest("hex");
```

El `rawBody` se obtiene leyendo el stream del request antes de parsear JSON:
```typescript
const rawBody = Buffer.from(await request.arrayBuffer()).toString("utf8");
```

#### Eventos del webhook

| Evento | Acción |
|--------|--------|
| `document.completed` | contrato_firmado = true, guardar datos biométricos |
| `document.cancelled` | registrar en signatura_eventos |
| `document.signer_signed` | registrar en signatura_eventos |

**Importante en Vercel serverless:** todas las escrituras a Supabase dentro del webhook deben ser `await`. Las promesas `void` se cancelan cuando la función retorna.

### 10.2 BindX — Pagos y cobros

**Archivos:** `src/lib/bind/`

BindX es la plataforma bancaria para transferencias y cobros DEBIN.

#### Autenticación

JWT: `POST /login/jwt` con `{ username, password }`. Token cacheado en memoria, se refresca 5 min antes de expirar.

#### mTLS

Cada request incluye el certificado Certisur. El cliente usa `BINDX_CERT_BASE64` + `BINDX_KEY_BASE64` (cert hoja sin CA chain):

```typescript
const agent = new https.Agent({
  cert: Buffer.from(process.env.BINDX_CERT_BASE64!, "base64").toString(),
  key:  Buffer.from(process.env.BINDX_KEY_BASE64!,  "base64").toString(),
});
```

#### Funciones principales

| Función | Archivo | Descripción |
|---------|---------|-------------|
| `acreditarPrestamo()` | `transferencias.ts` | Transferencia saliente al CBU del cliente |
| `crearDebinSpot()` | `debin.ts` | Débito único del CBU del cliente |
| `asignarCVU()` | `cvu.ts` | Asigna CVU único al cliente para pagos voluntarios |

#### Webhook BindX

`POST /api/webhooks/bind` — verifica HMAC SHA-256 en tiempo constante.

Eventos procesados:
- `debin.acredited` → cuota pagada
- `debin.rejected` → cuota fallida + email al cliente
- `transfer.cvu.received` → pago voluntario, aplicar a cuota pendiente

### 10.3 BCRA

**Archivo:** `src/lib/bcra/client.ts`

API pública del BCRA, sin credenciales. Usa `https.Agent` con `rejectUnauthorized: false` por el certificado autofirmado del BCRA.

Funciones: `getDeudas()`, `getDeudasHistoricas()`, `getChequesRechazados()`, `getWorstSituacion()`

La consulta se realiza automáticamente al registrarse (para bloquear situación >= 3) y está disponible manualmente en `/admin/bcra`.

### 10.4 AFIP — Padrón de contribuyentes

**Archivos:** `src/lib/afip/`

Consulta al webservice `ws_sr_padron_a13` de AFIP. Requiere certificado digital propio.

- `wsaa.ts` — autenticación WSAA con PKCS#7 vía `node-forge`. El ticket se cachea ~12 horas
- `padron.ts` — consulta el padrón y retorna datos del contribuyente

### 10.5 Resend — Email transaccional

**Archivo:** referenciado en múltiples API routes

Emails enviados:
- Solicitud aprobada / rechazada / pre-aprobada / pausada
- Contrato disponible para firma
- Cuota próxima a vencer
- Cuota fallida
- Mensaje del admin al cliente

Todos los emails usan `RESEND_FROM_EMAIL=noreply@zprest.com.ar`.

### 10.6 SMSMasivos

Proveedor de SMS para Argentina. Se usa para:
- OTP de verificación de teléfono en formularios de solicitud
- Envíos masivos desde `/admin/sms`

---

## 11. Sistema de contratos PDF

**Archivo:** `src/lib/signatura/generarContratoPDF.ts`

Los contratos se generan con **PDFKit** en memoria (sin archivos temporales) y se retornan como base64 para enviar a Signatura.

### Contrato Personal

Función: `generarContratoPersonalPDF(params)`

Incluye:
- Encabezado con logo Zprest
- Datos del tomador: nombre, DNI, CUIL, domicilio, profesión
- Condiciones del crédito: monto, cuotas, TEM, primera cuota con IVA
- Fecha de primera cuota: **primer día del mes siguiente** a la aprobación
- Cláusulas contractuales numeradas

#### Cálculo de cuota personal (Sistema Francés + IVA)

```typescript
const r = tem / 100;
const cuotaBase = monto * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
const ivaIntereses = monto * r * 0.21;
const primeraCuota = Math.round(cuotaBase + ivaIntereses);
```

### Contrato Comercial

Función: `generarContratoComercialPDF(params)`

Incluye:
- Datos del tomador y del comercio
- Condiciones: monto, plazo en días, TED, cuota diaria
- Fecha de primera cuota: **mañana** (hoy + 1 día)
- **Tabla de amortización** con manejo de salto de página

#### Tabla de amortización comercial

Columnas: N°, Fecha, Capital, Interés c/IVA, Total Cuota, Saldo Restante

```typescript
// Cada fila:
const capitalDiario = Math.round(monto / n);
const interesDiario = cuotaDiaria - capitalDiario;
// La última fila absorbe diferencias de redondeo
```

La tabla se pagina automáticamente: cuando el cursor Y supera el límite de la página se inserta una nueva y se re-dibuja el encabezado de tabla.

---

## 12. Chatbot Ziro — IA

**Archivos:** `src/app/api/chat/route.ts`, `src/components/landing/ZiroChat.tsx`

### SDK y modelo

Usa `@google/generative-ai` directamente (no ai-sdk). Modelo configurable desde `/admin/ziro`, por defecto `gemini-2.5-flash`.

### Streaming

```typescript
const result = await chat.sendMessageStream(userMessage);
// Se devuelve como ReadableStream
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of result.stream) {
      controller.enqueue(encoder.encode(chunk.text()));
    }
    controller.close();
  }
});
```

El cliente lee los chunks con `response.body.getReader()` y los muestra en tiempo real.

### Dos modos

**Vendedor** (landing):
- Prompt configurado en `ziro_config.prompt_vendedor`
- Sin contexto de usuario
- Objetivo: explicar planes y guiar a solicitar

**Asesor** (portal):
- Prompt configurado en `ziro_config.prompt_asesor`
- Recibe `loanContext` con datos reales del préstamo del usuario
- Objetivo: responder preguntas sobre saldo, cuotas y vencimientos

### Configuración

La tabla `ziro_config` tiene una sola fila (`id = 1`) con: `prompt_vendedor`, `prompt_asesor`, `model`, `temperature`, `updated_at`. Se lee y escribe vía `GET|PATCH /api/admin/ziro`.

---

## 13. Emails transaccionales

Se usan templates HTML inline en cada API route que necesita enviar email. El patrón es:

```typescript
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL!,
  to: usuario.email,
  subject: "Asunto del email",
  html: `<html>...</html>`,
});
```

Los logs de envío se registran en `public.email_logs`.

---

## 14. SMS Masivos

**API route:** `src/app/api/admin/sms/route.ts`

El endpoint itera sobre los destinatarios y llama a la API de SMSMasivos por cada uno. Los resultados se devuelven en tiempo real al frontend.

Para OTP vía SMS, se genera un código de 6 dígitos, se firma con HMAC y se envía por SMS. El token resultante se guarda en el cliente (sessionStorage) para verificarlo luego.

---

## 15. Seguridad

### Archivos críticos — no modificar sin análisis

| Archivo | Riesgo |
|---------|--------|
| `src/lib/bind/client.ts` | Credenciales BindX + mTLS |
| `src/lib/supabase/server.ts` | SERVICE_ROLE_KEY bypasea RLS |
| `src/app/api/solicitudes/[id]/aprobar/route.ts` | Transferencia atómica con rollback |
| `src/app/api/webhooks/bind/route.ts` | HMAC en tiempo constante |
| `src/app/api/webhooks/signatura/route.ts` | HMAC hex — no cambiar encoding |
| `src/app/api/cron/cobros/route.ts` | CRON_SECRET obligatorio |
| `src/middleware.ts` | Protección de rutas |
| `src/components/auth/AuthGuard.tsx` | Acceso al portal |
| `src/components/auth/AdminGuard.tsx` | Acceso al admin |

### Patrones de seguridad implementados

- **HMAC en tiempo constante:** `crypto.timingSafeEqual()` para comparar firmas de webhooks
- **Bearer token en API admin:** todas las routes admin verifican el token JWT de Supabase y el role
- **RLS en Supabase:** todas las tablas con políticas. Admin bypasea con SERVICE_ROLE_KEY solo server-side
- **OTP sin DB:** HMAC firmado con expiración incluida en el payload. No requiere tabla
- **Emails baneados:** tabla `emails_baneados` verificada en login y registro
- **Estado de usuario:** `estado = 'bloqueado'|'eliminado'` verificado en `useAuth` → signOut automático
- **mTLS en BindX:** certificado Certisur adjunto en cada request
- **CRON_SECRET:** el endpoint de cobros automáticos rechaza requests sin el header correcto

---

## 16. Deploy y CI/CD

### Repositorio

```
GitHub: Temistocles2030/zprest
Branch principal: master
```

### Vercel

- **Team:** ZPREST (Pro)
- **Proyecto:** zprestamos
- **Dominio:** zprest.com.ar
- **Auto-deploy:** cada push a `master` dispara un deploy de producción

### Cron job

`vercel.json` configura el cron diario:
```json
{
  "crons": [{
    "path": "/api/cron/cobros",
    "schedule": "0 8 * * *"
  }]
}
```

Se ejecuta a las 8:00 AM UTC. El endpoint requiere `Authorization: Bearer <CRON_SECRET>`.

### Static IPs de Vercel

El plan Pro de Vercel asigna IPs estáticas a los serverless functions. Esto es necesario para:
- BindX (whitelist de IPs en el proxy)
- SMSMasivos (whitelist de IPs)

IPs actuales: `18.230.156.90` y `18.229.209.238`

### Headers de seguridad

Configurados en `vercel.json`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Calculadora financiera

**Archivo:** `src/lib/loan-calculator.ts`

### Plan Personal — Sistema francés con IVA

```typescript
function calcularCuotaPersonal(monto: number, tem: number, cuotas: number): number {
  const r = tem / 100;
  const cuotaBase = monto * r * Math.pow(1 + r, cuotas) / (Math.pow(1 + r, cuotas) - 1);
  const ivaIntereses = monto * r * 0.21; // IVA 21% sobre interés del primer mes
  return Math.round(cuotaBase + ivaIntereses);
}
```

La cuota mostrada es la del **primer mes** (es la más alta; decrece a medida que el capital amortizado aumenta).

### Plan Comercial — Cuota diaria

```typescript
function calcularCuotaDiariaComercial(monto: number, ted: number, dias: number): number {
  return Math.round(
    monto / dias +
    monto * (ted / 100) +
    monto * (ted / 100) * 0.21
  );
}
```

---

*Manual de desarrollo Zprest V2 — versión 1.0 — Mayo 2026*
