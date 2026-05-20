/* ============================================================
   업무 종합 대시보드 – script.js v3
   제작: 민승환 (202101308)
   ============================================================ */

/* ── 유틸 ── */
const $ = id => document.getElementById(id);

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

/* ══════════════════════════════════════
   사이드바 토글
══════════════════════════════════════ */
const sidebar   = $('sidebar');
const sbToggle  = $('sbToggle');
const hamburger = $('hamburger');

// 모바일용 오버레이 동적 생성
const overlay = document.createElement('div');
overlay.className = 'sb-overlay';
overlay.id = 'sbOverlay';
document.body.appendChild(overlay);

// 데스크톱: 사이드바 접기/펼치기 (너비 변환)
sbToggle.addEventListener('click', () => {
  const collapsed = sidebar.classList.toggle('collapsed');
  sbToggle.title  = collapsed ? '사이드바 펼치기' : '사이드바 접기';
  // 차트 재그리기 (너비가 바뀌므로)
  setTimeout(() => { const s = computeStats(); drawAreaChart(s); drawBarChart(s); }, 240);
});

// 모바일: 햄버거 메뉴
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('open');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('open');
});

/* ══════════════════════════════════════
   시계
══════════════════════════════════════ */
function tick() {
  const n = new Date();
  const p = v => String(v).padStart(2,'0');
  $('tbClock').textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
  $('tbDate').textContent  = korDate(TODAY);
}
tick();
setInterval(tick, 1000);

