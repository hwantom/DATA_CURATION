/* ============================================================
   업무 종합 대시보드 – script.js v4
   제작: 민승환 (202101308)
   ============================================================ */

const $ = id => document.getElementById(id);

/* ──────────────────────────────
   날짜 유틸
────────────────────────────── */
function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(n) {
  const d = new Date(); d.setDate(d.getDate()+n); return toStr(d);
}
function diffDays(ds) {
  return Math.round((new Date(ds) - new Date(TODAY)) / 86400000);
}
function korDate(ds) {
  const [y,m,d] = ds.split('-');
  const w = ['일','월','화','수','목','금','토'][new Date(ds).getDay()];
  return `${y}년 ${m}월 ${d}일 (${w})`;
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const TODAY = toStr(new Date());

/* ──────────────────────────────
   사이드바 토글
────────────────────────────── */
const sidebar   = $('sidebar');
const sbToggle  = $('sbToggle');
const hamburger = $('hamburger');
const sbOverlay = $('sbOverlay');

sbToggle.addEventListener('click', () => {
  const collapsed = sidebar.classList.toggle('collapsed');
  sbToggle.title  = collapsed ? '사이드바 펼치기' : '사이드바 접기';
  // 바 차트는 너비 변화에 반응
  setTimeout(() => { const s = computeStats(); drawBarChart(s); }, 240);
});

hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('mobile-open');
  sbOverlay.classList.toggle('open');
});
sbOverlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  sbOverlay.classList.remove('open');
});

/* ──────────────────────────────
   실시간 시계
────────────────────────────── */
function tick() {
  const n = new Date(), p = v => String(v).padStart(2,'0');
  $('tbClock').textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
  $('tbDate').textContent  = korDate(TODAY);
}
tick();
setInterval(tick, 1000);

/* ──────────────────────────────
   D-Day 데이터
────────────────────────────── */
const DDAY_KEY = 'ddayData_v4';

function defaultDday() {
  return [
    { id:1, name:'기획안 초안 작성',       deadline:addDays(2),  importance:'high',   status:'progress' },
    { id:2, name:'발표 자료 제작',          deadline:addDays(5),  importance:'high',   status:'waiting'  },
    { id:3, name:'데이터 분석 보고서 정리', deadline:addDays(0),  importance:'medium', status:'progress' },
    { id:4, name:'팀 회의 준비',            deadline:addDays(-1), importance:'low',    status:'done'     },
    { id:5, name:'최종 제출 파일 압축',     deadline:addDays(7),  importance:'medium', status:'waiting'  },
  ];
}
function loadDday() {
  try { const s = localStorage.getItem(DDAY_KEY); if (s) return JSON.parse(s); } catch(e) {}
  const d = defaultDday();
  try { localStorage.setItem(DDAY_KEY, JSON.stringify(d)); } catch(e) {}
  return d;
}

/* ──────────────────────────────
   오늘 업무 데이터
────────────────────────────── */
const TASK_KEY = `tasks_${TODAY}`;

function defaultTasks() {
  const t = Date.now();
  return [
    { id:t-2, text:'이메일 확인 및 회신',   done:false },
    { id:t-1, text:'오전 스크럼 미팅 참석', done:false },
    { id:t,   text:'기획안 피드백 반영',    done:true  },
  ];
}
function loadTasks() {
  try { const s = localStorage.getItem(TASK_KEY); if (s) return JSON.parse(s); } catch(e) {}
  const d = defaultTasks();
  try { localStorage.setItem(TASK_KEY, JSON.stringify(d)); } catch(e) {}
  return d;
}
function saveTasks(t) {
  try { localStorage.setItem(TASK_KEY, JSON.stringify(t)); } catch(e) {}
}

/* 오늘 완료율을 저장 (캘린더에서 참조) */
function saveDailyPct() {
  const tasks = loadTasks();
  const done  = tasks.filter(t => t.done).length;
  const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  try { localStorage.setItem(`daily_${TODAY}`, pct); } catch(e) {}
}

