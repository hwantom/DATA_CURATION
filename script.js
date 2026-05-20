/* ============================================================
   업무 종합 대시보드 – script.js
   제작: 민승환 (202101308)
   ============================================================ */

/* ──────────────────────────────────────────
   유틸: 날짜 포매팅
────────────────────────────────────────── */
function toDateStr(date) {
  // YYYY-MM-DD 형태로 변환
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatKorDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dayIdx = new Date(dateStr).getDay();
  return `${y}년 ${m}월 ${d}일 (${days[dayIdx]})`;
}

// 오늘 날짜 문자열
const TODAY_STR = toDateStr(new Date());

/* ──────────────────────────────────────────
   1. 실시간 날짜 / 시간 표시
────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  document.getElementById("todayDate").textContent = formatKorDate(TODAY_STR);

  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  document.getElementById("todayTime").textContent = `${h}:${m}:${s}`;
}
updateClock();
setInterval(updateClock, 1000);

/* ──────────────────────────────────────────
   2. D-Day 관리 데이터 및 렌더
────────────────────────────────────────── */

// 예시 D-Day 업무 데이터 (마감일은 오늘 기준 상대값으로 설정)
function buildDdayData() {
  const addDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  };

  return [
    {
      id: 1,
      name: "기획안 초안 작성",
      deadline: addDays(2),
      importance: "high",
      status: "progress",
    },
    {
      id: 2,
      name: "발표 자료 제작",
      deadline: addDays(5),
      importance: "high",
      status: "waiting",
    },
    {
      id: 3,
      name: "데이터 분석 보고서 정리",
      deadline: addDays(0),   // 오늘 마감
      importance: "medium",
      status: "progress",
    },
    {
      id: 4,
      name: "팀 회의 준비",
      deadline: addDays(-1),  // 어제 (이미 지남)
      importance: "low",
      status: "done",
    },
    {
      id: 5,
      name: "최종 제출 파일 압축",
      deadline: addDays(7),
      importance: "medium",
      status: "waiting",
    },
  ];
}

// localStorage에서 D-Day 데이터 로드 (없으면 기본값 사용)
function loadDdayData() {
  const stored = localStorage.getItem("ddayTasks");
  if (stored) return JSON.parse(stored);
  const defaults = buildDdayData();
  localStorage.setItem("ddayTasks", JSON.stringify(defaults));
  return defaults;
}

function saveDdayData(data) {
  localStorage.setItem("ddayTasks", JSON.stringify(data));
}

