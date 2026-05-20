/* ============================================================
   업무 종합 대시보드 – script.js (v2)
   제작: 민승환 (202101308)
   ============================================================ */

/* ── 유틸 ── */
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
  const day = ['일','월','화','수','목','금','토'][new Date(ds).getDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
}
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function $(id) { return document.getElementById(id); }

const TODAY = toStr(new Date());

/* ── 실시간 시계 ── */
function tick() {
  const n = new Date();
  const pad = v => String(v).padStart(2,'0');
  $('tbClock').textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  $('tbDate').textContent  = korDate(TODAY);
}
tick();
setInterval(tick, 1000);

/* ── D-Day 데이터 ── */
const DDAY_KEY = 'ddayData_v2';

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
    const d = defaultDday();
    localStorage.setItem(DDAY_KEY, JSON.stringify(d));
    return d;
  } catch(e) { return defaultDday(); }
}

/* ── 오늘 업무 데이터 ── */
const TASK_KEY = `tasks_${TODAY}`;

function defaultTasks() {
  const now = Date.now();
  return [
    { id: now-2, text:'이메일 확인 및 회신',   done:false },
    { id: now-1, text:'오전 스크럼 미팅 참석', done:false },
    { id: now,   text:'기획안 피드백 반영',    done:true  },
  ];
}

function loadTasks() {
  try {
    const s = localStorage.getItem(TASK_KEY);
    if (s) return JSON.parse(s);
    const d = defaultTasks();
    localStorage.setItem(TASK_KEY, JSON.stringify(d));
    return d;
  } catch(e) { return defaultTasks(); }
}

function saveTasks(t) {
  try { localStorage.setItem(TASK_KEY, JSON.stringify(t)); } catch(e) {}
}

/* ── 통계 계산 ── */
function computeStats() {
  const dday  = loadDday();
  const tasks = loadTasks();

  const ddayItems  = dday.map(t => ({ status: t.status }));
  const taskItems  = tasks.map(t => ({ status: t.done ? 'done' : 'progress' }));
  const all        = [...ddayItems, ...taskItems];

  const total    = all.length;
  const done     = all.filter(i => i.status === 'done').length;
  const inProg   = all.filter(i => i.status === 'progress').length;
  const waiting  = all.filter(i => i.status === 'waiting').length;
  const urgent   = dday.filter(t => {
    const d = diffDays(t.deadline);
    return d >= 0 && d <= 3 && t.status !== 'done';
  }).length;
  const pct = total ? Math.round(done / total * 100) : 0;

  return { total, done, inProg, waiting, urgent, pct };
}

/* ── 통계 렌더 ── */
function renderStats() {
  const s = computeStats();

  $('stTotal').textContent   = s.total;
  $('stDone').textContent    = s.done;
  $('stProg').textContent    = s.inProg;
  $('stUrgent').textContent  = s.urgent;
  $('stDoneBadge').textContent = `완료율 ${s.pct}%`;

  // 사이드바 카운터
  $('sbTotal').textContent  = s.total;
  $('sbDone').textContent   = s.done;
  $('sbUrgent').textContent = s.urgent;

  // 우측 패널
  $('overallPct').textContent = `${s.pct}%`;
  $('donutPct').textContent   = `${s.pct}%`;

  // 상태 칩
  $('statusChips').innerHTML = `
    <div class="chip chip-w">⏳ 대기 ${s.waiting}</div>
    <div class="chip chip-p">🔄 진행 ${s.inProg}</div>
    <div class="chip chip-d">✅ 완료 ${s.done}</div>
  `;

  updateProductivity();
  drawAllCharts(s);
}

/* ── D-Day 렌더 ── */
function renderDday() {
  const data = loadDday();
  const grid = $('ddayGrid');
  const pill = $('ddayPill');
  if (!grid || !pill) return;

  pill.textContent = `${data.length}건`;
  grid.innerHTML   = '';

  const impCls = { high:'dd-high', medium:'dd-medium', low:'dd-low' };
  const impLbl = { high:'높음', medium:'보통', low:'낮음' };
  const stCls  = { waiting:'st-w', progress:'st-p', done:'st-d' };
  const stLbl  = { waiting:'대기 중', progress:'진행 중', done:'완료' };

  data.forEach(t => {
    const diff   = diffDays(t.deadline);
    const numTxt = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
    const numCls = diff === 0 ? 'dday-today' : diff < 0 ? 'dday-past' : diff <= 3 ? 'dday-near' : 'dday-upcoming';

    const el = document.createElement('div');
    el.className = 'dd-card';
    el.innerHTML = `
      <span class="dd-imp ${impCls[t.importance] || 'dd-medium'}">중요도 ${impLbl[t.importance] || '보통'}</span>
      <div class="dd-name">${esc(t.name)}</div>
      <div class="dd-deadline">마감: ${t.deadline}</div>
      <div class="dd-num ${numCls}">${numTxt}</div>
      <span class="dd-st ${stCls[t.status] || 'st-w'}">${stLbl[t.status] || '대기 중'}</span>
    `;
    grid.appendChild(el);
  });
}

