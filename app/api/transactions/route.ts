import { NextResponse } from 'next/server'
import { authConfigured, isAuthenticated } from '@/lib/auth'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

type Tx = { id:string; date:string; type:'income'|'expense'; amount:number; category:string; note:string; createdAt:string; updatedAt:string }

function normalizeDate(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`
}

function normalizeTransaction(raw: any): Tx {
  const rawType = String(raw?.type ?? '').trim().toLowerCase()
  const type = rawType === 'ingreso' ? 'income' : rawType === 'gasto' || rawType === 'outcome' ? 'expense' : rawType
  return {
    id: String(raw?.id ?? ''),
    date: normalizeDate(raw?.date),
    type: type === 'income' ? 'income' : 'expense',
    amount: parseAmount(raw?.amount),
    category: String(raw?.category ?? 'Other'),
    note: String(raw?.note ?? ''),
    createdAt: String(raw?.createdAt ?? ''),
    updatedAt: String(raw?.updatedAt ?? '')
  }
}

function parseAmount(value:unknown):number {
  if (typeof value === 'number') return value
  let text=String(value ?? '').trim().replace(/\s/g,'').replace(/ARS|\$/gi,'')
  if (text.includes(',') && text.includes('.')) text=text.replace(/\./g,'').replace(',','.')
  else if (text.includes(',')) text=text.replace(',','.')
  return Number(text) || 0
}

export async function GET() {
  if (!authConfigured()) return NextResponse.json({ok:false,error:'Configure DASHBOARD_PASSWORD and DASHBOARD_SESSION_SECRET in Vercel.'},{status:503})
  if (!await isAuthenticated()) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401})
  const url = process.env.GOOGLE_APPS_SCRIPT_URL
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET
  if (!url || !secret) return NextResponse.json({ok:false,error:'Google Apps Script environment variables are not configured.'},{status:500})
  try {
    const response = await fetch(`${url}?action=list&secret=${encodeURIComponent(secret)}`, { cache:'no-store' })
    const data = await response.json()
    if (!data.ok) return NextResponse.json(data,{status:502})
    const transactions = Array.isArray(data.transactions) ? data.transactions.map(normalizeTransaction) : []
    return NextResponse.json({ok:true,transactions})
  } catch (error) {
    return NextResponse.json({ok:false,error:String(error)},{status:502})
  }
}

async function appsScriptRequest(body:Record<string,unknown>) {
  const url=process.env.GOOGLE_APPS_SCRIPT_URL
  const secret=process.env.GOOGLE_APPS_SCRIPT_SECRET
  if(!url||!secret) throw new Error('Google Apps Script environment variables are not configured.')
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,secret}),cache:'no-store'})
  const data=await response.json()
  if(!response.ok||!data.ok) throw new Error(data.error||'Google Sheets rejected the request.')
  return data
}

export async function POST(request:Request) {
  if(!authConfigured()||!await isAuthenticated()) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401})
  try {
    const body=await request.json()
    const amount=parseAmount(body.amount)
    const type=body.type==='income'?'income':body.type==='expense'?'expense':''
    const date=String(body.date||'')
    const category=String(body.category||'').trim()
    if(!type) return NextResponse.json({ok:false,error:'Seleccioná ingreso o gasto.'},{status:400})
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ok:false,error:'La fecha no es válida.'},{status:400})
    if(!Number.isFinite(amount)||amount<=0) return NextResponse.json({ok:false,error:'El importe debe ser mayor que cero.'},{status:400})
    if(!category) return NextResponse.json({ok:false,error:'La categoría es obligatoria.'},{status:400})
    const now=new Date().toISOString()
    const transaction={id:String(body.id||randomUUID()),date,type,amount,category,note:String(body.note||'').trim(),createdAt:String(body.createdAt||now),updatedAt:now}
    await appsScriptRequest({action:'upsert',transaction})
    return NextResponse.json({ok:true,transaction})
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'No se pudo guardar el movimiento.'},{status:502}) }
}

export async function DELETE(request:Request) {
  if(!authConfigured()||!await isAuthenticated()) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401})
  try {
    const body=await request.json(); const id=String(body.id||'')
    if(!id) return NextResponse.json({ok:false,error:'Falta identificar el movimiento.'},{status:400})
    await appsScriptRequest({action:'delete',id})
    return NextResponse.json({ok:true})
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:'No se pudo eliminar el movimiento.'},{status:502}) }
}