// D-Day 숫자 계산
function calcDday(deadlineStr) {
  const today = new Date(TODAY_STR);
  const dl    = new Date(deadlineStr);
  const diff  = Math.round((dl - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function ddayText(diff) {
  if (diff === 0)  return "D-Day";
  if (diff > 0)    return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function ddayColorClass(diff) {
  if (diff === 0)        return "dday-today";
  if (diff < 0)          return "dday-past";
  if (diff <= 3)         return "dday-near";
  return "dday-upcoming";
}

function importanceLabel(imp) {
  const map = { high: "높음", medium: "보통", low: "낮음" };
  return map[imp] || imp;
}

function importanceClass(imp) {
  const map = { high: "imp-high", medium: "imp-medium", low: "imp-low" };
  return map[imp] || "";
}

function statusLabel(s) {
  const map = { waiting: "대기 중", progress: "진행 중", done: "완료" };
  return map[s] || s;
}

function statusClass(s) {
  const map = { waiting: "status-waiting", progress: "status-progress", done: "status-done" };
  return map[s] || "";
}

function renderDday() {
  const data  = loadDdayData();
  const grid  = document.getElementById("ddayGrid");
  const count = document.getElementById("ddayCount");

  count.textContent = `${data.length}건`;
  grid.innerHTML = "";

  data.forEach((task) => {
    const diff    = calcDday(task.deadline);
    const numTxt  = ddayText(diff);
    const numCls  = ddayColorClass(diff);
    const impCls  = importanceClass(task.importance);
    const stCls   = statusClass(task.status);

    const card = document.createElement("div");
    card.className = "dday-card";
    card.innerHTML = `
      <div class="dday-label ${impCls}">중요도 ${importanceLabel(task.importance)}</div>
      <div class="dday-task-name">${task.name}</div>
      <div class="dday-deadline">마감: ${task.deadline}</div>
      <div class="dday-number ${numCls}">${numTxt}</div>
      <span class="dday-status-pill ${stCls}">${statusLabel(task.status)}</span>
    `;
    grid.appendChild(card);
  });
}

renderDday();

/* ──────────────────────────────────────────
   3. 오늘의 업무 (추가 / 완료 / 삭제)
────────────────────────────────────────── */
const TODAY_TASKS_KEY = `todayTasks_${TODAY_STR}`;

function loadTodayTasks() {
  const stored = localStorage.getItem(TODAY_TASKS_KEY);
  if (stored) return JSON.parse(stored);
  // 기본 오늘의 업무 3개
  return [
    { id: Date.now() + 1, text: "이메일 확인 및 회신",   done: false },
    { id: Date.now() + 2, text: "오전 스크럼 미팅 참석", done: false },
    { id: Date.now() + 3, text: "기획안 피드백 반영",    done: true  },
  ];
}

function saveTodayTasks(tasks) {
  localStorage.setItem(TODAY_TASKS_KEY, JSON.stringify(tasks));
}

function renderTodayTasks() {
  const tasks    = loadTodayTasks();
  const list     = document.getElementById("taskList");
  const total    = tasks.length;
  const done     = tasks.filter((t) => t.done).length;
  const pct      = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("completionRate").textContent = `완료율 ${pct}%`;
  document.getElementById("todayProgressBar").style.width = `${pct}%`;

  list.innerHTML = "";
  if (tasks.length === 0) {
    list.innerHTML = `<li class="task-empty">등록된 업무가 없습니다. 위에서 추가해보세요.</li>`;
    updateProductivityScore();
    return;
  }

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item${task.done ? " completed" : ""}`;
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.done ? "checked" : ""} />
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" data-id="${task.id}" title="삭제">✕</button>
    `;
    list.appendChild(li);
  });

  // 체크박스 이벤트
  list.querySelectorAll(".task-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      const tasks = loadTodayTasks();
      const target = tasks.find((t) => t.id == cb.dataset.id);
      if (target) target.done = cb.checked;
      saveTodayTasks(tasks);
      renderTodayTasks();
      renderProgressCards();
      updateProductivityScore();
    });
  });

  // 삭제 버튼 이벤트
  list.querySelectorAll(".task-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tasks  = loadTodayTasks();
      const newArr = tasks.filter((t) => t.id != btn.dataset.id);
      saveTodayTasks(newArr);
      renderTodayTasks();
      renderProgressCards();
      renderPriorityTop3();
      updateProductivityScore();
    });
  });

  updateProductivityScore();
}