/* ── 오늘 업무 렌더 ── */
function renderTasks() {
  const tasks = loadTasks();
  const list  = $('taskList');
  if (!list) return;

  const done = tasks.filter(t => t.done).length;
  const pct  = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  $('compPill').textContent    = `${pct}%`;
  $('todayBar').style.width    = `${pct}%`;

  list.innerHTML = '';

  if (!tasks.length) {
    list.innerHTML = `<li class="t-empty">업무가 없습니다. 위에서 추가해보세요!</li>`;
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `titem${task.done ? ' done' : ''}`;
    li.innerHTML = `
      <input type="checkbox" class="t-chk" data-id="${task.id}" ${task.done ? 'checked' : ''} />
      <span class="t-txt">${esc(task.text)}</span>
      <button class="t-del" data-id="${task.id}" title="삭제">✕</button>
    `;
    list.appendChild(li);
  });

  // 체크박스
  list.querySelectorAll('.t-chk').forEach(cb => {
    cb.addEventListener('change', () => {
      const ts = loadTasks();
      const t  = ts.find(x => x.id == cb.dataset.id);
      if (t) t.done = cb.checked;
      saveTasks(ts);
      renderTasks();
      renderStats();
      renderPriority();
    });
  });

  // 삭제
  list.querySelectorAll('.t-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const ts = loadTasks().filter(x => x.id != btn.dataset.id);
      saveTasks(ts);
      renderTasks();
      renderStats();
      renderPriority();
    });
  });
}

// 업무 추가
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
  renderTasks();
  renderStats();
  renderPriority();
}

