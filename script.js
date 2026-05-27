/* ============================================================
   WorkBoard Pro – script.js v5
   메인 스크립트: 모든 모듈 통합 + 기존 기능 유지
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
   앱 초기화 (로그인 → 대시보드)
────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  Auth.init();
  setupLoginScreen();
  setupTeamModal();
  setupTaskModal();

  // 인증 상태 감시
  Auth.onAuthStateChanged((event, user) => {
    if (event === 'signed-in') {
      if (Auth.hasTeam()) {
        showDashboard();
      } else {
        showTeamSetup();
      }
    } else {
      showLoginScreen();
    }
  });
});

/* ──────────────────────────────
   화면 전환
────────────────────────────── */
function showLoginScreen() {
  $('loginScreen').style.display = '';
  $('dashboard').style.display = 'none';
  $('teamSetupModal').style.display = 'none';
}

function showTeamSetup() {
  $('loginScreen').style.display = 'none';
  $('dashboard').style.display = 'none';
  $('teamSetupModal').style.display = '';
}

function showDashboard() {
  $('loginScreen').style.display = 'none';
  $('teamSetupModal').style.display = 'none';
  $('dashboard').style.display = '';

  // 프로필 업데이트
  updateSidebarProfile();

  // 모듈 초기화
  Team.init();
  Chat.init();
  PostIt.init('postitBoard');
  CalendarSync.init();
  GmailSender.init();

  // 기존 기능 초기화
  setupSidebar();
  setupClock();
  setupCalendar();
  setupTimer();
  setupNote();
  setupNavigation();

  // 팀 업무 리스너
  Team.onChange(() => {
    renderStats();
    renderDday();
    renderTasks();
    renderPriority();
    renderTeamTasks();
  });

  // 채팅 리스너
  Chat.onChatListChange(renderChatList);
  Chat.onMessagesChange(renderChatMessages);

  // 초기 렌더
  saveDailyPct();
  renderAll();

  // 채팅 첫 채널 열기
  const chatList = Chat.getChatList();
  if (chatList.length) Chat.openChat(chatList[0].id);

  // 결산 분석
  Analytics.render('analyticsContainer');

  // Google 캘린더
  CalendarSync.render('gcalEvents');
}

function renderAll() {
  renderStats();
  renderDday();
  renderTasks();
  renderPriority();
  renderTeamTasks();
  renderCalendar();
}

/* ──────────────────────────────
   로그인 화면 설정
────────────────────────────── */
function setupLoginScreen() {
  $('googleLoginBtn').addEventListener('click', async () => {
    try {
      await Auth.signInWithGoogle();
    } catch (err) {
      alert('로그인에 실패했습니다: ' + (err.message || err));
    }
  });

  $('demoLoginBtn').addEventListener('click', async () => {
    await Auth.signInWithGoogle(); // 데모 모드에서도 동일 함수 사용
  });
}

/* ──────────────────────────────
   팀 설정 모달
────────────────────────────── */
function setupTeamModal() {
  let selectedRole = null;

  // 역할 선택
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRole = card.dataset.role;

      $('createTeamForm').style.display = selectedRole === 'admin' ? '' : 'none';
      $('joinTeamForm').style.display   = selectedRole === 'member' ? '' : 'none';
      $('teamResult').style.display = 'none';
    });
  });

  // 팀 생성
  $('createTeamBtn').addEventListener('click', async () => {
    const name = $('teamNameInput').value.trim();
    if (!name) { alert('팀 이름을 입력하세요'); return; }

    await Auth.setRole('admin');
    const team = await Auth.createTeam(name);
    if (team) {
      $('createTeamForm').style.display = 'none';
      $('teamResult').style.display = '';
      $('teamCodeDisplay').textContent = `팀 코드: ${team.code}`;
      $('roleCards').style.display = 'none';
    }
  });

  // 팀 참가
  $('joinTeamBtn').addEventListener('click', async () => {
    const code = $('teamCodeInput').value.trim().toUpperCase();
    if (!code || code.length < 4) { alert('팀 코드를 입력하세요'); return; }

    try {
      await Auth.setRole('member');
      await Auth.joinTeam(code);
      showDashboard();
    } catch (err) {
      alert('팀 참가 실패: ' + (err.message || err));
    }
  });

  // 대시보드 입장
  $('enterDashboardBtn').addEventListener('click', () => {
    showDashboard();
  });
}