// 업무 추가 버튼
document.getElementById("addTaskBtn").addEventListener("click", addTask);
document.getElementById("taskInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

function addTask() {
  const input = document.getElementById("taskInput");
  const text  = input.value.trim();
  if (!text) return;

  const tasks = loadTodayTasks();
  tasks.push({ id: Date.now(), text, done: false });
  saveTodayTasks(tasks);
  input.value = "";
  renderTodayTasks();
  renderProgressCards();
  renderPriorityTop3();
  updateProductivityScore();
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

renderTodayTasks();

/* ──────────────────────────────────────────
   4. 진행 현황 카드 & 필터
────────────────────────────────────────── */
let currentFilter = "all";

function renderProgressCards() {
  const ddayTasks  = loadDdayData();
  const todayTasks = loadTodayTasks();

  // 전체 항목: D-Day 업무 + 오늘 업무 합산
  const allItems = [
    ...ddayTasks.map((t) => ({
      name:   t.name,
      status: t.status,
      source: "dday",
    })),
    ...todayTasks.map((t) => ({
      name:   t.text,
      status: t.done ? "done" : "progress",
      source: "today",
    })),
  ];

  const total    = allItems.length;
  const doneCnt  = allItems.filter((i) => i.status === "done").length;
  const progCnt  = allItems.filter((i) => i.status === "progress").length;
  const waitCnt  = allItems.filter((i) => i.status === "waiting").length;
  const pct      = total ? Math.round((doneCnt / total) * 100) : 0;

  // 전체 진행률 바
  document.getElementById("overallBar").style.width = `${pct}%`;
  document.getElementById("overallPct").textContent = `${pct}%`;

  // 상태 요약 칩
  document.getElementById("statusSummary").innerHTML = `
    <div class="status-chip chip-waiting">⏳ 대기 중 ${waitCnt}</div>
    <div class="status-chip chip-progress">🔄 진행 중 ${progCnt}</div>
    <div class="status-chip chip-done">✅ 완료 ${doneCnt}</div>
  `;

  // 카드 렌더
  const container = document.getElementById("progressCards");
  container.innerHTML = "";

  allItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "progress-task-card";
    const shouldHide =
      currentFilter !== "all" && item.status !== currentFilter;
    if (shouldHide) div.classList.add("hidden");

    div.innerHTML = `
      <div class="ptc-name">${escapeHtml(item.name)}</div>
      <div class="ptc-meta">
        <span class="dday-status-pill ${statusClass(item.status)}">${statusLabel(item.status)}</span>
        <span style="font-size:11px;color:var(--gray-400)">${item.source === "dday" ? "D-Day 업무" : "오늘 업무"}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// 필터 버튼 이벤트
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderProgressCards();
  });
});

renderProgressCards();

/* ──────────────────────────────────────────
   5. 우선순위 TOP 3
────────────────────────────────────────── */
function renderPriorityTop3() {
  const tasks  = loadTodayTasks().filter((t) => !t.done);
  const list   = document.getElementById("priorityList");

  if (tasks.length === 0) {
    list.innerHTML = `<p class="priority-empty">완료되지 않은 업무가 없습니다. 🎉</p>`;
    return;
  }

  const top3 = tasks.slice(0, 3);
  list.innerHTML = "";

  top3.forEach((task, idx) => {
    const medals = ["🥇", "🥈", "🥉"];
    const rankClasses = ["rank-1", "rank-2", "rank-3"];
    const div = document.createElement("div");
    div.className = "priority-item";
    div.innerHTML = `
      <div class="rank-badge ${rankClasses[idx]}">${medals[idx]}</div>
      <div class="priority-name">${escapeHtml(task.text)}</div>
      <span class="badge badge-blue">우선순위 ${idx + 1}</span>
    `;
    list.appendChild(div);
  });
}

renderPriorityTop3();

/* ──────────────────────────────────────────
   6. 집중 타이머 (포모도로 스타일)
────────────────────────────────────────── */
let timerInterval   = null;
let timerRemaining  = 25 * 60;  // 초 단위
let timerMinutes    = 25;
let timerRunning    = false;
let timerCycles     = 0;

const timerDisplay = document.getElementById("timerDisplay");
const timerTip     = document.getElementById("timerTip");

const modeTips = {
  25: "집중 모드: 25분 동안 업무에 몰입하세요.",
  10: "휴식 모드: 10분 동안 충분히 쉬어요.",
  5:  "짧은 휴식 모드: 5분 동안 스트레칭하세요.",
};

function formatTimer(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTimer(timerRemaining);
}

// 모드 버튼
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (timerRunning) stopTimer();
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    timerMinutes   = parseInt(btn.dataset.mode);
    timerRemaining = timerMinutes * 60;
    timerDisplay.classList.remove("running", "finished");
    timerTip.textContent = modeTips[timerMinutes];
    updateTimerDisplay();
  });
});

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerDisplay.classList.add("running");
  timerDisplay.classList.remove("finished");

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplay.classList.remove("running");
      timerDisplay.classList.add("finished");
      timerCycles++;
      document.getElementById("timerCycleBadge").textContent = `🍅 ${timerCycles} 사이클`;
      timerTip.textContent = "타이머 완료! 잠깐 휴식을 취하세요. 🎉";
      updateProductivityScore();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerDisplay.classList.remove("running");
}

function resetTimer() {
  stopTimer();
  timerRemaining = timerMinutes * 60;
  timerDisplay.classList.remove("running", "finished");
  timerTip.textContent = modeTips[timerMinutes] || "";
  updateTimerDisplay();
}

document.getElementById("timerStart").addEventListener("click", startTimer);
document.getElementById("timerPause").addEventListener("click", stopTimer);
document.getElementById("timerReset").addEventListener("click", resetTimer);

/* ──────────────────────────────────────────
   7. 퇴근 전 업무 노트 저장 (localStorage)
────────────────────────────────────────── */
const NOTE_KEY        = "workNote";
const NOTE_DATE_KEY   = "workNoteDate";

function loadNote() {
  const textarea = document.getElementById("workNote");
  const saved    = localStorage.getItem(NOTE_KEY);
  const savedDate = localStorage.getItem(NOTE_DATE_KEY);

  // 오늘 저장된 노트가 있으면 불러옴
  if (saved && savedDate === TODAY_STR) {
    textarea.value = saved;
  }
}

document.getElementById("saveNoteBtn").addEventListener("click", () => {
  const text   = document.getElementById("workNote").value;
  const status = document.getElementById("noteSaveStatus");
  localStorage.setItem(NOTE_KEY, text);
  localStorage.setItem(NOTE_DATE_KEY, TODAY_STR);
  status.textContent = "✔ 저장됨";
  setTimeout(() => (status.textContent = ""), 2500);
  renderYesterdayRemind();  // 저장 후 리마인드 갱신
  updateProductivityScore();
});

document.getElementById("clearNoteBtn").addEventListener("click", () => {
  document.getElementById("workNote").value = "";
  localStorage.removeItem(NOTE_KEY);
  localStorage.removeItem(NOTE_DATE_KEY);
  document.getElementById("noteSaveStatus").textContent = "🗑 초기화됨";
  setTimeout(() => (document.getElementById("noteSaveStatus").textContent = ""), 2500);
});

loadNote();

/* ──────────────────────────────────────────
   8. 어제 업무 리마인드 & 오늘 업무 추천
────────────────────────────────────────── */
function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

function renderYesterdayRemind() {
  const savedDate     = localStorage.getItem(NOTE_DATE_KEY);
  const savedNote     = localStorage.getItem(NOTE_KEY);
  const yesterdayStr  = getYesterdayStr();

  const box       = document.getElementById("yesterdayBox");
  const recommend = document.getElementById("recommendBox");

  // 어제 날짜와 저장일이 일치하는 경우만 리마인드 표시
  const hasYesterday = (savedDate === yesterdayStr && savedNote && savedNote.trim().length > 0);

  if (hasYesterday) {
    box.innerHTML = `
      <div class="yesterday-date">📌 ${formatKorDate(yesterdayStr)} 업무 노트</div>
      <div>${escapeHtml(savedNote)}</div>
    `;
    recommend.innerHTML = `
      <div class="recommend-title">💡 오늘 이어서 진행할 업무를 확인해보세요</div>
      <p class="recommend-text">어제 작성한 내용을 바탕으로 오늘 이어서 진행할 업무를 확인해보세요. 아래 내용을 참고해 오늘의 업무 목록을 구성해보세요!</p>
      <div class="recommend-content">${escapeHtml(savedNote)}</div>
    `;
  } else {
    box.innerHTML = `<div class="yesterday-empty">아직 저장된 이전 업무 노트가 없습니다.</div>`;
    recommend.innerHTML = `
      <div class="recommend-title">💡 오늘의 업무 추천</div>
      <p class="recommend-text">퇴근 전 업무 노트를 작성하면, 다음 날 접속 시 어제 진행한 내용을 바탕으로 오늘 이어서 할 업무를 추천해드려요.</p>
    `;
  }
}

renderYesterdayRemind();

/* ──────────────────────────────────────────
   9. 오늘의 생산성 점수 계산 (창의 기능 1)
   - 오늘 업무 완료율 + 타이머 사이클 + 노트 작성 여부
────────────────────────────────────────── */
function updateProductivityScore() {
  const tasks    = loadTodayTasks();
  const total    = tasks.length;
  const done     = tasks.filter((t) => t.done).length;
  const pct      = total ? done / total : 0;

  // 점수 계산: 업무완료율 70% + 타이머 사이클 20% + 노트 작성 10%
  const taskScore   = Math.round(pct * 70);
  const timerScore  = Math.min(timerCycles * 5, 20);
  const noteScore   = localStorage.getItem(NOTE_KEY) ? 10 : 0;
  const total_score = taskScore + timerScore + noteScore;

  const el = document.getElementById("productivityScore");
  el.textContent = `${total_score}점`;

  // 점수에 따른 색상
  const badge = document.getElementById("productivityBadge");
  if (total_score >= 80) {
    badge.style.background = "rgba(22,163,74,.25)";
    badge.style.borderColor = "rgba(22,163,74,.4)";
  } else if (total_score >= 50) {
    badge.style.background = "rgba(37,99,235,.2)";
    badge.style.borderColor = "rgba(37,99,235,.35)";
  } else {
    badge.style.background = "rgba(255,255,255,.15)";
    badge.style.borderColor = "rgba(255,255,255,.25)";
  }
}

updateProductivityScore();

/* ──────────────────────────────────────────
   10. 사이드바 햄버거 메뉴 (모바일)
────────────────────────────────────────── */
const sidebar        = document.getElementById("sidebar");
const hamburger      = document.getElementById("hamburger");
const sidebarOverlay = document.getElementById("sidebarOverlay");

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("open");
});
sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
});

// 사이드바 메뉴 클릭 시 모바일에서 닫기
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
  });
});

/* ──────────────────────────────────────────
   11. 사이드바 활성 메뉴 스크롤 추적
────────────────────────────────────────── */
const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".nav-item[data-section]");

const sectionMap = {
  "section-profile":   "profile",
  "section-dday":      "dday",
  "section-today":     "today",
  "section-progress":  "progress",
  "section-priority":  "priority",
  "section-timer":     "timer",
  "section-note":      "note",
  "section-yesterday": "yesterday",
};

function updateActiveNav() {
  let currentId = "";
  sections.forEach((sec) => {
    const rect = sec.getBoundingClientRect();
    if (rect.top <= 120) currentId = sec.id;
  });

  const active = sectionMap[currentId];
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.section === active);
  });
}

window.addEventListener("scroll", updateActiveNav, { passive: true });
