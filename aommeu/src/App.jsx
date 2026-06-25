import { useState, useCallback, useMemo } from 'react'
import './app.css'

const KEY = 'aommeu_v1'
const THEME_KEY = KEY + '_theme'
const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const WDAYS = ['อา','จ','อ','พ','พฤ','ศ','ส']

const CATS = [
  { key:'food', label:'อาหาร', color:'#E0795B', mono:'อ' },
  { key:'cafe', label:'คาเฟ่', color:'#C8956D', mono:'ค' },
  { key:'travel', label:'เดินทาง', color:'#6FA8C7', mono:'ท' },
  { key:'shop', label:'ช้อปปิ้ง', color:'#B98BC9', mono:'ช' },
  { key:'fun', label:'บันเทิง', color:'#E0A458', mono:'บ' },
  { key:'bill', label:'บิล', color:'#7C9CC4', mono:'บ' },
  { key:'health', label:'สุขภาพ', color:'#6FB89A', mono:'ส' },
  { key:'other', label:'อื่นๆ', color:'#9a9a9a', mono:'…' },
]

const THEMES = {
  dark: { accent:'#C8F751', onAccent:'#0B0B0C', surface:'#141416', border:'#1f1f22', text:'#F2F2F0', mute:'#8d8d92', faint:'#6e6e72', track:'#222226', warm:'#C8F751', ringTrack:'#1b1b1e', card2:'#101012' },
  sage: { accent:'#5B7553', onAccent:'#FFFFFF', surface:'#FFFFFF', border:'rgba(0,0,0,.06)', text:'#2E332B', mute:'#7c8473', faint:'#9aa18d', track:'#E4E8DC', warm:'#C97B5A', ringTrack:'#DDE2D3', card2:'#F4F6EF' },
}

const REASON_DEFS = [
  { key:'need', label:'จำเป็นจริงๆ', sub:'ขาดไม่ได้', impulse:false },
  { key:'plan', label:'วางแผนไว้แล้ว', sub:'อยู่ในงบ', impulse:false },
  { key:'want', label:'แค่อยากได้', sub:'ไม่ได้จำเป็น', impulse:true },
  { key:'mood', label:'อารมณ์/ความเครียด', sub:'ซื้อเพื่อให้รู้สึกดี', impulse:true },
  { key:'promo', label:'เห็นโปร/ลดราคา', sub:'กลัวพลาด', impulse:true },
]

function defaultData() {
  return {
    dailyBudget: 500,
    transactions: [],
    goals: [
      { id:'g1', title:'ทริปในฝัน', color:'#6FA8C7', target:50000, saved:0, note:'เก็บไว้เที่ยวให้รางวัลตัวเอง' },
      { id:'g2', title:'กองทุนฉุกเฉิน', color:'#6FB89A', target:100000, saved:0, note:'สำรองเผื่อเหตุไม่คาดฝัน' },
    ],
    streak: { count:0, lastDay:null },
  }
}

function loadData() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.transactions) return d } catch(e) {}
  return defaultData()
}
function saveData(d) { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch(e) {} }
function loadTheme() { try { return localStorage.getItem(THEME_KEY) || 'dark' } catch(e) { return 'dark' } }
function saveTheme(t) { try { localStorage.setItem(THEME_KEY, t) } catch(e) {} }

function fmt(n) { return Number(Math.round(n)).toLocaleString('en-US') }
function short(n) { n = Math.round(n); if (n >= 1000) return '฿' + (n/1000).toFixed(n%1000===0?0:1) + 'k'; return '฿' + n }
function dayKey(ts) { const d = new Date(ts); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate() }
function todayKey() { return dayKey(Date.now()) }
function thaiDate(ts) { const d = new Date(ts); return d.getDate()+' '+MONTHS[d.getMonth()] }
function relLabel(ts) { const k = dayKey(ts); if (k===todayKey()) return 'วันนี้'; if (k===dayKey(Date.now()-86400000)) return 'เมื่อวาน'; return thaiDate(ts) }
function timeStr(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }
function fmtAmt(s) { if (!s || s==='0') return '0'; const p = s.split('.'); const i = Number(p[0]||0).toLocaleString('en-US'); return p.length>1 ? i+'.'+p[1] : i }

