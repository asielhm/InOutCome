import { NextResponse } from 'next/server'

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
    amount: Number(raw?.amount) || 0,
    category: String(raw?.category ?? 'Other'),
    note: String(raw?.note ?? ''),
    createdAt: String(raw?.createdAt ?? ''),
    updatedAt: String(raw?.updatedAt ?? '')
  }
}

export async function GET() {
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