/* ──────────────────────────────
   사이드바 프로필 업데이트
────────────────────────────── */
function updateSidebarProfile() {
  const user = Auth.getUser();
  const team = Auth.getTeam();
  if (!user) return;

  $('sbUserName').textContent = user.displayName || '사용자';
  $('sbUserEmail').textContent = user.email || '';
  $('sbRoleBadge').textContent = user.role === 'admin' ? '👑 팀장' : '👤 팀원';

  // 아바타
  const avatar = $('sbAvatar');
  if (user.photoURL) {
    avatar.innerHTML = `<img src="${user.photoURL}" alt="프로필" />`;
  } else {
    avatar.textContent = (user.displayName || '?')[0];
  }

  // 팀 배지
  if (team) {
    $('tbTeamCode').textContent = team.code || team.name;
  }
}

/* ──────────────────────────────
   사이드바 토글
────────────────────────────── */
function setupSidebar() {
  const sidebar   = $('sidebar');
  const sbToggle  = $('sbToggle');
  const hamburger = $('hamburger');
  const sbOverlay = $('sbOverlay');

  if (!sbToggle || !hamburger) return;

  sbToggle.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    sbToggle.title  = collapsed ? '사이드바 펼치기' : '사이드바 접기';
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

  // 로그아웃
  $('logoutBtn').addEventListener('click', async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      Team.destroy();
      Chat.destroy();
      PostIt.destroy();
      await Auth.signOut();
    }
  });
}

