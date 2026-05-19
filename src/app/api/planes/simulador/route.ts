import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { PlanSimulador } from '@/types'

const MOCK_PLANES: PlanSimulador[] = [
  { id: 'p3',   nombre: 'Personal 3 cuotas',  tipo: 'personal', tna: 96,  tem: 18,   ted: null, frecuencia: 'mensual', monto_min: 1000000, monto_max: 7000000,  plazo_min: 3,   plazo_max: 3,   activo: true },
  { id: 'p6',   nombre: 'Personal 6 cuotas',  tipo: 'personal', tna: 96,  tem: 12,   ted: null, frecuencia: 'mensual', monto_min: 1000000, monto_max: 7000000,  plazo_min: 6,   plazo_max: 6,   activo: true },
  { id: 'p9',   nombre: 'Personal 9 cuotas',  tipo: 'personal', tna: 96,  tem:  9,   ted: null, frecuencia: 'mensual', monto_min: 1000000, monto_max: 7000000,  plazo_min: 9,   plazo_max: 9,   activo: true },
  { id: 'p12',  nombre: 'Personal 12 cuotas', tipo: 'personal', tna: 96,  tem:  8,   ted: null, frecuencia: 'mensual', monto_min: 1000000, monto_max: 7000000,  plazo_min: 12,  plazo_max: 12,  activo: true },
  { id: 'p18',  nombre: 'Personal 18 cuotas', tipo: 'personal', tna: 96,  tem:  7,   ted: null, frecuencia: 'mensual', monto_min: 1000000, monto_max: 7000000,  plazo_min: 18,  plazo_max: 18,  activo: true },
  { id: 'c30',  nombre: 'Comercial 30 días',  tipo: 'pyme',     tna: 503, tem: null, ted: 1.38, frecuencia: 'diario',  monto_min: 1000000, monto_max: 15000000, plazo_min: 30,  plazo_max: 30,  activo: true },
  { id: 'c60',  nombre: 'Comercial 60 días',  tipo: 'pyme',     tna: 553, tem: null, ted: 1.52, frecuencia: 'diario',  monto_min: 1000000, monto_max: 15000000, plazo_min: 60,  plazo_max: 60,  activo: true },
  { id: 'c90',  nombre: 'Comercial 90 días',  tipo: 'pyme',     tna: 509, tem: null, ted: 1.40, frecuencia: 'diario',  monto_min: 1000000, monto_max: 15000000, plazo_min: 90,  plazo_max: 90,  activo: true },
  { id: 'c120', nombre: 'Comercial 120 días', tipo: 'pyme',     tna: 408, tem: null, ted: 1.13, frecuencia: 'diario',  monto_min: 1000000, monto_max: 15000000, plazo_min: 120, plazo_max: 120, activo: true },
]

export async function GET() {
  const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
  if (IS_MOCK) return NextResponse.json(MOCK_PLANES)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('planes')
    .select('id, nombre, tipo, tna, tem, ted, frecuencia, monto_min, monto_max, plazo_min, plazo_max, activo')
    .eq('activo', true)
    .not('es_preferencial', 'is', true)
    .neq('tipo', 'dependencia')
    .order('tipo')
    .order('plazo_min')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
