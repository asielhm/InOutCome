import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'inoutcome_session'
export function authConfigured() { return Boolean(process.env.DASHBOARD_PASSWORD && process.env.DASHBOARD_SESSION_SECRET) }
export function sessionToken() { return createHmac('sha256', process.env.DASHBOARD_SESSION_SECRET || '').update(`inoutcome:${process.env.DASHBOARD_PASSWORD || ''}`).digest('hex') }
export function passwordsMatch(received:string) { const expected=Buffer.from(process.env.DASHBOARD_PASSWORD || ''); const actual=Buffer.from(received); return expected.length===actual.length && expected.length>0 && timingSafeEqual(expected,actual) }
export async function isAuthenticated() { if(!authConfigured())return false; const received=(await cookies()).get(SESSION_COOKIE)?.value || ''; const expected=sessionToken(); const a=Buffer.from(received); const b=Buffer.from(expected); return a.length===b.length && timingSafeEqual(a,b) }
