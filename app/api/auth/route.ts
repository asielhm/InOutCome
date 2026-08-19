import { NextResponse } from 'next/server'
import { authConfigured, passwordsMatch, SESSION_COOKIE, sessionToken } from '@/lib/auth'

export async function POST(request:Request) {
  if (!authConfigured()) return NextResponse.json({ok:false,error:'Falta configurar la contraseña del dashboard en Vercel.'},{status:503})
  const body=await request.json().catch(()=>({}))
  if (!passwordsMatch(String(body.password || ''))) return NextResponse.json({ok:false,error:'La contraseña no es correcta.'},{status:401})
  const response=NextResponse.json({ok:true})
  response.cookies.set(SESSION_COOKIE,sessionToken(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*24*30})
  return response
}
export async function DELETE() { const response=NextResponse.json({ok:true}); response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0}); return response }