/* ──────────────────────────────
   실시간 시계
────────────────────────────── */
function setupClock() {
  function tick() {
    const n = new Date(), p = v => String(v).padStart(2,'0');
    const clk = $('tbClock');
    const dt  = $('tbDate');
    if (clk) clk.textContent = `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
    if (dt)  dt.textContent  = korDate(TODAY);
  }
  tick();
  setInterval(tick, 1000);
}

/* ──────────────────────────────
   오늘 업무 데이터 (localStorage)
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
  // 팀 업무 + 오늘 개인 업무 통합
  const teamStats = Team.getStats();
  const tasks = loadTasks();
  const localDone = tasks.filter(t => t.done).length;
  const localProg = tasks.filter(t => !t.done).length;

  const total   = teamStats.total + tasks.length;
  const done    = teamStats.done + localDone;
  const inProg  = teamStats.inProg + localProg;
  const waiting = teamStats.waiting;
  const urgent  = teamStats.urgent;
  const pct     = total ? Math.round(done / total * 100) : 0;
  return { total, done, inProg, waiting, urgent, pct };
}

function renderStats() {
  const s = computeStats();
  const el = (id, val) => { const e = $(id); if (e) e.textContent = val; };
  el('stTotal',   s.total);
  el('stDone',    s.done);
  el('stProg',    s.inProg);
  el('stUrgent',  s.urgent);
  el('doneBadge', `완료율 ${s.pct}%`);
  el('sbTotal',   s.total);
  el('sbDone',    s.done);
  el('sbUrgent',  s.urgent);
  el('overallPct', `${s.pct}%`);
  el('donutPct',   `${s.pct}%`);

  const chips = $('statusChips');
  if (chips) chips.innerHTML = `
    <div class="chip chip-w">⏳ 대기 ${s.waiting}</div>
    <div class="chip chip-p">🔄 진행 ${s.inProg}</div>
    <div class="chip chip-d">✅ 완료 ${s.done}</div>
  `;

  updateProductivity();
  drawBarChart(s);
  drawDonutChart(s);
  renderCalendar();
}

/* ──────────────────────────────
   D-Day 렌더 (팀 업무에서 생성)
────────────────────────────── */
function renderDday() {
  const teamTasks = Team.getTasks().filter(t => t.deadline);
  const grid = $('ddayGrid'), pill = $('ddayPill');
  if (!grid || !pill) return;
  pill.textContent = `${teamTasks.length}건`;
  grid.innerHTML   = '';

  const iC = {high:'dd-hi',medium:'dd-me',low:'dd-lo'};
  const iL = {high:'높음',medium:'보통',low:'낮음'};
  const sC = {waiting:'st-w',progress:'st-p',done:'st-d'};
  const sL = {waiting:'대기 중',progress:'진행 중',done:'완료'};

  teamTasks.forEach(t => {
    const diff   = diffDays(t.deadline);
    const numTxt = diff===0?'D-Day':diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;
    const numCls = diff===0?'dday-today':diff<0?'dday-past':diff<=3?'dday-near':'dday-upcoming';
    const el = document.createElement('div');
    el.className = 'dd-card';
    el.innerHTML = `
      <span class="dd-imp ${iC[t.priority]||'dd-me'}">${iL[t.priority]||'보통'}</span>
      <div class="dd-name">${esc(t.title)}</div>
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
  const cp = $('compPill');
  const tb = $('todayBar');
  if (cp) cp.textContent = `${pct}%`;
  if (tb) tb.style.width = `${pct}%`;
  saveDailyPct();

  list.innerHTML = '';
  if (!tasks.length) { list.innerHTML = `<li class="t-empty">업무가 없습니다. 위에서 추가해보세요!</li>`; return; }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `titem${task.done?' done':''}`;
    const cat = task.category || '일반';
    li.innerHTML = `
      <input type="checkbox" class="t-chk" data-id="${task.id}" ${task.done?'checked':''}/>
      <span class="titem-cat">${esc(cat)}</span>
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

function setupTaskInput() {
  const addBtn = $('addTaskBtn');
  const input  = $('taskInput');
  if (!addBtn || !input) return;

  addBtn.addEventListener('click', addLocalTask);
  input.addEventListener('keydown', e => { if (e.key==='Enter') addLocalTask(); });
}

function addLocalTask() {
  const inp = $('taskInput'), text = inp?.value.trim();
  const cat = $('taskCategory')?.value || '일반';
  if (!text) return;
  const ts = loadTasks();
  ts.push({ id:Date.now(), text, category: cat, done:false });
  saveTasks(ts); inp.value = '';
  renderTasks(); renderStats(); renderPriority();
}

// 초기화 시 이벤트 바인딩
setTimeout(setupTaskInput, 100);

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

/* ──────────────────────────────
   팀 업무 현황 렌더
────────────────────────────── */
function renderTeamTasks() {
  const el = $('teamTaskList');
  if (!el) return;
  const tasks = Team.getTasks();
  const sL = {waiting:'대기',progress:'진행',done:'완료'};
  const sC = {waiting:'s-waiting',progress:'s-progress',done:'s-done'};

  if (!tasks.length) {
    el.innerHTML = '<div class="t-empty">팀 업무가 없습니다</div>';
    return;
  }

  el.innerHTML = tasks.slice(0, 10).map(t => `
    <div class="team-task-item" data-id="${t.id}">
      <div class="tt-priority ${t.priority === 'high' ? 'hi' : t.priority === 'low' ? 'lo' : 'me'}"></div>
      <div class="tt-info">
        <div class="tt-title">${esc(t.title)}</div>
        <div class="tt-meta">
          <span>👤 ${esc(t.assigneeName || '미배정')}</span>
          ${t.deadline ? `<span>📅 ${t.deadline}</span>` : ''}
        </div>
      </div>
      <span class="tt-status ${sC[t.status] || 's-waiting'}">${sL[t.status] || '대기'}</span>
      <div class="tt-assignee">${(t.assigneeName || '?')[0]}</div>
    </div>
  `).join('');

  // 상태 변경 클릭
  el.querySelectorAll('.tt-status').forEach(badge => {
    badge.style.cursor = 'pointer';
    badge.addEventListener('click', (e) => {
      const item = e.target.closest('.team-task-item');
      const taskId = item?.dataset.id;
      if (!taskId) return;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const cycle = { waiting: 'progress', progress: 'done', done: 'waiting' };
      Team.updateTask(taskId, { status: cycle[task.status] || 'waiting' });
    });
  });
}

/* ──────────────────────────────
   업무 추가 모달
────────────────────────────── */
function setupTaskModal() {
  const modal = $('addTaskModal');
  if (!modal) return;

  $('addTeamTaskBtn')?.addEventListener('click', () => {
    modal.style.display = '';
    // 담당자 옵션
    const select = $('modalTaskAssignee');
    if (select) {
      const members = Auth.getTeamMembers();
      select.innerHTML = members.map(m =>
        `<option value="${m.uid}">${m.name} ${m.role==='admin'?'(팀장)':''}</option>`
      ).join('');
    }
    // 오늘 날짜 기본값
    const dl = $('modalTaskDeadline');
    if (dl) dl.value = TODAY;
  });

  $('cancelTaskModalBtn')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  $('confirmAddTaskBtn')?.addEventListener('click', async () => {
    const title    = $('modalTaskTitle')?.value.trim();
    const desc     = $('modalTaskDesc')?.value.trim();
    const assignee = $('modalTaskAssignee')?.value;
    const priority = $('modalTaskPriority')?.value;
    const deadline = $('modalTaskDeadline')?.value;

    if (!title) { alert('업무 제목을 입력하세요'); return; }

    const members = Auth.getTeamMembers();
    const member  = members.find(m => m.uid === assignee);

    await Team.addTask({
      title,
      description: desc,
      assignedTo: assignee,
      assigneeName: member?.name || '미배정',
      priority,
      deadline
    });

    modal.style.display = 'none';
    $('modalTaskTitle').value = '';
    $('modalTaskDesc').value = '';
  });
}

/* ══════════════════════════════════════
   📆 주간 캘린더 (일별 도넛 차트)
══════════════════════════════════════ */

let calOffset = 0;

function getMonthDays(offset) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + offset;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const days = [];
  let startDow = firstDay.getDay() - 1; 
  if (startDow < 0) startDow = 6;
  
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - startDow + i);
    days.push({ date: toStr(d), isCurrentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({ date: toStr(d), isCurrentMonth: true });
  }
  const remaining = days.length % 7;
  if (remaining !== 0) {
    const nextDays = 7 - remaining;
    for (let i = 1; i <= nextDays; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: toStr(d), isCurrentMonth: false });
    }
  }
  
  return { days, year: firstDay.getFullYear(), month: firstDay.getMonth() + 1 };
}

function getDayPct(dateStr) {
  if (dateStr > TODAY) return -1;
  const stored = localStorage.getItem(`daily_${dateStr}`);
  if (stored !== null) return Math.min(100, Math.max(0, parseInt(stored)));
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) { h = ((h << 5) - h) + dateStr.charCodeAt(i); h |= 0; }
  return 35 + Math.abs(h % 60);
}

function pctColor(pct) {
  if (pct >= 80) return '#10B981';
  if (pct >= 60) return '#4A6CF7';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

function svgDonut(pct, isToday, isFuture) {
  const R = 15.9155;
  if (isFuture) {
    return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="${R}" fill="none" stroke="#E2E8F0" stroke-width="3.8"/>
    </svg>`;
  }
  const color  = pctColor(pct);
  const filled = Math.max(pct, 0);
  const empty  = 100 - filled;
  const txtColor = isToday ? '#4A6CF7' : '#1E293B';
  const txtSize  = pct >= 100 ? 9 : 10;
  return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="${R}" fill="none" stroke="#E2E8F0" stroke-width="3.8"/>
    ${filled > 0 ? `<circle cx="18" cy="18" r="${R}" fill="none"
      stroke="${color}" stroke-width="3.8"
      stroke-dasharray="${filled} ${empty}"
      stroke-linecap="round"
      transform="rotate(-90 18 18)"/>` : ''}
    <text x="18" y="21" text-anchor="middle"
          font-size="${txtSize}" fill="${pct===0?'#CBD5E1':txtColor}"
          font-weight="700" font-family="Inter,sans-serif">${pct}%</text>
  </svg>`;
}

function renderCalendar() {
  const grid = $('calGrid');
  if (!grid) return;
  
  const { days, year, month } = getMonthDays(calOffset);

  const cml = $('calMonthLabel');
  if (cml) cml.textContent = `${year}년 ${month}월`;

  const weekTxt = $('calWeekTxt');
  if (weekTxt) {
    if (calOffset === 0) weekTxt.textContent = '이번 달';
    else if (calOffset === -1) weekTxt.textContent = '지난 달';
    else weekTxt.textContent = `${month}월`;
  }

  const nextBtn = $('calNext');
  if (nextBtn) nextBtn.disabled = (calOffset >= 0);

  grid.innerHTML = '';
  days.forEach(dayItem => {
    const dateStr = dayItem.date;
    const isToday  = (dateStr === TODAY);
    const isFuture = (dateStr > TODAY);
    const pct      = isToday
      ? (() => { const ts=loadTasks(); const d=ts.filter(t=>t.done).length; return ts.length?Math.round(d/ts.length*100):0; })()
      : getDayPct(dateStr);
      
    const dateNum = parseInt(dateStr.split('-')[2]);
    const cell = document.createElement('div');
    
    let cls = 'cal-day';
    if (isToday) cls += ' is-today';
    if (isFuture) cls += ' is-future';
    if (!dayItem.isCurrentMonth) cls += ' not-current-month';
    
    cell.className = cls;
    cell.innerHTML = `
      <span class="cal-date-num">${dateNum}</span>
      <div class="cal-donut">${svgDonut(pct, isToday, isFuture)}</div>
      ${isToday ? '<span class="today-badge">오늘</span>' : ''}
    `;
    grid.appendChild(cell);
  });
}

function setupCalendar() {
  $('calPrev')?.addEventListener('click', () => { calOffset--; renderCalendar(); });
  $('calNext')?.addEventListener('click', () => { if (calOffset < 0) { calOffset++; renderCalendar(); } });
}

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
    ctx.fillStyle='#1E293B'; ctx.font='bold 10px Inter,sans-serif'; ctx.textAlign='center';
    ctx.fillText(v, x+bW/2, y-3);
    ctx.fillStyle='#94A3B8'; ctx.font='9px Inter,sans-serif';
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
  const ps = $('prodScore');
  if (ps) ps.textContent = score;
}

/* ──────────────────────────────
   집중 타이머
────────────────────────────── */
let timerSec=25*60, timerMin=25, timerRunning=false, timerHandle=null;
const tipMap={25:'집중 모드: 25분 업무 몰입',10:'휴식 모드: 10분 충분히 쉬어요',5:'짧은 휴식: 5분 스트레칭'};

function fmtTime(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function setTimerDisp() { const d=$('timerDisplay'); if(d) d.textContent=fmtTime(timerSec); }

function setupTimer() {
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

  $('timerStart')?.addEventListener('click', () => {
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
  $('timerPause')?.addEventListener('click',()=>{clearInterval(timerHandle);timerRunning=false;const d=$('timerDisplay');if(d)d.classList.remove('running');});
  $('timerReset')?.addEventListener('click',()=>{clearInterval(timerHandle);timerRunning=false;timerSec=timerMin*60;const d=$('timerDisplay');if(d)d.classList.remove('running','finished');const t=$('timerTip');if(t)t.textContent=tipMap[timerMin]||'';setTimerDisp();});
}

/* ──────────────────────────────
   퇴근 노트 + Gmail 발송
────────────────────────────── */
const NOTE_KEY='workNote', DATE_KEY='workNoteDate';

function setupNote() {
  // 로드
  const ta = document.getElementById('workNote');
  const saved=localStorage.getItem(NOTE_KEY), dated=localStorage.getItem(DATE_KEY);
  if(ta && saved && dated===TODAY) ta.value=saved;

  $('saveNoteBtn')?.addEventListener('click',()=>{
    if(!ta) return;
    try{localStorage.setItem(NOTE_KEY,ta.value);localStorage.setItem(DATE_KEY,TODAY);}catch(e){}
    const bdg=$('saveBadge');
    if(bdg){bdg.textContent='✔ 저장됨';setTimeout(()=>bdg.textContent='',2500);}
    updateProductivity();
  });

  $('clearNoteBtn')?.addEventListener('click',()=>{
    if(ta) ta.value='';
    try{localStorage.removeItem(NOTE_KEY);localStorage.removeItem(DATE_KEY);}catch(e){}
    const bdg=$('saveBadge');
    if(bdg){bdg.textContent='🗑 초기화됨';setTimeout(()=>bdg.textContent='',2500);}
  });

  // Gmail 결산 발송
  $('emailReportBtn')?.addEventListener('click', async () => {
    const btn = $('emailReportBtn');
    const originalText = btn.textContent;
    try {
      btn.textContent = '📧 발송 중...';
      btn.disabled = true;
      const result = await GmailSender.sendDailyReport();
      if (result.demo) {
        alert('✅ 데모 모드: 이메일 발송이 시뮬레이션되었습니다.\nFirebase 설정 후 실제 발송됩니다.');
      } else {
        alert('✅ 일일 결산 이메일이 발송되었습니다!');
      }
    } catch (err) {
      alert('❌ 이메일 발송 실패: ' + (err.message || err));
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // Google 캘린더 동기화
  $('syncCalBtn')?.addEventListener('click', async () => {
    await CalendarSync.fetchEvents();
    CalendarSync.render('gcalEvents');
    alert('🗓️ 캘린더가 동기화되었습니다!');
  });
}

/* ──────────────────────────────
   채팅 렌더
────────────────────────────── */
function renderChatList(chats) {
  const tabs = $('chatChannelTabs');
  if (!tabs) return;

  tabs.innerHTML = chats.map(c => `
    <button class="chat-channel-tab ${c.id === Chat.getCurrentChatId() ? 'active' : ''}" data-chat="${c.id}">
      ${esc(c.name)}
      ${c.unread ? `<span style="background:var(--rd);color:#fff;border-radius:8px;padding:0 4px;font-size:8px;margin-left:3px">${c.unread}</span>` : ''}
    </button>
  `).join('');

  tabs.querySelectorAll('.chat-channel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      Chat.openChat(tab.dataset.chat);
      tabs.querySelectorAll('.chat-channel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // 배지 업데이트
  const total = Chat.getTotalUnread();
  const badge = $('chatBadge');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? '' : 'none';
  }
}

function renderChatMessages(msgs) {
  const container = $('chatMessages');
  if (!container) return;
  const user = Auth.getUser();

  container.innerHTML = msgs.map(m => {
    const isOwn = m.senderId === user?.uid;
    const time = new Date(m.timestamp).toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
    const reactions = m.reactions ? Object.entries(m.reactions).map(([emoji, users]) =>
      `<span class="chat-reaction" data-msg="${m.id}" data-emoji="${emoji}">${emoji} ${users.length}</span>`
    ).join('') : '';

    return `
      <div class="chat-msg ${isOwn ? 'own' : ''}">
        <div class="chat-msg-avatar">${(m.senderName||'?')[0]}</div>
        <div>
          <div class="chat-msg-name">${esc(m.senderName||'')}</div>
          <div class="chat-msg-bubble">${esc(m.text)}</div>
          ${reactions ? `<div class="chat-msg-reactions">${reactions}</div>` : ''}
          <div class="chat-msg-time">${time}</div>
        </div>
      </div>
    `;
  }).join('');

  // 스크롤 아래로
  container.scrollTop = container.scrollHeight;

  // 반응 클릭 이벤트
  container.querySelectorAll('.chat-reaction').forEach(btn => {
    btn.addEventListener('click', () => {
      Chat.toggleReaction(btn.dataset.msg, btn.dataset.emoji);
    });
  });
}

// 채팅 전송
setTimeout(() => {
  $('chatSendBtn')?.addEventListener('click', sendChatMessage);
  $('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}, 100);

function sendChatMessage() {
  const input = $('chatInput');
  if (!input || !input.value.trim()) return;
  Chat.sendMessage(input.value);
  input.value = '';
}

/* ──────────────────────────────
   사이드바 네비게이션
────────────────────────────── */
function setupNavigation() {
  const focusOverlay = $('focusOverlay');
  
  if (focusOverlay) {
    focusOverlay.addEventListener('click', () => {
      document.querySelectorAll('.card.focused').forEach(c => {
        c.classList.remove('focused', 'focused-fullscreen');
        c.style.cssText = c.dataset.origStyle || '';
      });
      focusOverlay.classList.remove('open');
    });
  }

  document.querySelectorAll('.nav-it').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.target === 'stat-row') {
        if(focusOverlay) focusOverlay.click();
      }
      
      document.querySelectorAll('.nav-it').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
      const target = $(item.dataset.target);
      
      if (target && target.classList.contains('card')) {
        document.querySelectorAll('.card.focused').forEach(c => {
          c.classList.remove('focused', 'focused-fullscreen');
          c.style.cssText = c.dataset.origStyle || '';
        });
        target.dataset.origStyle = target.style.cssText;
        target.classList.add('focused');
        
        if (target.id === 'postit-sec') {
          target.classList.add('focused-fullscreen');
        }
        
        if (focusOverlay) focusOverlay.classList.add('open');
      } else if (target) {
        target.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
      
      const sidebar = $('sidebar');
      const sbOverlay = $('sbOverlay');
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (sbOverlay) sbOverlay.classList.remove('open');
    });
  });
}

/* ──────────────────────────────
   리사이즈
────────────────────────────── */
let rzTimer;
window.addEventListener('resize',()=>{clearTimeout(rzTimer);rzTimer=setTimeout(()=>{const s=computeStats();drawBarChart(s);},150);});