/* ──────────────────────────────
   통계 계산
────────────────────────────── */
function computeStats() {
  const dday  = loadDday();
  const tasks = loadTasks();
  const all   = [
    ...dday.map(t => ({ status: t.status })),
    ...tasks.map(t => ({ status: t.done ? 'done' : 'progress' })),
  ];
  const total   = all.length;
  const done    = all.filter(i => i.status === 'done').length;
  const inProg  = all.filter(i => i.status === 'progress').length;
  const waiting = all.filter(i => i.status === 'waiting').length;
  const urgent  = dday.filter(t => { const d = diffDays(t.deadline); return d >= 0 && d <= 3 && t.status !== 'done'; }).length;
  const pct     = total ? Math.round(done / total * 100) : 0;
  return { total, done, inProg, waiting, urgent, pct };
}

function renderStats() {
  const s = computeStats();
  $('stTotal').textContent   = s.total;
  $('stDone').textContent    = s.done;
  $('stProg').textContent    = s.inProg;
  $('stUrgent').textContent  = s.urgent;
  $('doneBadge').textContent = `완료율 ${s.pct}%`;
  $('sbTotal').textContent   = s.total;
  $('sbDone').textContent    = s.done;
  $('sbUrgent').textContent  = s.urgent;
  $('overallPct').textContent = `${s.pct}%`;
  $('donutPct').textContent   = `${s.pct}%`;
  $('statusChips').innerHTML = `
    <div class="chip chip-w">⏳ 대기 ${s.waiting}</div>
    <div class="chip chip-p">🔄 진행 ${s.inProg}</div>
    <div class="chip chip-d">✅ 완료 ${s.done}</div>
  `;
  updateProductivity();
  drawBarChart(s);
  drawDonutChart(s);
  renderCalendar();  // 캘린더도 갱신
}

/* ──────────────────────────────
   D-Day 렌더
────────────────────────────── */
function renderDday() {
  const data = loadDday();
  const grid = $('ddayGrid'), pill = $('ddayPill');
  if (!grid || !pill) return;
  pill.textContent = `${data.length}건`;
  grid.innerHTML   = '';
  const iC={high:'dd-hi',medium:'dd-me',low:'dd-lo'}, iL={high:'높음',medium:'보통',low:'낮음'};
  const sC={waiting:'st-w',progress:'st-p',done:'st-d'}, sL={waiting:'대기 중',progress:'진행 중',done:'완료'};
  data.forEach(t => {
    const diff   = diffDays(t.deadline);
    const numTxt = diff===0?'D-Day':diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;
    const numCls = diff===0?'dday-today':diff<0?'dday-past':diff<=3?'dday-near':'dday-upcoming';
    const el = document.createElement('div');
    el.className = 'dd-card';
    el.innerHTML = `
      <span class="dd-imp ${iC[t.importance]||'dd-me'}">${iL[t.importance]||'보통'}</span>
      <div class="dd-name">${esc(t.name)}</div>
      <div class="dd-deadline">마감: ${t.deadline}</div>
      <div class="dd-num ${numCls}">${numTxt}</div>
      <span class="dd-st ${sC[t.status]||'st-w'}">${sL[t.status]||'대기 중'}</span>
    `;
    grid.appendChild(el);
  });
}