export default function App() {
  const [theme, setTheme] = useState(loadTheme)
  const [screen, setScreen] = useState('home')
  const [addStep, setAddStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [txType, setTxType] = useState('expense')
  const [category, setCategory] = useState(null)
  const [reason, setReason] = useState(null)
  const [savedAmt, setSavedAmt] = useState('0')
  const [data, setData] = useState(loadData)

  const isDark = theme === 'dark'
  const t = THEMES[theme]

  const toggleTheme = useCallback(() => {
    setTheme(prev => { const next = prev === 'dark' ? 'sage' : 'dark'; saveTheme(next); return next })
  }, [])

  const update = useCallback((mut) => {
    setData(prev => { const d = JSON.parse(JSON.stringify(prev)); mut(d); saveData(d); return d })
  }, [])

  const go = useCallback((s) => setScreen(s), [])
  const goAdd = useCallback(() => { setScreen('add'); setAddStep(1); setAmount(''); setCategory(null); setReason(null); setTxType('expense') }, [])

  const pressKey = useCallback((k) => {
    setAmount(prev => {
      if (k === 'del') return prev.slice(0, -1)
      if (k === '.') { if (!prev.includes('.')) return (prev || '0') + '.'; return prev }
      const digits = prev.replace('.', '')
      if (digits.length >= 7) return prev
      if (prev === '0') return k
      return prev + k
    })
  }, [])

  const commit = useCallback(() => {
    const amtNum = Number(amount) || 0
    if (amtNum <= 0) return
    const cat = txType === 'income' ? 'income' : category
    if (!cat) return
    const tx = { id: 't' + Date.now() + Math.random().toString(36).slice(2, 5), type: txType, cat, amount: amtNum, ts: Date.now() }
    update(d => {
      d.transactions.unshift(tx)
      const today = todayKey()
      if (d.streak.lastDay !== today) {
        const y = dayKey(Date.now() - 86400000)
        d.streak.count = d.streak.lastDay === y ? (d.streak.count + 1) : 1
        d.streak.lastDay = today
      }
    })
    setSavedAmt(fmtAmt(amount))
    setAddStep(3)
  }, [amount, txType, category, update])

  const nextFromAmount = useCallback(() => {
    const a = Number(amount) || 0
    if (a <= 0) return
    if (txType === 'expense') { if (!category) return; setAddStep(2) }
    else commit()
  }, [amount, txType, category, commit])

  const addBack = useCallback(() => {
    if (addStep > 1) setAddStep(prev => prev - 1)
    else { setScreen('home'); setAmount(''); setCategory(null); setReason(null) }
  }, [addStep])

  const finishAdd = useCallback(() => {
    setScreen('home'); setAddStep(1); setAmount(''); setCategory(null); setReason(null); setTxType('expense')
  }, [])

  const deleteTx = useCallback((id) => update(d => { d.transactions = d.transactions.filter(t => t.id !== id) }), [update])
  const contribute = useCallback((id) => update(d => { const g = d.goals.find(x => x.id === id); if (g) g.saved = Math.min(g.target, g.saved + 500) }), [update])
  const setBudget = useCallback((delta) => update(d => { d.dailyBudget = Math.max(50, d.dailyBudget + delta) }), [update])

  const seedDemo = useCallback(() => {
    const now = Date.now(), day = 86400000
    const mk = (type, cat, amount, da, h, m) => { const dt = new Date(now - da * day); dt.setHours(h, m, 0, 0); return { id: 't' + dt.getTime() + Math.random().toString(36).slice(2, 5), type, cat, amount, ts: dt.getTime() } }
    const txs = [mk('income','income',28000,1,9,0), mk('expense','cafe',95,0,8,15), mk('expense','food',80,0,12,30),
      mk('expense','food',240,1,19,40), mk('expense','travel',35,1,8,15), mk('expense','shop',165,2,12,20),
      mk('expense','bill',420,2,10,0), mk('expense','food',90,3,12,30), mk('expense','cafe',102,4,7,50), mk('expense','fun',300,5,20,0)]
    update(d => { d.transactions = txs.sort((a, b) => b.ts - a.ts); if (d.goals[0]) d.goals[0].saved = 32000; if (d.goals[1]) d.goals[1].saved = 40000; d.streak = { count: 5, lastDay: todayKey() } })
  }, [update])

  const resetAll = useCallback(() => {
    if (!confirm('ล้างข้อมูลทั้งหมด? การกระทำนี้ย้อนกลับไม่ได้')) return
    const d = defaultData(); saveData(d); setData(d); setScreen('home')
  }, [])

  const txns = data.transactions
  const budget = data.dailyBudget
  const today = todayKey()
  const todayExpense = txns.filter(x => x.type === 'expense' && dayKey(x.ts) === today).reduce((s, x) => s + x.amount, 0)
  const over = todayExpense > budget
  const remain = Math.max(0, budget - todayExpense)
  const dailyPct = budget > 0 ? Math.max(0, Math.min(1, remain / budget)) : 0
  const ringOffset = (628.3 * (1 - dailyPct)).toFixed(1)
  const ringColor = over ? t.warm : t.accent
  const dailySub = over ? ('เกินงบวันนี้ ฿' + fmt(todayExpense - budget)) : ('ใช้ไป ฿' + fmt(todayExpense) + ' จาก ฿' + fmt(budget))
  const subColor = over ? t.warm : t.faint
  const streakCount = data.streak.count || 0
  const streakDots = Array.from({ length: 7 }, (_, i) => i < Math.min(streakCount, 7) ? t.warm : t.track)

  const h = new Date().getHours()
  const greeting = h < 11 ? 'สวัสดีตอนเช้า' : h < 16 ? 'สวัสดีตอนบ่าย' : h < 19 ? 'สวัสดีตอนเย็น' : 'สวัสดีตอนค่ำ'
  const nd = new Date()
  const dateLabel = nd.getDate() + ' ' + MONTHS[nd.getMonth()]

  const viewTx = (x) => {
    let info
    if (x.type === 'income') info = { mono: '฿', color: '#8BC97E', label: 'รายรับ' }
    else { const c = CATS.find(k => k.key === x.cat) || CATS[7]; info = { mono: c.mono, color: c.color, label: c.label } }
    return { id: x.id, mono: info.mono, color: info.color, title: info.label,
      amt: (x.type === 'income' ? '+' : '-') + '฿' + fmt(x.amount),
      amtColor: x.type === 'income' ? t.accent : t.text,
      meta: relLabel(x.ts) + ' · ' + timeStr(x.ts),
      time: timeStr(x.ts) }
  }

  const hasTx = txns.length > 0
  const recentTx = txns.slice(0, 4).map(viewTx)

  const historyGroups = useMemo(() => {
    const gm = {}
    txns.forEach(x => { const k = dayKey(x.ts); (gm[k] = gm[k] || []).push(x) })
    return Object.keys(gm).map(k => {
      const items = gm[k]
      const net = items.reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0)
      return { key: k, ts: items[0].ts, label: relLabel(items[0].ts), total: (net >= 0 ? '+' : '-') + '฿' + fmt(Math.abs(net)), items: items.map(viewTx) }
    }).sort((a, b) => b.ts - a.ts)
  }, [txns, t])

  const now2 = new Date()
  const mo = now2.getMonth(), yr = now2.getFullYear()
  const inMonth = (x) => { const dd = new Date(x.ts); return dd.getMonth() === mo && dd.getFullYear() === yr }
  const monthExpenseN = txns.filter(x => x.type === 'expense' && inMonth(x)).reduce((s, x) => s + x.amount, 0)
  const daysInMonth = new Date(yr, mo + 1, 0).getDate()
  const monthBudgetN = budget * daysInMonth
  const monthPct = monthBudgetN > 0 ? Math.min(100, Math.round(monthExpenseN / monthBudgetN * 100)) : 0
  const monthLeftLabel = monthExpenseN > monthBudgetN ? ('เกิน ฿' + fmt(monthExpenseN - monthBudgetN)) : ('เหลือ ฿' + fmt(Math.max(0, monthBudgetN - monthExpenseN)))

  const weekBars = useMemo(() => {
    const bars = []
    for (let i = 6; i >= 0; i--) {
      const ts = Date.now() - i * 86400000
      const k = dayKey(ts)
      const sum = txns.filter(x => x.type === 'expense' && dayKey(x.ts) === k).reduce((s, x) => s + x.amount, 0)
      bars.push({ ts, sum, wd: new Date(ts).getDay(), today: i === 0 })
    }
    const maxDay = Math.max(1, ...bars.map(x => x.sum))
    return bars.map(b => ({ d: WDAYS[b.wd], h: Math.round(b.sum / maxDay * 100) + '%', fill: b.today ? t.accent : (isDark ? '#3a3a3f' : '#C5CCBA'), lblColor: b.today ? t.accent : t.faint }))
  }, [txns, t, isDark])

  const catBreakdown = useMemo(() => {
    const sums = {}
    txns.filter(x => x.type === 'expense' && inMonth(x)).forEach(x => { sums[x.cat] = (sums[x.cat] || 0) + x.amount })
    return Object.keys(sums).map(k => { const c = CATS.find(z => z.key === k) || CATS[7]; return { label: c.label, color: c.color, sum: sums[k], amt: fmt(sums[k]), pct: monthExpenseN > 0 ? Math.round(sums[k] / monthExpenseN * 100) : 0 } }).sort((a, b) => b.sum - a.sum).slice(0, 5)
  }, [txns, monthExpenseN])

  const goals = data.goals.map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round(g.saved / g.target * 100)) : 0
    return { id: g.id, title: g.title, color: g.color, pct, note: g.note,
      cur: '฿' + fmt(g.saved), target: '฿' + fmt(g.target), left: '฿' + fmt(Math.max(0, g.target - g.saved)),
      offset: (194.8 * (1 - pct / 100)).toFixed(1) }
  })
  const totalSavedN = data.goals.reduce((s, g) => s + g.saved, 0)
  const topGoal = goals[0] || null

  const noSpendSet = new Set(txns.filter(x => x.type === 'expense' && inMonth(x)).map(x => dayKey(x.ts)))
  const noSpendDays = Math.max(0, now2.getDate() - noSpendSet.size)
  const levelName = totalSavedN >= 100000 ? 'นักออมระดับทอง' : totalSavedN >= 20000 ? 'นักออมระดับเงิน' : 'นักออมมือใหม่'
  const anyGoalDone = data.goals.some(g => g.saved >= g.target && g.target > 0)

  const badgeDefs = [
    { label: '7 วันติด', color: '#C97B5A', earned: streakCount >= 7 },
    { label: 'เริ่มออม', color: '#6FB89A', earned: totalSavedN > 0 || hasTx },
    { label: 'No-spend 3 วัน', color: '#6FA8C7', earned: noSpendDays >= 3 },
    { label: '30 วันติด', color: '#B98BC9', earned: streakCount >= 30 },
    { label: 'ออมครบเป้า', color: '#E0A458', earned: anyGoalDone },
    { label: 'ออม 100k', color: '#8BC97E', earned: totalSavedN >= 100000 },
  ]

  const isExpense = txType === 'expense'
  const selCat = CATS.find(c => c.key === category)
  const selectedCatLabel = isExpense ? (selCat ? selCat.label : '') : 'รายรับ'
  const canNext = (Number(amount) || 0) > 0 && (!isExpense || !!category)
  const chosenReason = REASON_DEFS.find(r => r.key === reason)
  const showNudge = !!(chosenReason && chosenReason.impulse)
  const savedMsg = streakCount > 1 ? ('เยี่ยมมาก! บันทึกต่อเนื่องมา ' + streakCount + ' วันแล้ว รักษาวินัยแบบนี้ไว้นะ') : 'เริ่มต้นได้ดีมาก! พรุ่งนี้มาบันทึกต่อเพื่อสร้าง streak กัน'

  const tint = (s) => screen === s ? t.accent : t.faint

  return (
    <div className="stage">
      <div className={`app ${isDark ? '' : 'sage'}`}>
        <div className="scroll">
          {screen === 'home' && (
            <div className="pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--mute)' }}>{greeting}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginTop: 1 }}>{dateLabel}</div>
                </div>
                <div className="press" onClick={toggleTheme} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                  {isDark ? <SunIcon /> : <MoonIcon />}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                <div style={{ position: 'relative', width: 236, height: 236 }}>
                  <svg width="236" height="236" viewBox="0 0 236 236">
                    <circle cx="118" cy="118" r="100" fill="none" stroke="var(--ringTrack)" strokeWidth="15" />
                    <circle cx="118" cy="118" r="100" fill="none" stroke={ringColor} strokeWidth="15" strokeLinecap="round" strokeDasharray="628.3" strokeDashoffset={ringOffset} transform="rotate(-90 118 118)" style={{ transition: 'stroke-dashoffset .5s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 13, color: 'var(--mute)' }}>ใช้ได้วันนี้</div>
                    <div className="num" style={{ fontSize: 54, fontWeight: 600, color: 'var(--text)', lineHeight: 1, marginTop: 5 }}><span className="baht" style={{ fontSize: '.7em' }}>฿</span>{fmt(remain)}</div>
                    <div style={{ fontSize: 13, color: subColor, marginTop: 5 }}>{dailySub}</div>
                  </div>
                </div>
              </div>

              <div className="press" onClick={() => go('profile')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <FireIcon />
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>บันทึกต่อเนื่อง <span style={{ color: 'var(--warm)', fontWeight: 700 }}>{streakCount} วัน</span></div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {streakDots.map((c, i) => <span key={i} style={{ width: 8, height: 20, borderRadius: 4, background: c }} />)}
                </div>
              </div>

              {topGoal && (
                <div className="press" onClick={() => go('goals')} style={{ marginTop: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>เป้าหมาย · {topGoal.title}</div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>{topGoal.pct}%</div>
                  </div>
                  <div style={{ height: 8, background: 'var(--track)', borderRadius: 100, marginTop: 14, overflow: 'hidden' }}><div style={{ height: '100%', width: topGoal.pct + '%', background: 'var(--accent)', borderRadius: 100 }} /></div>
                  <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 10 }}><span className="num">{topGoal.cur}</span> จาก <span className="num">{topGoal.target}</span> · เหลืออีก <span className="num">{topGoal.left}</span></div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 4px 12px' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>รายการล่าสุด</div>
                <div className="press" onClick={() => go('history')} style={{ fontSize: 13, color: 'var(--mute)' }}>ดูทั้งหมด ›</div>
              </div>
              {hasTx ? recentTx.map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 2px' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: tx.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 600, fontSize: 16 }}>{tx.mono}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{tx.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 2 }}>{tx.meta}</div>
                  </div>
                  <div className="num" style={{ fontSize: 16, fontWeight: 600, color: tx.amtColor }}>{tx.amt}</div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 20 }}>
                  <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>ยังไม่มีรายการ</div>
                  <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 6, lineHeight: 1.5 }}>แตะปุ่ม + ด้านล่างเพื่อบันทึกรายการแรก<br />หรือใส่ข้อมูลตัวอย่างได้ในหน้าโปรไฟล์</div>
                </div>
              )}
            </div>
          )}

          {screen === 'add' && (
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '14px 22px calc(22px + env(safe-area-inset-bottom,0px))' }}>
              {addStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 36px)', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="press" onClick={addBack} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>เพิ่มรายการ</div>
                    <div style={{ width: 38 }} />
                  </div>

                  <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 5, marginTop: 18 }}>
                    <div className="press" onClick={() => { setTxType('expense'); setCategory(null) }} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600, background: isExpense ? 'var(--accent)' : 'transparent', color: isExpense ? 'var(--onAccent)' : 'var(--mute)' }}>รายจ่าย</div>
                    <div className="press" onClick={() => { setTxType('income'); setCategory('income') }} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600, background: !isExpense ? 'var(--accent)' : 'transparent', color: !isExpense ? 'var(--onAccent)' : 'var(--mute)' }}>รายรับ</div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <div style={{ fontSize: 13, color: 'var(--mute)' }}>จำนวนเงิน</div>
                    <div className="num" style={{ fontSize: 58, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1, marginTop: 2 }}><span className="baht" style={{ fontSize: '.7em' }}>฿</span>{fmtAmt(amount)}</div>
                  </div>

                  {isExpense && (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--mute)', margin: '16px 2px 10px' }}>หมวดหมู่</div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                        {CATS.map(c => (
                          <div key={c.key} className="press" onClick={() => setCategory(c.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 62 }}>
                            <div style={{ width: 50, height: 50, borderRadius: 16, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 17, boxShadow: category === c.key ? '0 0 0 2px var(--accent)' : 'none' }}>{c.mono}</div>
                            <div style={{ fontSize: 11, color: 'var(--mute)', whiteSpace: 'nowrap' }}>{c.label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ flex: 1, minHeight: 14 }} />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                    {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k => (
                      <div key={k} className="key press" onClick={() => pressKey(k)}>{k === 'del' ? '⌫' : k}</div>
                    ))}
                  </div>

                  <div className="press" onClick={nextFromAmount} style={{ marginTop: 12, background: canNext ? 'var(--accent)' : 'var(--track)', color: canNext ? 'var(--onAccent)' : 'var(--faint)', borderRadius: 100, padding: 17, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>
                    {isExpense ? 'ฉุกคิดก่อนจ่าย ›' : 'บันทึกรายรับ'}
                  </div>
                </div>
              )}

              {addStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 36px)', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="press" onClick={addBack} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>ฉุกคิดก่อนจ่าย</div>
                    <div style={{ width: 38 }} />
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <div className="num" style={{ fontSize: 46, fontWeight: 600, color: 'var(--text)' }}><span className="baht" style={{ fontSize: '.72em' }}>฿</span>{fmtAmt(amount)}</div>
                    <div style={{ fontSize: 14, color: 'var(--mute)', marginTop: 2 }}>{selectedCatLabel}</div>
                  </div>

                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '28px 2px 4px' }}>ก่อนจ่าย ลองถามใจตัวเองดู</div>
                  <div style={{ fontSize: 13.5, color: 'var(--mute)', marginBottom: 14 }}>นี่คือเหตุผลที่อยากจ่ายเงินก้อนนี้?</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {REASON_DEFS.map(r => (
                      <div key={r.key} className="press" onClick={() => setReason(r.key)} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--surface)', border: `1.5px solid ${reason === r.key ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 15, padding: '14px 15px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{r.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 1 }}>{r.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showNudge && (
                    <div style={{ marginTop: 16, background: 'color-mix(in srgb, var(--warm) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--warm) 35%, transparent)', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warm)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>ลองหยุดคิดสัก 24 ชม.?</div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 8, lineHeight: 1.5 }}>ของที่ &quot;แค่อยากได้&quot; ส่วนใหญ่พอผ่านไป 1 วันก็ไม่อยากแล้ว ลองหยุดคิดดูก่อนนะ</div>
                    </div>
                  )}

                  <div style={{ flex: 1, minHeight: 18 }} />
                  <div className="press" onClick={commit} style={{ background: reason ? 'var(--accent)' : 'var(--track)', color: reason ? 'var(--onAccent)' : 'var(--faint)', borderRadius: 100, padding: 17, textAlign: 'center', fontSize: 16, fontWeight: 700, marginTop: 14 }}>ยืนยันบันทึก</div>
                </div>
              )}

              {addStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 36px)', flex: 1, textAlign: 'center' }}>
                  <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--onAccent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginTop: 24 }}>บันทึกแล้ว!</div>
                  <div className="num" style={{ fontSize: 34, fontWeight: 600, color: 'var(--text)', marginTop: 6 }}><span className="baht" style={{ fontSize: '.74em' }}>฿</span>{savedAmt}</div>
                  <div style={{ fontSize: 14, color: 'var(--mute)', marginTop: 10, lineHeight: 1.5, maxWidth: 250 }}>{savedMsg}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '9px 16px' }}>
                    <FireIcon size={18} />
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>บันทึกต่อเนื่อง {streakCount} วัน</span>
                  </div>
                  <div className="press" onClick={finishAdd} style={{ marginTop: 40, background: 'var(--accent)', color: 'var(--onAccent)', borderRadius: 100, padding: '16px 60px', fontSize: 16, fontWeight: 700 }}>เสร็จสิ้น</div>
                </div>
              )}
            </div>
          )}

          {screen === 'history' && (
            <div className="pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="press" onClick={() => go('home')} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>ประวัติรายการ</div>
              </div>

              {hasTx ? historyGroups.map(g => (
                <div key={g.key} style={{ marginTop: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mute)' }}>{g.label}</div>
                    <div className="num" style={{ fontSize: 13, color: 'var(--faint)' }}>{g.total}</div>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '4px 14px' }}>
                    {g.items.map(tx => (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: tx.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 15, flexShrink: 0 }}>{tx.mono}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>{tx.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 1 }}>{tx.time}</div>
                        </div>
                        <div className="num" style={{ fontSize: 15, fontWeight: 600, color: tx.amtColor }}>{tx.amt}</div>
                        <div className="press" onClick={() => deleteTx(tx.id)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', marginTop: 20, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 20 }}>
                  <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>ยังไม่มีประวัติ</div>
                  <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 6 }}>รายการที่บันทึกจะแสดงที่นี่</div>
                </div>
              )}
            </div>
          )}

          {screen === 'stats' && (
            <div className="pad">
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>สถิติ</div>

              <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--mute)' }}>ใช้จ่ายเดือนนี้</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
                  <div className="num" style={{ fontSize: 38, fontWeight: 600, color: 'var(--text)' }}><span className="baht" style={{ fontSize: '.6em' }}>฿</span>{fmt(monthExpenseN)}</div>
                  <div style={{ fontSize: 14, color: 'var(--faint)' }}>/ ฿{fmt(monthBudgetN)}</div>
                </div>
                <div style={{ height: 8, background: 'var(--track)', borderRadius: 100, marginTop: 14, overflow: 'hidden' }}><div style={{ height: '100%', width: monthPct + '%', background: ringColor, borderRadius: 100 }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--faint)', marginTop: 9 }}><span>ใช้ไป {monthPct}% ของงบเดือน</span><span style={{ color: 'var(--accent)' }}>{monthLeftLabel}</span></div>
              </div>

              {hasTx ? (
                <>
                  <div style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>รายจ่ายราย 7 วัน</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 9, height: 120, marginTop: 18 }}>
                      {weekBars.map((b, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ width: '100%', maxWidth: 22, height: b.h, minHeight: 4, background: b.fill, borderRadius: 7 }} />
                          <div style={{ fontSize: 11, color: b.lblColor }}>{b.d}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {catBreakdown.length > 0 && (
                    <div style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>จ่ายไปกับอะไรบ้าง</div>
                      {catBreakdown.map(c => (
                        <div key={c.label} style={{ padding: '11px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
                            <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{c.label}</span>
                            <span className="num" style={{ fontSize: 13.5, color: 'var(--mute)' }}>฿{c.amt}</span>
                            <span className="num" style={{ fontSize: 13, color: 'var(--faint)', width: 34, textAlign: 'right' }}>{c.pct}%</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--track)', borderRadius: 100, overflow: 'hidden' }}><div style={{ height: '100%', width: c.pct + '%', background: c.color, borderRadius: 100 }} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', marginTop: 14, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 20 }}>
                  <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>ยังไม่มีข้อมูลสถิติ</div>
                  <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 6 }}>บันทึกรายการเพื่อดูภาพรวมการใช้จ่าย</div>
                </div>
              )}
            </div>
          )}

          {screen === 'goals' && (
            <div className="pad">
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>เป้าหมายเก็บเงิน</div>

              <div style={{ marginTop: 16, background: 'var(--accent)', borderRadius: 20, padding: 20, color: 'var(--onAccent)' }}>
                <div style={{ fontSize: 13, opacity: .8 }}>ออมไปแล้วทั้งหมด</div>
                <div className="num" style={{ fontSize: 36, fontWeight: 700, marginTop: 2 }}><span className="baht" style={{ fontSize: '.6em' }}>฿</span>{fmt(totalSavedN)}</div>
                <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>จาก {data.goals.length} เป้าหมาย</div>
              </div>

              {goals.map(g => (
                <div key={g.id} style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 18 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
                      <svg width="74" height="74" viewBox="0 0 74 74">
                        <circle cx="37" cy="37" r="31" fill="none" stroke="var(--track)" strokeWidth="7" />
                        <circle cx="37" cy="37" r="31" fill="none" stroke={g.color} strokeWidth="7" strokeLinecap="round" strokeDasharray="194.8" strokeDashoffset={g.offset} transform="rotate(-90 37 37)" />
                      </svg>
                      <div className="num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{g.pct}%</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{g.title}</div>
                      <div className="num" style={{ fontSize: 13.5, color: 'var(--mute)', marginTop: 3 }}>{g.cur} / {g.target}</div>
                      <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{g.note}</div>
                    </div>
                  </div>
                  <div className="press" onClick={() => contribute(g.id)} style={{ marginTop: 14, background: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)', borderRadius: 100, padding: 11, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>+ ออมเพิ่ม ฿500</div>
                </div>
              ))}
            </div>
          )}

          {screen === 'profile' && (
            <div className="pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>โปรไฟล์</div>
                <div className="press" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '8px 14px', color: 'var(--text)' }}>
                  {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>ธีม</span>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--onAccent)' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>บัญชีของฉัน</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, background: 'color-mix(in srgb, var(--warm) 16%, transparent)', borderRadius: 100, padding: '4px 11px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warm)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{levelName}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                  <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--warm)' }}>{streakCount}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>วันติดต่อกัน</div>
                </div>
                <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                  <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{short(totalSavedN)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>ออมสะสม</div>
                </div>
                <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 14 }}>
                  <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{noSpendDays}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>วันไม่จ่าย</div>
                </div>
              </div>

              <div style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>งบใช้จ่ายต่อวัน</div>
                    <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>ตั้งวงเงินที่ใช้ได้ในแต่ละวัน</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="press" onClick={() => setBudget(-50)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--track)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>−</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', minWidth: 64, textAlign: 'center' }}>฿{fmt(budget)}</div>
                    <div className="press" onClick={() => setBudget(50)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--onAccent)', fontSize: 20, fontWeight: 600 }}>+</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>ชาเลนจ์ที่กำลังทำ</div>
                  <span style={{ fontSize: 11, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 16%, transparent)', borderRadius: 100, padding: '3px 9px', fontWeight: 600 }}>กำลังทำ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 13 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: 'color-mix(in srgb, var(--warm) 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warm)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>No-spend Weekend</div>
                    <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 1 }}>ไม่ใช้เงินฟุ่มเฟือยช่วงสุดสัปดาห์</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '24px 2px 12px' }}>รางวัล</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {badgeDefs.map(b => (
                  <div key={b.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 8px', textAlign: 'center' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: b.earned ? `color-mix(in srgb, ${b.color} 22%, transparent)` : 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill={b.earned ? b.color : t.faint}><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.3 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 8, lineHeight: 1.3 }}>{b.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="press" onClick={seedDemo} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>ใส่ข้อมูลตัวอย่าง</span>
                  <span style={{ color: 'var(--faint)', fontSize: 12 }}>ลองเล่นก่อน</span>
                </div>
                <div className="press" onClick={resetAll} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#E0795B', textAlign: 'center' }}>ล้างข้อมูลทั้งหมด</div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 18, lineHeight: 1.6 }}>ออมมือ · ข้อมูลถูกเก็บไว้ในเครื่องของคุณเท่านั้น<br />เพิ่มลงหน้าจอโฮมเพื่อใช้เหมือนแอป</div>
            </div>
          )}
        </div>

        {screen !== 'add' && (
          <div className="tabbar">
            <div className="tab press" onClick={() => go('home')} style={{ color: tint('home') }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
              <span>หน้าแรก</span>
            </div>
            <div className="tab press" onClick={() => go('stats')} style={{ color: tint('stats') }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
              <span>สถิติ</span>
            </div>
            <div className="fab press" onClick={goAdd}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--onAccent)" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <div className="tab press" onClick={() => go('goals')} style={{ color: tint('goals') }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>
              <span>เป้าหมาย</span>
            </div>
            <div className="tab press" onClick={() => go('profile')} style={{ color: tint('profile') }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
              <span>โปรไฟล์</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FireIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--warm)"><path d="M12 2c1 3-1.5 4.5-1.5 7 0 1.4 1 2.2 1 2.2s.8-1 .6-2.6c1.8 1.2 3.4 3.2 3.4 5.6a5.5 5.5 0 1 1-11 0c0-2.7 2-4.4 2.5-6.4C9 7 10.5 4.5 12 2z" /></svg>
}

function SunIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
}

function MoonIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
}