/* ── 우선순위 TOP 3 ── */
function renderPriority() {
  const tasks = loadTasks().filter(t => !t.done);
  const el    = $('priorityList');
  if (!el) return;

  if (!tasks.length) {
    el.innerHTML = `<p class="pri-empty">미완료 업무가 없습니다. 🎉</p>`;
    return;
  }

  const medals = ['🥇','🥈','🥉'];
  const rkCls  = ['rk1','rk2','rk3'];
  el.innerHTML = '';

  tasks.slice(0, 3).forEach((t, i) => {
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

/* ──────────────────────────────
   캔버스 차트 공통 유틸
────────────────────────────── */
function setupCanvas(id, cssW, cssH) {
  const canvas = $(id);
  if (!canvas) return null;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W: cssW, H: cssH };
}

/* ── 에리어 차트 ── */
function drawAreaChart(s) {
  const canvas = $('areaChart');
  if (!canvas) return;
  const cssW = canvas.parentElement.clientWidth || 500;
  const cssH = 180;
  const r    = setupCanvas('areaChart', cssW, cssH);
  if (!r) return;
  const { ctx, W, H } = r;

  const pad = { t:18, r:12, b:30, l:34 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;

  const labels = ['월','화','수','목','금','토','일'];
  const thisWk = [2, 4, 3, 6, 5, 7, Math.min(s.done + 2, 10)];
  const lastWk = [1, 3, 2, 4, 3, 5, 3];
  const maxV   = Math.max(...thisWk, ...lastWk, 1) + 1;

  const xOf = i => pad.l + (i / (labels.length - 1)) * cW;
  const yOf = v => pad.t + cH - (v / maxV) * cH;

  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * cH;
    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px -apple-system,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxV * (1 - i / 4)), pad.l - 5, y + 3.5);
  }

  // X labels
  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px -apple-system,sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => ctx.fillText(lbl, xOf(i), H - pad.b + 16));

  // Smooth line + fill helper
  function drawLine(data, lineColor, fillColor) {
    const pts = data.map((v, i) => ({ x: xOf(i), y: yOf(v) }));

    // Fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2;
      const my = (pts[i].y + pts[i+1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.quadraticCurveTo(pts[pts.length-2].x, pts[pts.length-2].y,
                         pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.lineTo(pts[pts.length-1].x, pad.t + cH);
    ctx.lineTo(pts[0].x, pad.t + cH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2;
      const my = (pts[i].y + pts[i+1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.quadraticCurveTo(pts[pts.length-2].x, pts[pts.length-2].y,
                         pts[pts.length-1].x, pts[pts.length-1].y);
    ctx.strokeStyle = lineColor; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI*2);
      ctx.fillStyle = lineColor; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
    });
  }

  // Last week (teal, back layer)
  const tGrad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  tGrad.addColorStop(0, 'rgba(6,182,212,.20)');
  tGrad.addColorStop(1, 'rgba(6,182,212,.01)');
  drawLine(lastWk, '#06B6D4', tGrad);

  // This week (blue, front layer)
  const bGrad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  bGrad.addColorStop(0, 'rgba(74,108,247,.28)');
  bGrad.addColorStop(1, 'rgba(74,108,247,.01)');
  drawLine(thisWk, '#4A6CF7', bGrad);
}

/* ── 바 차트 ── */
function drawBarChart(s) {
  const canvas = $('barChart');
  if (!canvas) return;
  const cssW = canvas.parentElement.clientWidth || 260;
  const cssH = 130;
  const r    = setupCanvas('barChart', cssW, cssH);
  if (!r) return;
  const { ctx, W, H } = r;

  const labels = ['대기 중', '진행 중', '완료'];
  const vals   = [s.waiting, s.inProg, s.done];
  const colors = ['#E2E8F0', '#4A6CF7', '#10B981'];
  const maxV   = Math.max(...vals, 1);
  const pad    = { t: 16, r: 10, b: 28, l: 10 };
  const cW     = W - pad.l - pad.r;
  const cH     = H - pad.t - pad.b;
  const bSlot  = cW / labels.length;
  const bW     = bSlot * 0.5;

  labels.forEach((lbl, i) => {
    const x  = pad.l + i * bSlot + (bSlot - bW) / 2;
    const bH = Math.max((vals[i] / maxV) * cH, 2);
    const y  = pad.t + cH - bH;
    const rc = 4;

    // Rounded-top bar
    ctx.beginPath();
    ctx.moveTo(x + rc, y);
    ctx.lineTo(x + bW - rc, y);
    ctx.quadraticCurveTo(x + bW, y, x + bW, y + rc);
    ctx.lineTo(x + bW, y + bH);
    ctx.lineTo(x, y + bH);
    ctx.lineTo(x, y + rc);
    ctx.quadraticCurveTo(x, y, x + rc, y);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();

    // Value label
    ctx.fillStyle  = '#1E293B';
    ctx.font       = 'bold 11px -apple-system,sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(vals[i], x + bW / 2, y - 4);

    // X label
    ctx.fillStyle = '#94A3B8';
    ctx.font      = '10px -apple-system,sans-serif';
    ctx.fillText(lbl, x + bW / 2, H - pad.b + 16);
  });
}

/* ── 도넛 차트 ── */
function drawDonutChart(s) {
  const canvas = $('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx  = W / 2, cy = H / 2;
  const r   = Math.min(W, H) / 2 - 10;
  const ir  = r * 0.60;
  const tot = s.total || 1;
  const segs = [
    { v: s.done,   c: '#4A6CF7' },
    { v: s.inProg, c: '#06B6D4' },
    { v: s.waiting,c: '#E2E8F0' },
  ];

  let angle = -Math.PI / 2;
  segs.forEach(seg => {
    const sweep = (seg.v / tot) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = seg.c;
    ctx.fill();
    angle += sweep;
  });

  // 도넛 구멍
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
}

/* ── 차트 일괄 그리기 ── */
function drawAllCharts(s) {
  drawAreaChart(s);
  drawBarChart(s);
  drawDonutChart(s);
}

/* ── 생산성 점수 ── */
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

/* ── 집중 타이머 ── */
let timerSec     = 25 * 60;
let timerMin     = 25;
let timerRunning = false;
let timerHandle  = null;

const modeTips = {
  25: '집중 모드: 25분 업무 몰입',
  10: '휴식 모드: 10분 충분히 쉬어요',
   5: '짧은 휴식: 5분 스트레칭',
};

function fmtTime(sec) {
  return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}
function setTimerDisplay() {
  const d = $('timerDisplay');
  if (d) d.textContent = fmtTime(timerSec);
}

document.querySelectorAll('.mbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerRunning) { clearInterval(timerHandle); timerRunning = false; }
    document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerMin = parseInt(btn.dataset.mode);
    timerSec = timerMin * 60;
    const d = $('timerDisplay');
    if (d) d.classList.remove('running', 'finished');
    const tip = $('timerTip');
    if (tip) tip.textContent = modeTips[timerMin] || '';
    setTimerDisplay();
  });
});