/* ──────────────────────────────
   오늘 업무 렌더
────────────────────────────── */
function renderTasks() {
  const tasks = loadTasks(), list = $('taskList');
  if (!list) return;
  const done = tasks.filter(t => t.done).length;
  const pct  = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $('compPill').textContent = `${pct}%`;
  $('todayBar').style.width = `${pct}%`;
  saveDailyPct();  // 캘린더용 저장

  list.innerHTML = '';
  if (!tasks.length) { list.innerHTML = `<li class="t-empty">업무가 없습니다. 위에서 추가해보세요!</li>`; return; }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `titem${task.done?' done':''}`;
    li.innerHTML = `
      <input type="checkbox" class="t-chk" data-id="${task.id}" ${task.done?'checked':''}/>
      <span class="t-txt">${esc(task.text)}</span>
      <button class="t-del" data-id="${task.id}">✕</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.t-chk').forEach(cb => {
    cb.addEventListener('change', () => {
      const ts = loadTasks(), t = ts.find(x => x.id==cb.dataset.id);
      if (t) t.done = cb.checked;
      saveTasks(ts);
      renderTasks(); renderStats(); renderPriority();
    });
  });
  list.querySelectorAll('.t-del').forEach(btn => {
    btn.addEventListener('click', () => {
      saveTasks(loadTasks().filter(x => x.id!=btn.dataset.id));
      renderTasks(); renderStats(); renderPriority();
    });
  });
}

$('addTaskBtn').addEventListener('click', addTask);
$('taskInput').addEventListener('keydown', e => { if (e.key==='Enter') addTask(); });

function addTask() {
  const inp = $('taskInput'), text = inp.value.trim();
  if (!text) return;
  const ts = loadTasks();
  ts.push({ id:Date.now(), text, done:false });
  saveTasks(ts); inp.value = '';
  renderTasks(); renderStats(); renderPriority();
}

/* ──────────────────────────────
   우선순위 TOP 3
────────────────────────────── */
function renderPriority() {
  const undone = loadTasks().filter(t => !t.done), el = $('priorityList');
  if (!el) return;
  if (!undone.length) { el.innerHTML = `<p class="pri-empty">미완료 업무 없음 🎉</p>`; return; }
  const medals=['🥇','🥈','🥉'], rkCls=['rk1','rk2','rk3'];
  el.innerHTML = '';
  undone.slice(0,3).forEach((t,i) => {
    const div = document.createElement('div');
    div.className = 'pri-item';
    div.innerHTML = `<div class="pri-rank ${rkCls[i]}">${medals[i]}</div><div class="pri-txt">${esc(t.text)}</div><span class="pill pill-b">TOP ${i+1}</span>`;
    el.appendChild(div);
  });
}

/* ══════════════════════════════════════
   📆 주간 캘린더 (일별 도넛 차트)
══════════════════════════════════════ */

let calOffset = 0; // 0=이번 주, -1=지난 주, ...

/* 주의 월~일 날짜 배열 반환 */
function getWeekDays(offset) {
  const today  = new Date();
  const dow    = today.getDay(); // 0=일, 1=월 ...
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return Array.from({length:7}, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return toStr(d);
  });
}

/* 날짜별 완료율 조회 (localStorage 우선, 없으면 결정론적 목 데이터) */
function getDayPct(dateStr) {
  if (dateStr > TODAY) return -1; // 미래
  const stored = localStorage.getItem(`daily_${dateStr}`);
  if (stored !== null) return Math.min(100, Math.max(0, parseInt(stored)));
  // 결정론적 목 데이터: 날짜 문자열 해시
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) { h = ((h << 5) - h) + dateStr.charCodeAt(i); h |= 0; }
  return 35 + Math.abs(h % 60); // 35~94%
}

/* 완료율에 따른 색상 */
function pctColor(pct) {
  if (pct >= 80) return '#10B981';
  if (pct >= 60) return '#4A6CF7';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

/* SVG 도넛 차트 생성 (r=15.9155 → 둘레≈100) */
function svgDonut(pct, isToday, isFuture) {
  const R = 15.9155;

  if (isFuture) {
    return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="${R}" fill="none" stroke="#E2E8F0" stroke-width="3.8"/>
      <text x="18" y="21" text-anchor="middle" dominant-baseline="middle"
            font-size="8" fill="#CBD5E1" font-weight="600" font-family="-apple-system,sans-serif">–</text>
    </svg>`;
  }

  const color  = pctColor(pct);
  const filled = Math.max(pct, 0);
  const empty  = 100 - filled;
  const txtColor = isToday ? '#4A6CF7' : '#1E293B';
  const txtSize  = pct >= 100 ? 7 : 8;

  return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="${R}" fill="none" stroke="#E2E8F0" stroke-width="3.8"/>
    ${filled > 0 ? `<circle cx="18" cy="18" r="${R}" fill="none"
      stroke="${color}" stroke-width="3.8"
      stroke-dasharray="${filled} ${empty}"
      stroke-linecap="round"
      transform="rotate(-90 18 18)"/>` : ''}
    <text x="18" y="20" text-anchor="middle"
          font-size="${txtSize}" fill="${pct===0?'#CBD5E1':txtColor}"
          font-weight="700" font-family="-apple-system,sans-serif">${pct}%</text>
  </svg>`;
}

/* 캘린더 렌더 */
function renderCalendar() {
  const grid = $('calGrid');
  if (!grid) return;

  const days     = getWeekDays(calOffset);
  const dayNames = ['월','화','수','목','금','토','일'];

  // 헤더 라벨 업데이트
  const [sy, sm] = days[0].split('-');
  const [ey, em] = days[6].split('-');
  const mNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  $('calMonthLabel').textContent = sm === em
    ? `${sy}년 ${mNames[parseInt(sm)-1]}`
    : `${sy}년 ${mNames[parseInt(sm)-1]} ~ ${mNames[parseInt(em)-1]}`;

  // 주 라벨
  const weekTxt = $('calWeekTxt');
  if (weekTxt) {
    if (calOffset === 0)       weekTxt.textContent = '이번 주';
    else if (calOffset === -1) weekTxt.textContent = '지난 주';
    else {
      const [,sm2,sd2] = days[0].split('-');
      const [,em2,ed2] = days[6].split('-');
      weekTxt.textContent = sm2===em2 ? `${parseInt(sd2)}~${parseInt(ed2)}일` : `${parseInt(sm2)}/${parseInt(sd2)}~${parseInt(em2)}/${parseInt(ed2)}`;
    }
  }

  // 다음 주 버튼 비활성화 (현재 주 이후는 의미 없음)
  const nextBtn = $('calNext');
  if (nextBtn) nextBtn.disabled = (calOffset >= 0);

  grid.innerHTML = '';

  days.forEach((dateStr, i) => {
    const isToday  = (dateStr === TODAY);
    const isFuture = (dateStr > TODAY);
    const pct      = isToday
      ? (() => { const ts=loadTasks(); const d=ts.filter(t=>t.done).length; return ts.length?Math.round(d/ts.length*100):0; })()
      : getDayPct(dateStr);

    const dateNum = parseInt(dateStr.split('-')[2]);
    const isSat   = (i === 5);
    const isSun   = (i === 6);

    const cell = document.createElement('div');
    cell.className = `cal-day${isToday?' is-today':''}${isFuture?' is-future':''}`;

    cell.innerHTML = `
      <span class="cal-day-name${isSat?' sat':isSun?' sun':''}">${dayNames[i]}</span>
      <span class="cal-date-num">${dateNum}</span>
      <div class="cal-donut">${svgDonut(pct, isToday, isFuture)}</div>
      ${isToday ? '<span class="today-badge">TODAY</span>' : ''}
    `;
    grid.appendChild(cell);
  });
}

/* 캘린더 이전/다음 주 버튼 */
$('calPrev').addEventListener('click', () => { calOffset--; renderCalendar(); });
$('calNext').addEventListener('click', () => { if (calOffset < 0) { calOffset++; renderCalendar(); } });

/* ──────────────────────────────
   바 차트 (Canvas)
────────────────────────────── */
function setupCanvas(id, cssW, cssH) {
  const c = $(id); if (!c) return null;
  const dpr = window.devicePixelRatio || 1;
  c.width = cssW*dpr; c.height = cssH*dpr;
  c.style.width = cssW+'px'; c.style.height = cssH+'px';
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  return { ctx, W:cssW, H:cssH };
}

function drawBarChart(s) {
  const el = $('barChart'); if (!el) return;
  const cssW = el.parentElement.clientWidth || 160;
  const cssH = 80;
  const r = setupCanvas('barChart', cssW, cssH); if (!r) return;
  const { ctx, W, H } = r;

  const vals=[s.waiting,s.inProg,s.done], labels=['대기','진행','완료'], colors=['#E2E8F0','#4A6CF7','#10B981'];
  const maxV=Math.max(...vals,1), pad={t:12,r:8,b:22,l:8};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b, slot=cW/vals.length, bW=slot*.52;

  vals.forEach((v,i) => {
    const x=pad.l+i*slot+(slot-bW)/2, bH=Math.max(v/maxV*cH,2), y=pad.t+cH-bH, rc=3;
    ctx.beginPath(); ctx.moveTo(x+rc,y); ctx.lineTo(x+bW-rc,y); ctx.quadraticCurveTo(x+bW,y,x+bW,y+rc);
    ctx.lineTo(x+bW,y+bH); ctx.lineTo(x,y+bH); ctx.lineTo(x,y+rc); ctx.quadraticCurveTo(x,y,x+rc,y);
    ctx.closePath(); ctx.fillStyle=colors[i]; ctx.fill();
    ctx.fillStyle='#1E293B'; ctx.font='bold 10px -apple-system,sans-serif'; ctx.textAlign='center';
    ctx.fillText(v, x+bW/2, y-3);
    ctx.fillStyle='#94A3B8'; ctx.font='9px -apple-system,sans-serif';
    ctx.fillText(labels[i], x+bW/2, H-pad.b+14);
  });
}

function drawDonutChart(s) {
  const c = $('donutChart'); if (!c) return;
  const ctx=c.getContext('2d'), W=c.width, H=c.height;
  ctx.clearRect(0,0,W,H);
  const cx=W/2, cy=H/2, r=Math.min(W,H)/2-6, ir=r*.6, tot=s.total||1;
  const segs=[{v:s.done,c:'#4A6CF7'},{v:s.inProg,c:'#06B6D4'},{v:s.waiting,c:'#E2E8F0'}];
  let angle=-Math.PI/2;
  segs.forEach(seg => {
    const sw=(seg.v/tot)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+sw); ctx.closePath();
    ctx.fillStyle=seg.c; ctx.fill(); angle+=sw;
  });
  ctx.beginPath(); ctx.arc(cx,cy,ir,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
}

/* ──────────────────────────────
   생산성 점수
────────────────────────────── */
let timerCycles = 0;

function updateProductivity() {
  const tasks = loadTasks(), done = tasks.filter(t=>t.done).length;
  const score = Math.round((tasks.length?done/tasks.length:0)*70)
              + Math.min(timerCycles*5, 20)
              + (localStorage.getItem('workNote')?10:0);
  $('prodScore').textContent = score;
}

/* ──────────────────────────────
   집중 타이머
────────────────────────────── */
let timerSec=25*60, timerMin=25, timerRunning=false, timerHandle=null;
const tipMap={25:'집중 모드: 25분 업무 몰입',10:'휴식 모드: 10분 충분히 쉬어요',5:'짧은 휴식: 5분 스트레칭'};

function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function setTimerDisp() { const d=$('timerDisplay'); if(d) d.textContent=fmtTime(timerSec); }

document.querySelectorAll('.mbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerRunning) { clearInterval(timerHandle); timerRunning=false; }
    document.querySelectorAll('.mbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    timerMin=parseInt(btn.dataset.mode); timerSec=timerMin*60;
    const d=$('timerDisplay'); if(d) d.classList.remove('running','finished');
    const t=$('timerTip'); if(t) t.textContent=tipMap[timerMin]||'';
    setTimerDisp();
  });
});

$('timerStart').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning=true;
  const d=$('timerDisplay'); if(d){d.classList.add('running');d.classList.remove('finished');}
  timerHandle=setInterval(()=>{
    timerSec--;setTimerDisp();
    if(timerSec<=0){
      clearInterval(timerHandle);timerRunning=false;timerCycles++;
      if(d){d.classList.remove('running');d.classList.add('finished');}
      const p=$('cyclePill');if(p)p.textContent=`🍅 ${timerCycles}사이클`;
      const t=$('timerTip');if(t)t.textContent='완료! 잠깐 쉬어가세요 🎉';
      updateProductivity();
    }
  },1000);
});
$('timerPause').addEventListener('click',()=>{clearInterval(timerHandle);timerRunning=false;const d=$('timerDisplay');if(d)d.classList.remove('running');});
$('timerReset').addEventListener('click',()=>{clearInterval(timerHandle);timerRunning=false;timerSec=timerMin*60;const d=$('timerDisplay');if(d)d.classList.remove('running','finished');const t=$('timerTip');if(t)t.textContent=tipMap[timerMin]||'';setTimerDisp();});

/* ──────────────────────────────
   퇴근 노트
────────────────────────────── */
const NOTE_KEY='workNote', DATE_KEY='workNoteDate';

(function loadNote(){
  const ta=document.getElementById('workNote');
  const saved=localStorage.getItem(NOTE_KEY), dated=localStorage.getItem(DATE_KEY);
  if(ta&&saved&&dated===TODAY) ta.value=saved;
})();

$('saveNoteBtn').addEventListener('click',()=>{
  const ta=document.getElementById('workNote'), bdg=$('saveBadge');
  if(!ta) return;
  try{localStorage.setItem(NOTE_KEY,ta.value);localStorage.setItem(DATE_KEY,TODAY);}catch(e){}
  if(bdg){bdg.textContent='✔ 저장됨';setTimeout(()=>bdg.textContent='',2500);}
  renderYesterday();updateProductivity();
});
$('clearNoteBtn').addEventListener('click',()=>{
  const ta=document.getElementById('workNote'), bdg=$('saveBadge');
  if(ta) ta.value='';
  try{localStorage.removeItem(NOTE_KEY);localStorage.removeItem(DATE_KEY);}catch(e){}
  if(bdg){bdg.textContent='🗑 초기화됨';setTimeout(()=>bdg.textContent='',2500);}
});

/* ──────────────────────────────
   어제 리마인드
────────────────────────────── */
function ydayStr(){const d=new Date();d.setDate(d.getDate()-1);return toStr(d);}

function renderYesterday(){
  const savedDate=localStorage.getItem(DATE_KEY), savedNote=localStorage.getItem(NOTE_KEY);
  const yd=ydayStr(), hasYd=savedDate===yd&&savedNote&&savedNote.trim();
  const ybox=$('yesterdayBox'), rbox=$('recommendBox');
  if(!ybox||!rbox) return;
  if(hasYd){
    ybox.innerHTML=`<div class="ybox"><div class="y-date">📌 ${korDate(yd)}</div>${esc(savedNote)}</div>`;
    rbox.innerHTML=`<div class="rec-box"><div class="rec-ttl">💡 오늘 이어서 진행할 업무</div><p class="rec-txt">어제 작성한 내용을 참고해 오늘 업무를 이어가세요!</p><div class="rec-content">${esc(savedNote)}</div></div>`;
  } else {
    ybox.innerHTML=`<div class="ybox"><span class="y-empty">저장된 이전 업무 노트가 없습니다.</span></div>`;
    rbox.innerHTML=`<div class="rec-box"><div class="rec-ttl">💡 오늘의 업무 추천</div><p class="rec-txt">퇴근 노트를 저장하면 다음 날 어제 내용을 바탕으로 업무를 추천해드려요.</p></div>`;
  }
}

/* ──────────────────────────────
   사이드바 네비게이션
────────────────────────────── */
document.querySelectorAll('.nav-it').forEach(item=>{
  item.addEventListener('click',()=>{
    document.querySelectorAll('.nav-it').forEach(i=>i.classList.remove('active'));
    item.classList.add('active');
    const target=$(item.dataset.target);
    if(target) target.scrollIntoView({behavior:'smooth',block:'nearest'});
    sidebar.classList.remove('mobile-open');
    sbOverlay.classList.remove('open');
  });
});

/* ──────────────────────────────
   리사이즈
────────────────────────────── */
let rzTimer;
window.addEventListener('resize',()=>{clearTimeout(rzTimer);rzTimer=setTimeout(()=>{const s=computeStats();drawBarChart(s);},150);});

/* ──────────────────────────────
   초기 렌더
────────────────────────────── */
saveDailyPct();   // 오늘 데이터 초기 저장
renderDday();
renderTasks();
renderPriority();
renderYesterday();
renderStats();    // drawBarChart + drawDonutChart + renderCalendar 포함