/* ══════════════════════════════════════
   D-Day 데이터
══════════════════════════════════════ */
const DDAY_KEY = 'ddayData_v3';

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
  try {
    const s = localStorage.getItem(DDAY_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  const d = defaultDday();
  try { localStorage.setItem(DDAY_KEY, JSON.stringify(d)); } catch(e) {}
  return d;
}

/* ══════════════════════════════════════
   오늘 업무 데이터
══════════════════════════════════════ */
const TASK_KEY = `tasks_${TODAY}`;

function defaultTasks() {
  const t = Date.now();
  return [
    { id: t-2, text:'이메일 확인 및 회신',   done:false },
    { id: t-1, text:'오전 스크럼 미팅 참석', done:false },
    { id: t,   text:'기획안 피드백 반영',    done:true  },
  ];
}

function loadTasks() {
  try {
    const s = localStorage.getItem(TASK_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  const d = defaultTasks();
  try { localStorage.setItem(TASK_KEY, JSON.stringify(d)); } catch(e) {}
  return d;
}

function saveTasks(t) {
  try { localStorage.setItem(TASK_KEY, JSON.stringify(t)); } catch(e) {}
}

/* ══════════════════════════════════════
   통계 계산
══════════════════════════════════════ */
function computeStats() {
  const dday  = loadDday();
  const tasks = loadTasks();

  const all     = [
    ...dday.map(t => ({ status: t.status })),
    ...tasks.map(t => ({ status: t.done ? 'done' : 'progress' })),
  ];
  const total   = all.length;
  const done    = all.filter(i => i.status === 'done').length;
  const inProg  = all.filter(i => i.status === 'progress').length;
  const waiting = all.filter(i => i.status === 'waiting').length;
  const urgent  = dday.filter(t => {
    const d = diffDays(t.deadline);
    return d >= 0 && d <= 3 && t.status !== 'done';
  }).length;
  const pct = total ? Math.round(done / total * 100) : 0;

  return { total, done, inProg, waiting, urgent, pct };
}

/* ══════════════════════════════════════
   통계 렌더
══════════════════════════════════════ */
function renderStats() {
  const s = computeStats();

  $('stTotal').textContent  = s.total;
  $('stDone').textContent   = s.done;
  $('stProg').textContent   = s.inProg;
  $('stUrgent').textContent = s.urgent;
  $('doneBadge').textContent = `완료율 ${s.pct}%`;

  $('sbTotal').textContent  = s.total;
  $('sbDone').textContent   = s.done;
  $('sbUrgent').textContent = s.urgent;

  $('overallPct').textContent = `${s.pct}%`;
  $('donutPct').textContent   = `${s.pct}%`;

  $('statusChips').innerHTML = `
    <div class="chip chip-w">⏳ 대기 ${s.waiting}</div>
    <div class="chip chip-p">🔄 진행 ${s.inProg}</div>
    <div class="chip chip-d">✅ 완료 ${s.done}</div>
  `;

  updateProductivity();
  drawAllCharts(s);
}

/* ══════════════════════════════════════
   D-Day 렌더
══════════════════════════════════════ */
function renderDday() {
  const data = loadDday();
  const grid = $('ddayGrid');
  const pill = $('ddayPill');
  if (!grid || !pill) return;

  pill.textContent = `${data.length}건`;
  grid.innerHTML   = '';

  const impC = { high:'dd-hi', medium:'dd-me', low:'dd-lo' };
  const impL = { high:'높음', medium:'보통', low:'낮음' };
  const stC  = { waiting:'st-w', progress:'st-p', done:'st-d' };
  const stL  = { waiting:'대기 중', progress:'진행 중', done:'완료' };

  data.forEach(t => {
    const diff   = diffDays(t.deadline);
    const numTxt = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
    const numCls = diff === 0 ? 'dday-today' : diff < 0 ? 'dday-past' : diff <= 3 ? 'dday-near' : 'dday-upcoming';

    const el = document.createElement('div');
    el.className = 'dd-card';
    el.innerHTML = `
      <span class="dd-imp ${impC[t.importance]||'dd-me'}">${impL[t.importance]||'보통'}</span>
      <div class="dd-name">${esc(t.name)}</div>
      <div class="dd-deadline">마감: ${t.deadline}</div>
      <div class="dd-num ${numCls}">${numTxt}</div>
      <span class="dd-st ${stC[t.status]||'st-w'}">${stL[t.status]||'대기 중'}</span>
    `;
    grid.appendChild(el);
  });
}

/* ══════════════════════════════════════
   오늘 업무 렌더
══════════════════════════════════════ */
function renderTasks() {
  const tasks = loadTasks();
  const list  = $('taskList');
  if (!list) return;

  const done = tasks.filter(t => t.done).length;
  const pct  = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  $('compPill').textContent  = `${pct}%`;
  $('todayBar').style.width  = `${pct}%`;

  list.innerHTML = '';
  if (!tasks.length) {
    list.innerHTML = `<li class="t-empty">업무가 없습니다. 위에서 추가해보세요!</li>`;
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `titem${task.done ? ' done' : ''}`;
    li.innerHTML = `
      <input type="checkbox" class="t-chk" data-id="${task.id}" ${task.done ? 'checked' : ''}/>
      <span class="t-txt">${esc(task.text)}</span>
      <button class="t-del" data-id="${task.id}" title="삭제">✕</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.t-chk').forEach(cb => {
    cb.addEventListener('change', () => {
      const ts = loadTasks();
      const t  = ts.find(x => x.id == cb.dataset.id);
      if (t) t.done = cb.checked;
      saveTasks(ts);
      renderTasks(); renderStats(); renderPriority();
    });
  });

  list.querySelectorAll('.t-del').forEach(btn => {
    btn.addEventListener('click', () => {
      saveTasks(loadTasks().filter(x => x.id != btn.dataset.id));
      renderTasks(); renderStats(); renderPriority();
    });
  });
}

$('addTaskBtn').addEventListener('click', addTask);
$('taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

function addTask() {
  const inp  = $('taskInput');
  const text = inp.value.trim();
  if (!text) return;
  const ts = loadTasks();
  ts.push({ id: Date.now(), text, done: false });
  saveTasks(ts);
  inp.value = '';
  renderTasks(); renderStats(); renderPriority();
}

/* ══════════════════════════════════════
   우선순위 TOP 3
══════════════════════════════════════ */
function renderPriority() {
  const undone = loadTasks().filter(t => !t.done);
  const el     = $('priorityList');
  if (!el) return;

  if (!undone.length) {
    el.innerHTML = `<p class="pri-empty">미완료 업무 없음 🎉</p>`;
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  const rkCls  = ['rk1','rk2','rk3'];
  el.innerHTML = '';
  undone.slice(0,3).forEach((t,i) => {
    const div = document.createElement('div');
    div.className = 'pri-item';
    div.innerHTML = `
      <div class="pri-rank ${rkCls[i]}">${medals[i]}</div>
      <div class="pri-txt">${esc(t.text)}</div>
      <span class="pill pill-b">TOP ${i+1}</span>
    `;
    el.appendChild(div);
  });
}

/* ══════════════════════════════════════
   캔버스 공통
══════════════════════════════════════ */
function setupCanvas(id, cssW, cssH) {
  const c = $(id);
  if (!c) return null;
  const dpr   = window.devicePixelRatio || 1;
  c.width     = cssW * dpr;
  c.height    = cssH * dpr;
  c.style.width  = cssW + 'px';
  c.style.height = cssH + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W: cssW, H: cssH };
}

/* ── 에리어 차트 ── */
function drawAreaChart(s) {
  const el = $('areaChart');
  if (!el) return;
  const cssW = el.parentElement.clientWidth || 400;
  const cssH = 110;
  const r = setupCanvas('areaChart', cssW, cssH);
  if (!r) return;
  const { ctx, W, H } = r;

  const pad = { t:14, r:10, b:24, l:30 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;

  const labels = ['월','화','수','목','금','토','일'];
  const thisWk = [2, 4, 3, 6, 5, 7, Math.min(s.done + 1, 9)];
  const lastWk = [1, 3, 2, 4, 3, 5, 3];
  const maxV   = Math.max(...thisWk, ...lastWk, 1) + 1;

  const xOf = i => pad.l + (i / (labels.length - 1)) * cW;
  const yOf = v => pad.t + cH - (v / maxV) * cH;

  // 격자선
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (i / 3) * cH;
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px -apple-system,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxV * (1 - i / 3)), pad.l - 4, y + 3);
  }

  // X 라벨
  ctx.fillStyle = '#94A3B8'; ctx.font = '10px -apple-system,sans-serif'; ctx.textAlign = 'center';
  labels.forEach((l, i) => ctx.fillText(l, xOf(i), H - pad.b + 14));

  // 부드러운 라인+필
  function drawLine(data, lc, fc) {
    const pts = data.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i+1].x)/2, (pts[i].y + pts[i+1].y)/2);
    }
    ctx.quadraticCurveTo(pts[pts.length-2].x, pts[pts.length-2].y, pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.lineTo(pts[pts.length-1].x, pad.t + cH);
    ctx.lineTo(pts[0].x, pad.t + cH);
    ctx.closePath();
    ctx.fillStyle = fc; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i+1].x)/2, (pts[i].y + pts[i+1].y)/2);
    }
    ctx.quadraticCurveTo(pts[pts.length-2].x, pts[pts.length-2].y, pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.strokeStyle = lc; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fillStyle = lc; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
    });
  }

  const tg = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  tg.addColorStop(0, 'rgba(6,182,212,.18)'); tg.addColorStop(1, 'rgba(6,182,212,.01)');
  drawLine(lastWk, '#06B6D4', tg);

  const bg = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  bg.addColorStop(0, 'rgba(74,108,247,.26)'); bg.addColorStop(1, 'rgba(74,108,247,.01)');
  drawLine(thisWk, '#4A6CF7', bg);
}

/* ── 바 차트 ── */
function drawBarChart(s) {
  const el = $('barChart');
  if (!el) return;
  const cssW = el.parentElement.clientWidth || 160;
  const cssH = 80;
  const r = setupCanvas('barChart', cssW, cssH);
  if (!r) return;
  const { ctx, W, H } = r;

  const vals   = [s.waiting, s.inProg, s.done];
  const labels = ['대기','진행','완료'];
  const colors = ['#E2E8F0','#4A6CF7','#10B981'];
  const maxV   = Math.max(...vals, 1);
  const pad    = { t:12, r:8, b:22, l:8 };
  const cW     = W - pad.l - pad.r;
  const cH     = H - pad.t - pad.b;
  const slot   = cW / vals.length;
  const bW     = slot * 0.52;

  vals.forEach((v, i) => {
    const x  = pad.l + i * slot + (slot - bW) / 2;
    const bH = Math.max(v / maxV * cH, 2);
    const y  = pad.t + cH - bH;
    const rc = 3;

    ctx.beginPath();
    ctx.moveTo(x + rc, y);
    ctx.lineTo(x + bW - rc, y);
    ctx.quadraticCurveTo(x + bW, y, x + bW, y + rc);
    ctx.lineTo(x + bW, y + bH);
    ctx.lineTo(x, y + bH);
    ctx.lineTo(x, y + rc);
    ctx.quadraticCurveTo(x, y, x + rc, y);
    ctx.closePath();
    ctx.fillStyle = colors[i]; ctx.fill();

    ctx.fillStyle = '#1E293B'; ctx.font = 'bold 10px -apple-system,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v, x + bW / 2, y - 3);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px -apple-system,sans-serif';
    ctx.fillText(labels[i], x + bW / 2, H - pad.b + 14);
  });
}

/* ── 도넛 차트 ── */
function drawDonutChart(s) {
  const c = $('donutChart');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 6, ir = r * 0.6;
  const tot  = s.total || 1;
  const segs = [
    { v: s.done,    c: '#4A6CF7' },
    { v: s.inProg,  c: '#06B6D4' },
    { v: s.waiting, c: '#E2E8F0' },
  ];

  let angle = -Math.PI / 2;
  segs.forEach(seg => {
    const sw = (seg.v / tot) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sw); ctx.closePath();
    ctx.fillStyle = seg.c; ctx.fill();
    angle += sw;
  });
  ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
}

function drawAllCharts(s) {
  drawAreaChart(s);
  drawBarChart(s);
  drawDonutChart(s);
}

/* ══════════════════════════════════════
   생산성 점수
══════════════════════════════════════ */
let timerCycles = 0;

function updateProductivity() {
  const tasks = loadTasks();
  const done  = tasks.filter(t => t.done).length;
  const pct   = tasks.length ? done / tasks.length : 0;
  const score = Math.round(pct * 70)
              + Math.min(timerCycles * 5, 20)
              + (localStorage.getItem('workNote') ? 10 : 0);
  $('prodScore').textContent = score;
}

/* ══════════════════════════════════════
   집중 타이머
══════════════════════════════════════ */
let timerSec = 25*60, timerMin = 25, timerRunning = false, timerHandle = null;

const tipMap = { 25:'집중 모드: 25분 업무 몰입', 10:'휴식 모드: 10분 충분히 쉬어요', 5:'짧은 휴식: 5분 스트레칭' };

function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

function setTimerDisp() { const d=$('timerDisplay'); if(d) d.textContent=fmtTime(timerSec); }

document.querySelectorAll('.mbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerRunning) { clearInterval(timerHandle); timerRunning = false; }
    document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerMin = parseInt(btn.dataset.mode);
    timerSec = timerMin * 60;
    const d = $('timerDisplay');
    if (d) d.classList.remove('running','finished');
    const t = $('timerTip');
    if (t) t.textContent = tipMap[timerMin] || '';
    setTimerDisp();
  });
});

$('timerStart').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  const d = $('timerDisplay');
  if (d) { d.classList.add('running'); d.classList.remove('finished'); }
  timerHandle = setInterval(() => {
    timerSec--;
    setTimerDisp();
    if (timerSec <= 0) {
      clearInterval(timerHandle); timerRunning = false; timerCycles++;
      if (d) { d.classList.remove('running'); d.classList.add('finished'); }
      const p = $('cyclePill'); if (p) p.textContent = `🍅 ${timerCycles}사이클`;
      const t = $('timerTip'); if (t) t.textContent = '완료! 잠깐 쉬어가세요 🎉';
      updateProductivity();
    }
  }, 1000);
});

$('timerPause').addEventListener('click', () => {
  clearInterval(timerHandle); timerRunning = false;
  const d = $('timerDisplay'); if (d) d.classList.remove('running');
});

$('timerReset').addEventListener('click', () => {
  clearInterval(timerHandle); timerRunning = false;
  timerSec = timerMin * 60;
  const d = $('timerDisplay'); if (d) d.classList.remove('running','finished');
  const t = $('timerTip'); if (t) t.textContent = tipMap[timerMin] || '';
  setTimerDisp();
});

/* ══════════════════════════════════════
   퇴근 노트
══════════════════════════════════════ */
const NOTE_KEY = 'workNote';
const DATE_KEY = 'workNoteDate';

(function loadNote() {
  const ta    = $('workNote');
  const saved = localStorage.getItem(NOTE_KEY);
  const dated = localStorage.getItem(DATE_KEY);
  if (ta && saved && dated === TODAY) ta.value = saved;
})();

$('saveNoteBtn').addEventListener('click', () => {
  const ta  = $('workNote');
  const bdg = $('saveBadge');
  if (!ta) return;
  try { localStorage.setItem(NOTE_KEY, ta.value); localStorage.setItem(DATE_KEY, TODAY); } catch(e) {}
  if (bdg) { bdg.textContent = '✔ 저장됨'; setTimeout(() => bdg.textContent = '', 2500); }
  renderYesterday(); updateProductivity();
});

$('clearNoteBtn').addEventListener('click', () => {
  const ta  = $('workNote');
  const bdg = $('saveBadge');
  if (ta) ta.value = '';
  try { localStorage.removeItem(NOTE_KEY); localStorage.removeItem(DATE_KEY); } catch(e) {}
  if (bdg) { bdg.textContent = '🗑 초기화됨'; setTimeout(() => bdg.textContent = '', 2500); }
});

/* ══════════════════════════════════════
   어제 리마인드
══════════════════════════════════════ */
function ydayStr() { const d = new Date(); d.setDate(d.getDate()-1); return toStr(d); }

function renderYesterday() {
  const savedDate = localStorage.getItem(DATE_KEY);
  const savedNote = localStorage.getItem(NOTE_KEY);
  const yd        = ydayStr();
  const hasYd     = savedDate === yd && savedNote && savedNote.trim();

  const ybox = $('yesterdayBox');
  const rbox = $('recommendBox');
  if (!ybox || !rbox) return;

  if (hasYd) {
    ybox.innerHTML = `<div class="ybox"><div class="y-date">📌 ${korDate(yd)}</div>${esc(savedNote)}</div>`;
    rbox.innerHTML = `<div class="rec-box"><div class="rec-ttl">💡 오늘 이어서 진행할 업무</div><p class="rec-txt">어제 작성한 내용을 참고해 오늘 업무를 이어가세요!</p><div class="rec-content">${esc(savedNote)}</div></div>`;
  } else {
    ybox.innerHTML = `<div class="ybox"><span class="y-empty">저장된 이전 업무 노트가 없습니다.</span></div>`;
    rbox.innerHTML = `<div class="rec-box"><div class="rec-ttl">💡 오늘의 업무 추천</div><p class="rec-txt">퇴근 노트를 저장하면 다음 날 어제 내용을 바탕으로 업무를 추천해드려요.</p></div>`;
  }
}

/* ══════════════════════════════════════
   사이드바 네비게이션 클릭
══════════════════════════════════════ */
document.querySelectorAll('.nav-it').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-it').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const target = $(item.dataset.target);
    if (target) {
      // 모바일: 페이지 스크롤 / 데스크톱: 해당 요소로 스크롤
      const page = document.querySelector('.page');
      if (page && page.scrollHeight > page.clientHeight) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // 모바일 사이드바 닫기
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('open');
  });
});

/* ══════════════════════════════════════
   리사이즈 시 차트 재그리기
══════════════════════════════════════ */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const s = computeStats(); drawAreaChart(s); drawBarChart(s); }, 150);
});

/* ══════════════════════════════════════
   초기 렌더
══════════════════════════════════════ */
renderDday();
renderTasks();
renderPriority();
renderYesterday();
renderStats();  // 내부에서 drawAllCharts() 호출