$('timerStart').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  const d = $('timerDisplay');
  if (d) { d.classList.add('running'); d.classList.remove('finished'); }

  timerHandle = setInterval(() => {
    timerSec--;
    setTimerDisplay();
    if (timerSec <= 0) {
      clearInterval(timerHandle);
      timerRunning = false;
      timerCycles++;
      if (d) { d.classList.remove('running'); d.classList.add('finished'); }
      const p = $('cyclePill');
      if (p) p.textContent = `🍅 ${timerCycles}사이클`;
      const t = $('timerTip');
      if (t) t.textContent = '완료! 잠깐 쉬어가세요 🎉';
      updateProductivity();
    }
  }, 1000);
});

$('timerPause').addEventListener('click', () => {
  clearInterval(timerHandle);
  timerRunning = false;
  const d = $('timerDisplay');
  if (d) d.classList.remove('running');
});

$('timerReset').addEventListener('click', () => {
  clearInterval(timerHandle);
  timerRunning = false;
  timerSec     = timerMin * 60;
  const d = $('timerDisplay');
  if (d) d.classList.remove('running', 'finished');
  const t = $('timerTip');
  if (t) t.textContent = modeTips[timerMin] || '';
  setTimerDisplay();
});

/* ── 퇴근 노트 ── */
const NOTE_KEY = 'workNote';
const DATE_KEY = 'workNoteDate';

(function loadNote() {
  const ta   = $('workNote');
  const saved = localStorage.getItem(NOTE_KEY);
  const dated = localStorage.getItem(DATE_KEY);
  if (ta && saved && dated === TODAY) ta.value = saved;
})();

$('saveNoteBtn').addEventListener('click', () => {
  const ta  = $('workNote');
  const bdg = $('saveBadge');
  if (!ta) return;
  localStorage.setItem(NOTE_KEY, ta.value);
  localStorage.setItem(DATE_KEY, TODAY);
  if (bdg) { bdg.textContent = '✔ 저장됨'; setTimeout(() => bdg.textContent = '', 2500); }
  renderYesterday();
  updateProductivity();
});

$('clearNoteBtn').addEventListener('click', () => {
  const ta  = $('workNote');
  const bdg = $('saveBadge');
  if (ta) ta.value = '';
  localStorage.removeItem(NOTE_KEY);
  localStorage.removeItem(DATE_KEY);
  if (bdg) { bdg.textContent = '🗑 초기화됨'; setTimeout(() => bdg.textContent = '', 2500); }
});

/* ── 어제 리마인드 ── */
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1); return toStr(d);
}

function renderYesterday() {
  const savedDate = localStorage.getItem(DATE_KEY);
  const savedNote = localStorage.getItem(NOTE_KEY);
  const yd        = yesterdayStr();
  const hasYd     = savedDate === yd && savedNote && savedNote.trim();

  const ybox = $('yesterdayBox');
  const rbox = $('recommendBox');
  if (!ybox || !rbox) return;

  if (hasYd) {
    ybox.innerHTML = `
      <div class="ybox">
        <div class="y-date">📌 ${korDate(yd)} 업무 노트</div>
        ${esc(savedNote)}
      </div>`;
    rbox.innerHTML = `
      <div class="rec-box">
        <div class="rec-ttl">💡 오늘 이어서 진행할 업무</div>
        <p class="rec-txt">어제 작성한 내용을 바탕으로 오늘 이어서 진행할 업무를 확인해보세요!</p>
        <div class="rec-content">${esc(savedNote)}</div>
      </div>`;
  } else {
    ybox.innerHTML = `<div class="ybox"><span class="y-empty">아직 저장된 이전 업무 노트가 없습니다.</span></div>`;
    rbox.innerHTML = `
      <div class="rec-box">
        <div class="rec-ttl">💡 오늘의 업무 추천</div>
        <p class="rec-txt">퇴근 노트를 작성하면 다음 날 어제 내용을 바탕으로 오늘 할 업무를 추천해드려요.</p>
      </div>`;
  }
}

/* ── 사이드바 네비게이션 ── */
document.querySelectorAll('.nav-it').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-it').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const target = $(item.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 모바일에서 닫기
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  });
});

/* ── 햄버거 메뉴 ── */
$('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
});
$('overlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
});

/* ── 리사이즈 시 차트 재그리기 ── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const s = computeStats();
    drawAreaChart(s);
    drawBarChart(s);
  }, 150);
});

/* ── 초기 렌더 ── */
renderDday();
renderTasks();
renderPriority();
renderYesterday();
renderStats();  // 차트 포함
