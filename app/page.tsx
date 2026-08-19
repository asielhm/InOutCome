'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, LockKeyhole, LogOut, RefreshCw, Search, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'

type Tx = { id:string; date:string; type:'income'|'expense'; amount:number; category:string; note:string; createdAt:string; updatedAt:string }
type ChartPoint = { label:string; income:number; expense:number }
const money = (value:number) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', minimumFractionDigits:0, maximumFractionDigits:2 }).format(value)
const parseDate = (value:string) => { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? new Date(0) : date }
const formatDate = (value:string) => new Intl.DateTimeFormat('es-AR', { day:'2-digit', month:'short', year:'numeric' }).format(parseDate(value))
const monthKey = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
const monthName = (key:string) => new Intl.DateTimeFormat('es-AR', { month:'long', year:'numeric' }).format(parseDate(`${key}-01`))
const shortMonth = (key:string) => new Intl.DateTimeFormat('es-AR', { month:'short' }).format(parseDate(`${key}-01`)).replace('.', '')

function ChangeBadge({ current, previous }:{ current:number; previous:number }) {
  if (!previous) return <small>Sin comparación anterior</small>
  const change = ((current - previous) / Math.abs(previous)) * 100
  return <small className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(0)}% vs. mes anterior</small>
}

function BarChart({ data }:{ data:ChartPoint[] }) {
  const max = Math.max(1, ...data.flatMap(item => [item.income, item.expense]))
  return <div className="chart" role="img" aria-label="Ingresos y gastos de los últimos seis meses">
    <div className="chartGrid"><span/><span/><span/></div>
    <div className="chartBars">{data.map(item => <div className="barGroup" key={item.label}><div className="bars">
      <div className="bar incomeBar" title={`Ingresos: ${money(item.income)}`} style={{height:`${Math.max(item.income ? 5 : 1, item.income/max*150)}px`}}/>
      <div className="bar expenseBar" title={`Gastos: ${money(item.expense)}`} style={{height:`${Math.max(item.expense ? 5 : 1, item.expense/max*150)}px`}}/>
    </div><span>{shortMonth(item.label)}</span></div>)}</div>
  </div>
}

function Login({ onSuccess }:{ onSuccess:()=>void }) {
  const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event:FormEvent) {
    event.preventDefault(); setLoading(true); setError('')
    try { const response = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password}) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo iniciar sesión.'); onSuccess() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.') } finally { setLoading(false) }
  }
  return <main className="loginPage"><section className="loginCard"><div className="loginIcon"><LockKeyhole size={26}/></div><div className="brand">InOutCome</div><h1>Tu dinero, solo para vos.</h1><p>Ingresá la contraseña privada de tu dashboard.</p><form onSubmit={submit}><label htmlFor="password">Contraseña</label><input id="password" type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" required autoFocus/>{error && <div className="formError" role="alert">{error}</div>}<button className="primaryButton" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button></form></section></main>
}

