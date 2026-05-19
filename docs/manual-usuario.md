# Manual de Usuario — Panel Administrador Zprest

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Plataforma:** zprest.com.ar/admin

---

## Índice

1. [Acceso al Panel](#1-acceso-al-panel)
2. [Inicio — Dashboard](#2-inicio--dashboard)
3. [Solicitudes de Crédito](#3-solicitudes-de-crédito)
4. [Clientes](#4-clientes)
5. [Préstamos](#5-préstamos)
6. [Cobros](#6-cobros)
7. [Planes](#7-planes)
8. [Signatura — Contratos Digitales](#8-signatura--contratos-digitales)
9. [BCRA — Central de Deudores](#9-bcra--central-de-deudores)
10. [AFIP — Padrón de Contribuyentes](#10-afip--padrón-de-contribuyentes)
11. [SMS Masivos](#11-sms-masivos)
12. [BindX — Cuenta y Pagos](#12-bindx--cuenta-y-pagos)
13. [Actividad](#13-actividad)
14. [Arrepentimientos](#14-arrepentimientos)
15. [Configuración de Ziro IA](#15-configuración-de-ziro-ia)

---

## 1. Acceso al Panel

El panel de administración está disponible en:

```
https://zprest.com.ar/admin
```

### Cómo ingresar

1. Ingresá a `zprest.com.ar`
2. Hacé click en **"Continuar con Google"**
3. Seleccioná tu cuenta de administrador (debe estar habilitada en el sistema)
4. El sistema te redirigirá automáticamente a `/admin`

> **Importante:** Solo los usuarios con rol `admin` pueden acceder al panel. Si tu cuenta no tiene ese rol, serás redirigido al portal de clientes.

### Cierre de sesión por inactividad

El sistema cierra la sesión automáticamente si no hay actividad durante un período prolongado. Guardá tu trabajo antes de ausentarte.

---

## 2. Inicio — Dashboard

Al ingresar al panel verás el **Dashboard principal** con accesos rápidos a las secciones más usadas:

| Acceso rápido | Descripción |
|---------------|-------------|
| Solicitudes pendientes | Ver y gestionar nuevas solicitudes de crédito |
| Préstamos activos | Créditos en curso |
| Planes | Configurar productos de crédito |
| Cobros | Estado de cuotas y pagos |
| BindX | Saldo y movimientos de la cuenta |

La barra de navegación lateral izquierda está siempre visible y permite acceder a cualquier sección del panel.

---

## 3. Solicitudes de Crédito

**Ruta:** `/admin/solicitudes`

Esta sección centraliza todas las solicitudes de crédito enviadas por los clientes.

### 3.1 Lista de solicitudes

La pantalla principal muestra una tabla con todas las solicitudes. Podés filtrar por estado usando las pestañas superiores:

| Pestaña | Qué muestra |
|---------|-------------|
| Todas | Todas las solicitudes sin filtro |
| Pendientes | Solicitudes nuevas sin revisar |
| En revisión | Solicitudes que están siendo analizadas |
| Pre-aprobadas | Aprobadas con condiciones pendientes |
| Pausadas | Temporalmente suspendidas |
| Aprobadas | Solicitudes aprobadas |
| Rechazadas | Solicitudes rechazadas |

Cada fila muestra: **Cliente, Plan, Monto, Cuotas/Días, Estado y Fecha**. El número de solicitudes pendientes aparece en el encabezado.

Hacé click en **"Ver"** para acceder al detalle de cualquier solicitud.

---

### 3.2 Detalle de solicitud

Al abrir una solicitud, encontrás toda la información organizada en bloques:

#### Información del cliente

- Nombre completo, Email, DNI, CUIL/CUIT
- Teléfono de contacto
- Comercio (si es cliente Pyme) o Empleador (si es cliente Personal)
- Domicilio

#### Detalles del crédito

- Plan solicitado y tipo (Personal / Pyme)
- Monto, plazo y cuotas
- Tasa aplicable (TEM para Personal, TED para Pyme)
- CBU de destino para la acreditación

#### Documentos adjuntos

Lista de archivos subidos por el cliente (DNI, recibos, constancias). Podés descargar cada uno haciendo click.

#### Contrato digital (Signatura)

Una vez enviado el contrato al cliente verás:

- **Estado de firma:** Pendiente / Firmado / Rechazado
- **Fecha de envío y firma**
- **Datos biométricos del firmante:** fotos del DNI (frente y dorso) y selfie capturadas durante el proceso de firma

#### Historial de estados

Registro cronológico de todos los cambios de estado de la solicitud, con fecha, admin responsable y motivo.

---

### 3.3 Acciones sobre una solicitud

Las acciones disponibles dependen del estado actual:

#### Marcar como "En revisión"
Indica que el administrador comenzó el análisis. Útil para coordinar entre varios admins.

#### Pre-aprobar
Aprueba la solicitud con condiciones (ej. "pendiente de documentación adicional"). El cliente recibe un email informando las condiciones.

#### Pausar
Suspende temporalmente el proceso. Se puede indicar un motivo y una fecha de vencimiento de la pausa. El cliente recibe email de notificación.

#### Enviar contrato
Genera el contrato PDF (personal o comercial según el plan) y lo envía al cliente vía **Signatura** para firma electrónica. El cliente recibe un email con el link para firmar desde su celular o computadora.

#### Aprobar
Aprueba la solicitud definitivamente. Si el cliente ya firmó el contrato, se habilita el botón **"Confirmar aprobación"**.

#### Rechazar
Rechaza la solicitud. Es obligatorio indicar el motivo, que se envía al cliente por email.

#### Eliminar
Elimina la solicitud del sistema (acción irreversible).

---

## 4. Clientes

**Ruta:** `/admin/clientes`

Gestión completa de todos los usuarios registrados en la plataforma.

### 4.1 Filtros y búsqueda

**Por estado:**
- 🟢 Activos
- 🟡 Inactivos
- 🔴 Bloqueados
- ⚫ Eliminados

**Por tipo de cliente:**
- ⏳ Sin calificar (no clasificados aún)
- 👤 Personal
- 🏢 Pyme

**Búsqueda libre:** por nombre, email, DNI o CUIL.

### 4.2 Tabla de clientes

La tabla muestra información detallada de cada cliente con scroll horizontal:

- Nombre y email
- DNI / CUIL-CUIT
- Teléfono (con link directo a WhatsApp) e indicador de verificación
- Tipo de cliente y tipo de interés
- Nombre del comercio (Pyme) o empleador (Personal)
- Situación BCRA (S0-S5 con color indicador)
- Estado AFIP (Activo/Inactivo y actividad)
- Domicilio completo
- Cantidad de solicitudes y préstamos activos
- Estado y fecha de alta

### 4.3 Selección múltiple

Podés seleccionar varios clientes marcando el checkbox de cada fila (o el del encabezado para seleccionar todos). Con clientes seleccionados aparece una barra de acciones con la opción **"Eliminar definitivamente"** de forma masiva.

### 4.4 Exportar

El botón **"Exportar"** descarga un archivo CSV/Excel con todos los datos de los clientes visibles según los filtros activos.

### 4.5 Acciones por cliente

Cada fila tiene dos controles:

**Botón 🗑** — Abre el modal de eliminación directa.

**Menú ⋯** — Despliega las siguientes opciones:

| Acción | Descripción |
|--------|-------------|
| 🏷️ Clasificar cliente | Define si el cliente es Personal o Pyme |
| ⭐ Tasa preferencial | Asigna un plan con tasa especial al cliente |
| ✅ Activar | Reactiva un cliente inactivo o bloqueado |
| 🔕 Desactivar | Desactiva sin bloquear |
| ✉️ Enviar mensaje | Envía un email personalizado al cliente |
| 🔒 Bloquear | Bloquea el acceso (requiere motivo) |
| ⏸️ Bloquear hasta... | Bloqueo temporal hasta una fecha específica |
| 🗑️ Ocultar | Soft delete (el cliente no puede ingresar) |
| 💀 Eliminar definitivamente | Elimina todos los datos del cliente (irreversible) |

> **Nota sobre eliminación definitiva:** Se elimina al usuario de todas las tablas del sistema. Esta acción no se puede deshacer. El sistema pedirá escribir "ELIMINAR" para confirmar.

---

## 5. Préstamos

**Ruta:** `/admin/prestamos`

Vista del portafolio completo de créditos.

### 5.1 Estadísticas

En la parte superior se muestran tres métricas totales:
- **Capital total:** Suma de todos los montos otorgados
- **Remanente total:** Saldo pendiente de cobro
- **Cobrado total:** Total ya percibido

### 5.2 Pestaña: Activos

Tabla de todos los préstamos vigentes con:
- Cliente, monto de capital
- Cuotas pagadas vs. totales
- Saldo remanente
- Próximo vencimiento
- Estado (verde: al día / naranja: cuota vencida / gris: completado)

**Acciones:**
- **"Ver solicitud"** → Abre el detalle de la solicitud original
- **🗑 Eliminar** → Soft delete con motivo (el cliente recibe email)

### 5.3 Pestaña: Papelera

Préstamos eliminados (soft delete). Desde acá podés:
- **Restaurar** → Vuelve el préstamo al estado activo
- **Eliminar definitivamente** → Borra el préstamo y todas sus cuotas permanentemente (requiere escribir "ELIMINAR")

---

## 6. Cobros

**Ruta:** `/admin/cobros`

Sistema de registro y seguimiento de pagos.

### 6.1 Estadísticas

Cards con resumen en tiempo real:
- Monto total pendiente
- Cuotas vencidas
- DEBINs fallidos
- Préstamos con deuda

### 6.2 Pestaña: Cobros pendientes

Lista agrupada por cliente/préstamo mostrando:
- Capital prestado y saldo remanente
- Cuotas pagadas vs. totales
- Monto pendiente
- Badge **"Vencida"** si hay cuotas atrasadas

#### Registrar un pago manual

1. Hacé click en **"Registrar pago"** en el préstamo correspondiente
2. **Paso 1 — Seleccionar cuotas:** Marcá con el checkbox las cuotas que el cliente pagó
3. **Paso 2 — Método de cobro:** Elegí entre:
   - Efectivo
   - Tarjeta
   - Mercado Pago
   - Transferencia
4. Podés agregar un número de comprobante o referencia (opcional)
5. Confirmá el registro

### 6.3 Pestaña: Historial de cuotas

Vista completa de todas las cuotas con filtros por estado:
- Todas / Pendientes / Vencidas / Fallidas / Pagadas

Columnas: Cliente, Nº Cuota, Monto, Fecha de vencimiento, Estado, Método de pago.

### 6.4 Pestaña: Préstamos finalizados

Créditos donde todas las cuotas fueron pagadas. Muestra capital, cuotas totales y fecha de finalización.

---

## 7. Planes

**Ruta:** `/admin/planes`

Configuración de los productos de crédito disponibles para los clientes.

### 7.1 Tipos de planes

| Tipo | Tasa | Frecuencia |
|------|------|------------|
| Personal | TEM (Tasa Efectiva Mensual) | Cuotas mensuales |
| Comercial (Pyme) | TED (Tasa Efectiva Diaria) | Cuotas diarias |

### 7.2 Crear o editar un plan

El formulario incluye:

- **Nombre del plan** (ej. "Personal 12 cuotas")
- **Tipo:** Personal, Comercial o Dependencia
- **Frecuencia:** Mensual, Diario o Quincenal
- **TEM %** (solo para Personal) — Tasa Efectiva Mensual
- **TED %** (solo para Comercial) — Tasa Efectiva Diaria
- **Monto mínimo y máximo** del préstamo
- **Plazo** (cantidad de cuotas o días)
- **Activo/Inactivo** — Solo los planes activos aparecen para los clientes
- **Tasa preferencial** — Si está marcado, solo se asigna a clientes seleccionados manualmente

Al ingresar los valores se muestra automáticamente una **vista previa de la cuota estimada**.

### 7.3 Gestión de planes existentes

Los planes se muestran agrupados por tipo. Sobre cada uno podés:
- **Editar** los valores
- **Activar/Desactivar** sin eliminarlo
- **Eliminar** definitivamente

> **Importante:** Desactivar un plan no afecta los préstamos ya otorgados con ese plan. Solo deja de estar disponible para nuevas solicitudes.

---

## 8. Signatura — Contratos Digitales

**Ruta:** `/admin/signatura`

Panel de control para los contratos enviados a firma electrónica.

### 8.1 Pestaña: Firmas

Lista de todos los contratos enviados con su estado actual.

Cada registro muestra:
- **Estado:** ✅ Firmado / ⏳ Pendiente
- Cliente (nombre, email, DNI)
- Monto y plan del crédito
- Fechas de envío y firma

Haciendo click en **"Ver firma"** se despliega un panel con información completa:
- Estado del documento en Signatura
- Link para descargar el PDF firmado
- **Datos biométricos del firmante:**
  - Nombre, documento y país verificados
  - Número de intentos realizados
  - Fotos capturadas: DNI frente, DNI dorso y selfie

### 8.2 Pestaña: Eventos webhook

Registro de todas las notificaciones automáticas recibidas desde Signatura cuando cambia el estado de un documento:

| Columna | Descripción |
|---------|-------------|
| Fecha | Cuándo llegó el evento |
| Acción | Tipo de evento (firma completada, rechazada, etc.) |
| Estado | HTTP status de la notificación |
| Documento | ID del contrato en Signatura |
| Cliente | Email del firmante |
| Procesado | ✓ OK si se procesó correctamente / ✗ Error si falló |

---

## 9. BCRA — Central de Deudores

**Ruta:** `/admin/bcra`

Consulta del historial crediticio de cualquier persona en el Banco Central de la República Argentina.

### Cómo consultar

1. Ingresá el **CUIL, CUIT o DNI** del cliente en el buscador
2. Hacé click en buscar
3. El sistema muestra los resultados en tiempo real

### Interpretación de resultados

| Situación | Color | Significado |
|-----------|-------|-------------|
| S1 | 🟢 Verde | Sin deuda o deuda normal — Pre-aprobado |
| S2 | 🟢 Verde | Riesgo bajo — Pre-aprobado |
| S3 | 🟠 Naranja | Riesgo medio — Analizar caso |
| S4 | 🔴 Rojo | Riesgo alto — No apto |
| S5 | 🔴 Rojo | Irrecuperable — No apto |

El detalle muestra el desglose por cada entidad financiera: banco, monto de deuda, días de atraso y situación individual.

> **Nota:** Esta consulta usa la API pública del BCRA. No requiere credenciales especiales y los datos son los mismos que ve cualquier banco.

---

## 10. AFIP — Padrón de Contribuyentes

**Ruta:** `/admin/afip`

Consulta de datos de contribuyentes en el padrón de AFIP.

### Cómo consultar

1. Ingresá el **CUIL o CUIT** (11 dígitos) en el buscador
2. El sistema retorna los datos del padrón

### Información disponible

**Para personas físicas:**
- Nombre y apellido
- Fecha de nacimiento y sexo
- Estado en AFIP (Activo / Inactivo)

**Para personas jurídicas:**
- Razón social
- Estado

**Datos generales:**
- Tipo y número de documento
- Tipo de clave (CUIT/CUIL/CDI)
- Domicilio fiscal completo

---

## 11. SMS Masivos

**Ruta:** `/admin/sms`

Herramienta para enviar mensajes SMS a clientes de forma masiva.

### 11.1 Cargar destinatarios

**Desde Excel:**
1. Hacé click en **"Importar Excel"**
2. Seleccioná un archivo `.xlsx` o `.xls`
3. El sistema detecta automáticamente las columnas de nombre y teléfono

**Manualmente:**
1. Ingresá el nombre (opcional) y el teléfono
2. Hacé click en **"Agregar"**
3. Repetí para cada destinatario

Podés eliminar destinatarios individuales o limpiar toda la lista.

### 11.2 Redactar el mensaje

**Con asistente IA (Gemini):**
1. Describí brevemente el tema del SMS en el campo de texto
2. Hacé click en **"✨ Generar mensaje"**
3. El sistema genera un SMS comercial y cordial automáticamente
4. Podés editar el mensaje generado antes de enviarlo

**Manual:**
- Escribí directamente en el campo de mensaje
- Máximo 160 caracteres (el contador te avisa cuántos te quedan)
- Usá `{nombre}` para personalizar con el nombre de cada destinatario

### 11.3 Configurar repeticiones

Podés elegir enviar el mismo mensaje **1, 2 o 3 veces** (útil para campañas de recordatorio).

### 11.4 Enviar y ver resultados

Al enviar, la tabla de resultados muestra el estado de cada mensaje: ✓ OK si se entregó correctamente, ✗ Error si falló.

---

## 12. BindX — Cuenta y Pagos

**Ruta:** `/admin/bind`

Panel de control de la cuenta bancaria de Zprest en BindX (plataforma de pagos).

### 12.1 Pestaña: Cuenta

Muestra el estado actual de la cuenta:
- **Saldo disponible** y **saldo acreditado**
- **CBU** y **alias** de la cuenta Zprest
- **Últimos movimientos:** tabla con tipo (crédito/débito), concepto, monto, estado y fecha

Si la integración no está configurada, se muestran las variables de entorno faltantes con instrucciones para completarlas.

### 12.2 Pestaña: DEBINs

Lista de débitos automáticos generados para cobrar cuotas.

Filtros: Todas / Pendiente / Fallida / Pagada

Cada DEBIN muestra: cliente, cuota correspondiente, monto, fecha de vencimiento, estado y número de reintentos.

**Acciones disponibles:**
- **Reintentar** — Vuelve a intentar el débito si falló
- **Cancelar** — Cancela un DEBIN pendiente

### 12.3 Pestaña: Transferencias

**Historial:** tabla de todas las acreditaciones realizadas a clientes (cliente, CBU destino, monto, estado, fecha).

**Transferencia manual:** formulario para enviar dinero directamente a un CBU desde la cuenta Zprest. Campos: CBU destino, monto y concepto.

---

## 13. Actividad

**Ruta:** `/admin/actividad`

Registro de auditoría de todas las acciones realizadas por los administradores.

Cada evento muestra:
- **Tipo de acción** con ícono (aprobación, rechazo, creación de plan, etc.)
- **Admin responsable** de la acción
- **Fecha y hora** exactas
- **Entidad afectada** (solicitud, cliente, plan, etc.)
- **Detalles adicionales** si aplica

Este registro no se puede modificar ni eliminar. Sirve para auditoría interna y resolución de disputas.

---

## 14. Arrepentimientos

**Ruta:** `/admin/arrepentimientos`

Gestión de solicitudes de derecho de arrepentimiento conforme al **Art. 34 de la Ley 24.240** (Ley de Defensa del Consumidor).

### 14.1 Panel de estadísticas

Cards con conteos de solicitudes: Pendientes / Resueltas / Rechazadas.

### 14.2 Lista de solicitudes

Tabla con filtros por estado. Cada fila muestra:
- Datos del cliente y del préstamo (monto y fechas)
- Fecha en que el cliente ejerció el derecho
- Estado actual

### 14.3 Gestionar una solicitud

1. Hacé click en **"Gestionar"** en una solicitud pendiente
2. Se abre un modal con los datos del préstamo y el motivo expresado por el cliente
3. Podés agregar **notas internas** (no visibles para el cliente)
4. Elegí una acción:
   - **Marcar como resuelto** — Acepta el arrepentimiento
   - **Rechazar solicitud** — Deniega el pedido

---

## 15. Configuración de Ziro IA

**Ruta:** `/admin/ziro`

Panel de configuración del chatbot de inteligencia artificial Ziro, integrado en la landing y el portal de clientes.

### Parámetros configurables

| Parámetro | Descripción |
|-----------|-------------|
| Prompt Vendedor | Instrucciones para el chatbot en la landing pública (enfocado en vender y asesorar) |
| Prompt Asesor | Instrucciones para el chatbot en el portal del cliente (con acceso al contexto del préstamo) |
| Modelo | Versión del modelo de IA (ej. `gemini-2.5-flash`) |
| Temperatura | Creatividad de las respuestas (0 = conservador, 1 = más libre) |

### Dos modos de operación

**Modo Vendedor** (landing pública):
- Explica los planes disponibles
- Calcula cuotas estimadas
- Guía al usuario a registrarse

**Modo Asesor** (portal del cliente post-login):
- Tiene acceso al contexto real del préstamo del usuario
- Responde preguntas sobre saldo, cuotas y vencimientos
- Ofrece asistencia personalizada

Los cambios se guardan y aplican inmediatamente sin necesidad de redesplegar.

---

## Glosario

| Término | Significado |
|---------|-------------|
| TEM | Tasa Efectiva Mensual — se aplica en planes Personales |
| TED | Tasa Efectiva Diaria — se aplica en planes Comerciales |
| CBU | Clave Bancaria Uniforme — 22 dígitos, identifica una cuenta bancaria |
| CVU | Clave Virtual Uniforme — 22 dígitos, identifica una billetera virtual |
| CUIL | Código Único de Identificación Laboral (personas físicas) |
| CUIT | Código Único de Identificación Tributaria (empresas) |
| DEBIN | Débito Inmediato — mecanismo de débito bancario automático |
| Signatura | Plataforma de firma electrónica con validación biométrica |
| BindX | Plataforma bancaria de pagos y transferencias |
| BCRA | Banco Central de la República Argentina |
| S1-S5 | Clasificación de riesgo crediticio del BCRA |

---

*Manual de usuario Zprest — versión 1.0 — Mayo 2026*
