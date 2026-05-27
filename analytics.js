/* ============================================================
   WorkBoard Pro – Analytics Module
   일일 / 주간 / 월간 / 분기 / 연간 결산 분석
   ============================================================ */

const Analytics = (() => {
  let activeTab = 'daily';

  /* ── 데모 데이터 생성 ── */
  function generateDemoData(period) {
    const today = new Date();
    const data = [];

    const count = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }[period] || 7;

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // 결정론적 난수
      let h = 0;
      for (let j = 0; j < dateStr.length; j++) { h = ((h << 5) - h) + dateStr.charCodeAt(j); h |= 0; }
      const total = 5 + Math.abs(h % 8);
      const done  = Math.min(total, 2 + Math.abs((h >> 4) % (total - 1)));
      data.push({ date: dateStr, total, done, pct: Math.round(done / total * 100) });
    }
    return data;
  }

  /* ── 렌더 메인 ── */
  function render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      <div class="ana-tabs">
        <button class="ana-tab ${activeTab === 'daily' ? 'active' : ''}" data-tab="daily">일일</button>
        <button class="ana-tab ${activeTab === 'weekly' ? 'active' : ''}" data-tab="weekly">주간</button>
        <button class="ana-tab ${activeTab === 'monthly' ? 'active' : ''}" data-tab="monthly">월간</button>
        <button class="ana-tab ${activeTab === 'quarterly' ? 'active' : ''}" data-tab="quarterly">분기</button>
        <button class="ana-tab ${activeTab === 'yearly' ? 'active' : ''}" data-tab="yearly">연간</button>
      </div>
      <div class="ana-content" id="anaContent"></div>
    `;

    // 탭 이벤트
    el.querySelectorAll('.ana-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render(containerId);
      });
    });

    renderContent();
  }

  /* ── 각 탭 콘텐츠 ── */
  function renderContent() {
    const el = document.getElementById('anaContent');
    if (!el) return;

    const data = generateDemoData(activeTab);
    const stats = computePeriodStats(data);

    switch (activeTab) {
      case 'daily':   renderDaily(el, data, stats);     break;
      case 'weekly':  renderWeekly(el, data, stats);    break;
      case 'monthly': renderMonthly(el, data, stats);   break;
      case 'quarterly': renderQuarterly(el, data, stats); break;
      case 'yearly':  renderYearly(el, data, stats);    break;
    }
  }

  function computePeriodStats(data) {
    const totalTasks = data.reduce((s, d) => s + d.total, 0);
    const doneTasks  = data.reduce((s, d) => s + d.done, 0);
    const avgPct     = data.length ? Math.round(data.reduce((s, d) => s + d.pct, 0) / data.length) : 0;
    const bestDay    = data.reduce((b, d) => d.pct > b.pct ? d : b, data[0]);
    const worstDay   = data.reduce((w, d) => d.pct < w.pct ? d : w, data[0]);
    return { totalTasks, doneTasks, avgPct, bestDay, worstDay };
  }

  /* ── 일일 결산 ── */
  function renderDaily(el, data, stats) {
    const today = data[data.length - 1];
    const taskStats = Team.getStats();

    el.innerHTML = `
      <div class="ana-summary">
        <div class="ana-kpi">
          <div class="ana-kpi-val">${taskStats.done}<span class="ana-kpi-unit">/${taskStats.total}</span></div>
          <div class="ana-kpi-label">오늘 완료 업무</div>
        </div>
        <div class="ana-kpi">
          <div class="ana-kpi-val">${taskStats.pct}<span class="ana-kpi-unit">%</span></div>
          <div class="ana-kpi-label">완료율</div>
        </div>
        <div class="ana-kpi">
          <div class="ana-kpi-val">${taskStats.urgent}</div>
          <div class="ana-kpi-label">긴급 업무</div>
        </div>
        <div class="ana-kpi">
          <div class="ana-kpi-val">${taskStats.inProg}</div>
          <div class="ana-kpi-label">진행 중</div>
        </div>
      </div>
      <div class="ana-bar-wrap">
        <div class="ana-progress-track">
          <div class="ana-progress-fill" style="width:${taskStats.pct}%"></div>
        </div>
        <div class="ana-bar-label">${taskStats.pct}% 달성</div>
      </div>
      <div class="ana-note">
        <span class="ana-icon">📊</span>
        ${taskStats.pct >= 80 ? '훌륭합니다! 오늘 목표를 거의 달성했습니다.' :
          taskStats.pct >= 50 ? '좋은 진행입니다. 남은 업무도 화이팅!' :
          '아직 갈 길이 멀어요. 집중 모드를 활용해보세요!'}
      </div>
    `;
  }

  /* ── 주간 결산 ── */
  function renderWeekly(el, data, stats) {
    const chartBars = data.map(d => {
      const [,, dd] = d.date.split('-');
      const dow = ['일','월','화','수','목','금','토'][new Date(d.date).getDay()];
      return `
        <div class="ana-chart-col">
          <div class="ana-chart-bar-wrap">
            <div class="ana-chart-bar" style="height:${d.pct}%; background:${pctGradient(d.pct)}"></div>
          </div>
          <div class="ana-chart-label">${dow}</div>
          <div class="ana-chart-sub">${parseInt(dd)}일</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="ana-summary">
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.totalTasks}</div><div class="ana-kpi-label">총 업무</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.doneTasks}</div><div class="ana-kpi-label">완료</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.avgPct}<span class="ana-kpi-unit">%</span></div><div class="ana-kpi-label">평균 완료율</div></div>
      </div>
      <div class="ana-chart">${chartBars}</div>
      <div class="ana-note"><span class="ana-icon">📈</span> 최고 일: ${formatShortDate(stats.bestDay.date)} (${stats.bestDay.pct}%) &nbsp;|&nbsp; 최저 일: ${formatShortDate(stats.worstDay.date)} (${stats.worstDay.pct}%)</div>
    `;
  }

  /* ── 월간 결산 ── */
  function renderMonthly(el, data, stats) {
    // 히트맵 스타일
    const heatmap = data.map(d => {
      const [,,dd] = d.date.split('-');
      const bg = d.pct >= 80 ? '#10B981' : d.pct >= 60 ? '#4A6CF7' : d.pct >= 40 ? '#F59E0B' : '#EF4444';
      return `<div class="ana-heat-cell" style="background:${bg}" title="${d.date}: ${d.pct}%"><span>${parseInt(dd)}</span></div>`;
    }).join('');

    el.innerHTML = `
      <div class="ana-summary">
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.totalTasks}</div><div class="ana-kpi-label">총 업무</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.doneTasks}</div><div class="ana-kpi-label">완료</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.avgPct}<span class="ana-kpi-unit">%</span></div><div class="ana-kpi-label">월간 평균</div></div>
      </div>
      <div class="ana-heatmap">${heatmap}</div>
      <div class="ana-legend">
        <span class="ana-leg-dot" style="background:#EF4444"></span>~39%
        <span class="ana-leg-dot" style="background:#F59E0B"></span>40~59%
        <span class="ana-leg-dot" style="background:#4A6CF7"></span>60~79%
        <span class="ana-leg-dot" style="background:#10B981"></span>80%+
      </div>
    `;
  }

  /* ── 분기 결산 ── */
  function renderQuarterly(el, data, stats) {
    // 월별 그룹
    const months = {};
    data.forEach(d => {
      const m = d.date.substring(0, 7);
      if (!months[m]) months[m] = { total: 0, done: 0, days: 0 };
      months[m].total += d.total;
      months[m].done  += d.done;
      months[m].days++;
    });

    const monthBars = Object.entries(months).map(([m, v]) => {
      const pct = v.total ? Math.round(v.done / v.total * 100) : 0;
      const [y, mm] = m.split('-');
      return `
        <div class="ana-chart-col ana-chart-col-wide">
          <div class="ana-chart-bar-wrap">
            <div class="ana-chart-bar" style="height:${pct}%; background:${pctGradient(pct)}"></div>
          </div>
          <div class="ana-chart-label">${parseInt(mm)}월</div>
          <div class="ana-chart-sub">${pct}%</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="ana-summary">
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.totalTasks}</div><div class="ana-kpi-label">분기 총 업무</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.doneTasks}</div><div class="ana-kpi-label">완료</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.avgPct}<span class="ana-kpi-unit">%</span></div><div class="ana-kpi-label">분기 평균</div></div>
      </div>
      <div class="ana-chart">${monthBars}</div>
      <div class="ana-note"><span class="ana-icon">🏆</span> 분기 목표 달성률: <strong>${stats.avgPct}%</strong></div>
    `;
  }

  /* ── 연간 결산 ── */
  function renderYearly(el, data, stats) {
    const months = {};
    data.forEach(d => {
      const m = d.date.substring(0, 7);
      if (!months[m]) months[m] = { total: 0, done: 0, days: 0 };
      months[m].total += d.total;
      months[m].done  += d.done;
      months[m].days++;
    });

    const monthBars = Object.entries(months).map(([m, v]) => {
      const pct = v.total ? Math.round(v.done / v.total * 100) : 0;
      const [, mm] = m.split('-');
      return `
        <div class="ana-chart-col">
          <div class="ana-chart-bar-wrap">
            <div class="ana-chart-bar" style="height:${pct}%; background:${pctGradient(pct)}"></div>
          </div>
          <div class="ana-chart-label">${parseInt(mm)}월</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="ana-summary">
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.totalTasks}</div><div class="ana-kpi-label">연간 총 업무</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.doneTasks}</div><div class="ana-kpi-label">완료</div></div>
        <div class="ana-kpi"><div class="ana-kpi-val">${stats.avgPct}<span class="ana-kpi-unit">%</span></div><div class="ana-kpi-label">연간 평균</div></div>
      </div>
      <div class="ana-chart">${monthBars}</div>
      <div class="ana-note"><span class="ana-icon">📅</span> 연간 성장 추이를 확인하세요</div>
    `;
  }

  /* ── 유틸 ── */
  function pctGradient(pct) {
    if (pct >= 80) return 'linear-gradient(180deg, #10B981, #059669)';
    if (pct >= 60) return 'linear-gradient(180deg, #4A6CF7, #3B5CE6)';
    if (pct >= 40) return 'linear-gradient(180deg, #F59E0B, #D97706)';
    return 'linear-gradient(180deg, #EF4444, #DC2626)';
  }

  function formatShortDate(dateStr) {
    const [, m, d] = dateStr.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
  }

  /* ── 일일 결산 리포트 (이메일/내보내기용) ── */
  function getDailySummary() {
    const taskStats = Team.getStats();
    const tasks = Team.getTasks();
    const user = Auth.getUser();

    return {
      date: new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' }),
      userName: user?.displayName || '사용자',
      total: taskStats.total,
      done: taskStats.done,
      inProgress: taskStats.inProg,
      waiting: taskStats.waiting,
      urgent: taskStats.urgent,
      completionRate: taskStats.pct,
      completedTasks: tasks.filter(t => t.status === 'done').map(t => t.title),
      pendingTasks: tasks.filter(t => t.status !== 'done').map(t => t.title),
      note: localStorage.getItem('workNote') || ''
    };
  }

  return { render, getDailySummary };
})();