export default function Home() {
  const [transactions, setTransactions] = useState<Tx[]>([]); const [loading, setLoading] = useState(true); const [authenticated, setAuthenticated] = useState<boolean|null>(null); const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date())); const [type, setType] = useState('all'); const [category, setCategory] = useState('all'); const [query, setQuery] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await fetch('/api/transactions', {cache:'no-store'}); if (response.status === 401) { setAuthenticated(false); return } const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudieron cargar los movimientos.'); setTransactions(data.transactions || []); setAuthenticated(true) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los movimientos.') } finally { setLoading(false) } }, [])
  useEffect(() => { load() }, [load])

  const invalidCount = transactions.filter(item => !Number.isFinite(item.amount) || item.amount <= 0).length
  const valid = useMemo(() => transactions.filter(item => Number.isFinite(item.amount) && item.amount > 0), [transactions])
  const monthOptions = useMemo(() => Array.from(new Set([monthKey(new Date()), ...valid.map(item => item.date.slice(0,7))])).filter(key=>/^\d{4}-\d{2}$/.test(key)).sort().reverse(), [valid])
  const categories = useMemo(() => Array.from(new Set(valid.map(item=>item.category))).sort((a,b)=>a.localeCompare(b,'es')), [valid])
  const filtered = useMemo(() => valid.filter(item => { const matchesMonth = selectedMonth === 'all' || item.date.startsWith(selectedMonth); const matchesType = type === 'all' || item.type === type; const matchesCategory = category === 'all' || item.category === category; const term = query.trim().toLocaleLowerCase('es'); const matchesQuery = !term || `${item.category} ${item.note}`.toLocaleLowerCase('es').includes(term); return matchesMonth && matchesType && matchesCategory && matchesQuery }), [valid, selectedMonth, type, category, query])
  const income = filtered.filter(item=>item.type==='income').reduce((sum,item)=>sum+item.amount,0); const expense = filtered.filter(item=>item.type==='expense').reduce((sum,item)=>sum+item.amount,0); const balance = valid.reduce((sum,item)=>sum+(item.type==='income'?item.amount:-item.amount),0)
  const previousKey = selectedMonth === 'all' ? '' : (() => { const date=parseDate(`${selectedMonth}-01`); date.setMonth(date.getMonth()-1); return monthKey(date) })()
  const previous = valid.filter(item=>item.date.startsWith(previousKey)); const previousIncome = previous.filter(item=>item.type==='income').reduce((sum,item)=>sum+item.amount,0); const previousExpense = previous.filter(item=>item.type==='expense').reduce((sum,item)=>sum+item.amount,0)
  const categoryTotals = Object.entries(filtered.filter(item=>item.type==='expense').reduce<Record<string,number>>((result,item)=>{result[item.category]=(result[item.category]||0)+item.amount;return result},{})).sort((a,b)=>b[1]-a[1]).slice(0,6)
  const chart = Array.from({length:6},(_,index)=>{const date=new Date();date.setMonth(date.getMonth()-(5-index),1);const key=monthKey(date);return {label:key,income:valid.filter(item=>item.type==='income'&&item.date.startsWith(key)).reduce((sum,item)=>sum+item.amount,0),expense:valid.filter(item=>item.type==='expense'&&item.date.startsWith(key)).reduce((sum,item)=>sum+item.amount,0)}})
  const sorted = [...filtered].sort((a,b)=>parseDate(b.date).getTime()-parseDate(a.date).getTime()||b.updatedAt.localeCompare(a.updatedAt))
  async function logout() { await fetch('/api/auth',{method:'DELETE'}); setAuthenticated(false); setTransactions([]) }
  function exportCSV() { const rows = [['Fecha','Tipo','Categoría','Nota','Importe'], ...sorted.map(item=>[item.date,item.type==='income'?'Ingreso':'Gasto',item.category,item.note,String(item.amount).replace('.',',')])]; const csv = rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(';')).join('\n'); const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); link.download=`inoutcome-${selectedMonth}.csv`; link.click(); URL.revokeObjectURL(link.href) }

  if (authenticated === false) return <Login onSuccess={load}/>
  if (authenticated === null && loading) return <main className="loadingPage"><div className="spinner"/><span>Preparando tu resumen…</span></main>
  return <main className="shell">
    <header className="topbar"><div><div className="brand">InOutCome</div><div className="muted">Finanzas personales</div></div><div className="headerActions"><button className="iconButton" onClick={load} disabled={loading} aria-label="Actualizar"><RefreshCw size={17}/><span>Actualizar</span></button><button className="iconButton" onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
    <section className="hero"><div><span className="eyebrow">RESUMEN FINANCIERO</span><h1>Hola, así vienen tus números.</h1><p>Todo lo que registrás desde el Shortcut, ordenado en un solo lugar.</p></div><div className="balanceHero"><span>Saldo acumulado</span><strong>{money(balance)}</strong><small>Desde el primer movimiento</small></div></section>
    <section className="filters" aria-label="Filtros"><label><CalendarDays size={16}/><select value={selectedMonth} onChange={event=>setSelectedMonth(event.target.value)}><option value="all">Todos los períodos</option>{monthOptions.map(key=><option value={key} key={key}>{monthName(key)}</option>)}</select></label><select value={type} onChange={event=>setType(event.target.value)} aria-label="Filtrar por tipo"><option value="all">Ingresos y gastos</option><option value="income">Solo ingresos</option><option value="expense">Solo gastos</option></select><select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Filtrar por categoría"><option value="all">Todas las categorías</option>{categories.map(value=><option value={value} key={value}>{value}</option>)}</select><label className="search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar nota o categoría"/></label></section>
    {error && <div className="state error" role="alert"><b>No pudimos cargar tus datos.</b><span>{error}</span><button onClick={load}>Reintentar</button></div>}{invalidCount > 0 && <div className="qualityNotice">Hay {invalidCount} movimiento{invalidCount===1?'':'s'} sin importe válido. No se incluyen en los cálculos.</div>}
    {!error && <><section className="stats"><article className="statCard incomeStat"><div className="statIcon"><TrendingUp/></div><span>Ingresos</span><strong>{money(income)}</strong><ChangeBadge current={income} previous={previousIncome}/></article><article className="statCard expenseStat"><div className="statIcon"><TrendingDown/></div><span>Gastos</span><strong>{money(expense)}</strong><ChangeBadge current={expense} previous={previousExpense}/></article><article className="statCard netStat"><div className="statIcon"><WalletCards/></div><span>Resultado del período</span><strong>{money(income-expense)}</strong><small>{filtered.length} movimiento{filtered.length===1?'':'s'} seleccionados</small></article></section>
    <section className="insights"><article className="panel chartPanel"><div className="panelHead"><div><h2>Ingresos vs. gastos</h2><p>Últimos seis meses</p></div><div className="legend"><span><i className="incomeDot"/>Ingresos</span><span><i className="expenseDot"/>Gastos</span></div></div><BarChart data={chart}/></article><article className="panel"><div className="panelHead"><div><h2>Gastos por categoría</h2><p>{selectedMonth==='all'?'Todos los períodos':monthName(selectedMonth)}</p></div></div><div className="categoryList">{categoryTotals.length ? categoryTotals.map(([name,value])=><div className="categoryItem" key={name}><div><b>{name}</b><span>{money(value)}</span></div><div className="track"><div style={{width:`${Math.max(3,value/categoryTotals[0][1]*100)}%`}}/></div><small>{expense ? `${(value/expense*100).toFixed(0)}% de los gastos` : ''}</small></div>) : <div className="empty">No hay gastos para estos filtros.</div>}</div></article></section>
    <section className="panel transactions"><div className="panelHead"><div><h2>Movimientos</h2><p>{sorted.length} resultados · más recientes primero</p></div><button className="exportButton" onClick={exportCSV} disabled={!sorted.length}><Download size={16}/>Exportar CSV</button></div>{sorted.length ? <><div className="tableWrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Nota</th><th>Importe</th></tr></thead><tbody>{sorted.map(item=><tr key={item.id}><td>{formatDate(item.date)}</td><td><span className={`pill ${item.type}`}>{item.type==='income'?'Ingreso':'Gasto'}</span></td><td><b>{item.category}</b></td><td className="noteCell">{item.note||'Sin nota'}</td><td className={`amount ${item.type}`}>{item.type==='expense'?'−':'+'}{money(item.amount)}</td></tr>)}</tbody></table></div><div className="mobileTransactions">{sorted.map(item=><article key={item.id}><div className={`transactionIcon ${item.type}`}>{item.type==='income'?'↓':'↑'}</div><div><b>{item.category}</b><span>{item.note||formatDate(item.date)}</span></div><strong className={item.type}>{item.type==='expense'?'−':'+'}{money(item.amount)}</strong></article>)}</div></> : <div className="empty large">No encontramos movimientos con esos filtros.</div>}</section></>}
    <footer>InOutCome · Datos privados sincronizados desde Google Sheets</footer>
  </main>
}
