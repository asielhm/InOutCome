'use client'

import { useEffect, useMemo, useState } from 'react'

type Tx={id:string;date:string;type:'income'|'expense';amount:number;category:string;note:string;createdAt:string;updatedAt:string}
const money=(n:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
const parseDate=(d:string)=>{const x=new Date(`${d}T12:00:00`);return Number.isNaN(x.getTime())?new Date(0):x}
const monthLabel=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'short'}).format(parseDate(d))
const formatDate=(d:string)=>new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(parseDate(d))

function BarChart({data}:{data:{label:string,income:number,expense:number}[]}){
 const max=Math.max(1,...data.flatMap(x=>[x.income,x.expense]));
 return <div className="chartBars">{data.map(x=><div className="barGroup" key={x.label}><div className="bars"><div className="bar income" style={{height:`${Math.max(4,x.income/max*150)}px`}}/><div className="bar expense" style={{height:`${Math.max(4,x.expense/max*150)}px`}}/></div><span>{x.label}</span></div>)}</div>
}

export default function Home(){
 const [tx,setTx]=useState<Tx[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [range,setRange]=useState('month');
 useEffect(()=>{fetch('/api/transactions').then(r=>r.json()).then(d=>{if(!d.ok)throw Error(d.error);setTx(d.transactions||[])}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
 const filtered=useMemo(()=>{const now=new Date(); const start=new Date(now); if(range==='month') start.setDate(1); if(range==='year'){start.setMonth(0,1)} if(range==='30') start.setDate(now.getDate()-29); if(range==='all') return tx
 const end=new Date(now); end.setHours(23,59,59,999)
 return tx.filter(t=>{const d=parseDate(t.date); return d>=start && d<=end})},[tx,range])
 const income=filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); const expense=filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
 const balance=tx.reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount),0)
 const categories=Object.entries(filtered.filter(t=>t.type==='expense').reduce<Record<string,number>>((a,t)=>(a[t.category]=(a[t.category]||0)+t.amount,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,6)
 const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i),1);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return {label:monthLabel(`${key}-01`),income:tx.filter(t=>t.type==='income'&&t.date.startsWith(key)).reduce((s,t)=>s+t.amount,0),expense:tx.filter(t=>t.type==='expense'&&t.date.startsWith(key)).reduce((s,t)=>s+t.amount,0)}})
 return <main className="shell"><header><div><div className="brand">InOutCome</div><div className="muted">Personal finance dashboard</div></div><button className="refresh" onClick={()=>location.reload()}>↻ Refresh</button></header>
 <section className="hero"><div><h1>Financial overview</h1><p className="muted">Your Google Sheets transactions, in one place.</p></div><select value={range} onChange={e=>setRange(e.target.value)}><option value="month">This month</option><option value="30">Last 30 days</option><option value="year">This year</option><option value="all">All data</option></select></section>
 {loading&&<div className="card state">Loading transactions…</div>}{error&&<div className="card state error">{error}<small>Configure GOOGLE_APPS_SCRIPT_URL and GOOGLE_APPS_SCRIPT_SECRET in Vercel.</small></div>}
 {!loading&&!error&&<><section className="grid4"><div className="card stat"><span>Current balance</span><strong>{money(balance)}</strong><small>All transactions</small></div><div className="card stat"><span>Income</span><strong className="incomeText">{money(income)}</strong><small>Selected period</small></div><div className="card stat"><span>Expenses</span><strong className="expenseText">{money(expense)}</strong><small>Selected period</small></div><div className="card stat"><span>Net result</span><strong>{money(income-expense)}</strong><small>{filtered.length} transactions</small></div></section>
 <section className="grid2"><div className="card panel"><div className="panelHead"><div><h2>Income vs expenses</h2><span className="muted">Last 6 months</span></div><div className="legend"><i className="dot incomeBg"/>Income <i className="dot expenseBg"/>Expenses</div></div><BarChart data={months}/></div><div className="card panel"><div className="panelHead"><div><h2>Top expense categories</h2><span className="muted">Selected period</span></div></div><div className="categoryList">{categories.length?categories.map(([name,value])=><div className="cat" key={name}><div><b>{name}</b><span className="muted">{money(value)}</span></div><div className="track"><div style={{width:`${Math.max(4,value/categories[0][1]*100)}%`}}/></div></div>):<span className="muted">No expenses in this period.</span>}</div></div></section>
 <section className="card panel"><div className="panelHead"><div><h2>Recent transactions</h2><span className="muted">Newest first</span></div></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th><th className="right">Amount</th></tr></thead><tbody>{[...tx].sort((a,b)=>parseDate(b.date).getTime()-parseDate(a.date).getTime()||b.updatedAt.localeCompare(a.updatedAt)).slice(0,12).map(t=><tr key={t.id}><td>{formatDate(t.date)}</td><td><span className={`pill ${t.type}`}>{t.type}</span></td><td>{t.category}</td><td>{t.note||'—'}</td><td className={`right amount ${t.type}`}>{t.type==='expense'?'−':'+'}{money(t.amount)}</td></tr>)}</tbody></table></div></section></>}
 <footer className="muted">InOutCome · Data source: Google Sheets</footer></main>
}
