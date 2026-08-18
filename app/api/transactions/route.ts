import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Tx = { id:string; date:string; type:'income'|'expense'; amount:number; category:string; note:string; createdAt:string; updatedAt:string }

export async function GET() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET
  if (!url || !secret) return NextResponse.json({ok:false,error:'Google Apps Script environment variables are not configured.'},{status:500})
  try {
    const response = await fetch(`${url}?action=list&secret=${encodeURIComponent(secret)}`, { cache:'no-store' })
    const data = await response.json()
    if (!data.ok) return NextResponse.json(data,{status:502})
    return NextResponse.json({ok:true,transactions:data.transactions as Tx[]})
  } catch (error) {
    return NextResponse.json({ok:false,error:String(error)},{status:502})
  }
}
