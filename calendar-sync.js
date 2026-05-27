/* ============================================================
   WorkBoard Pro – Google Calendar Sync Module
   Google Calendar API 연동
   ============================================================ */

const CalendarSync = (() => {
  let accessToken = null;
  let events = [];
  let listeners = [];

  /* ── 데모 이벤트 ── */
  function demoEvents() {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const add = (n) => { const dd = new Date(today); dd.setDate(dd.getDate() + n); return dd; };

    return [
      { id: 'e1', summary: '팀 주간 회의',      start: fmt(add(0)), end: fmt(add(0)), color: '#4A6CF7', time: '10:00-11:00' },
      { id: 'e2', summary: '기획안 마감',        start: fmt(add(2)), end: fmt(add(2)), color: '#EF4444', time: '종일' },
      { id: 'e3', summary: '발표 리허설',        start: fmt(add(4)), end: fmt(add(4)), color: '#10B981', time: '14:00-15:30' },
      { id: 'e4', summary: '데이터 분석 미팅',   start: fmt(add(1)), end: fmt(add(1)), color: '#F59E0B', time: '15:00-16:00' },
      { id: 'e5', summary: '분기 보고 마감',     start: fmt(add(7)), end: fmt(add(7)), color: '#8B5CF6', time: '종일' },
    ];
  }

  /* ── 초기화 ── */
  function init() {
    if (isDemoMode()) {
      events = demoEvents();
      notifyListeners();
      return;
    }
  }

  /* ── 캘린더 이벤트 가져오기 ── */
  async function fetchEvents() {
    if (isDemoMode()) {
      events = demoEvents();
      notifyListeners();
      return events;
    }

    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&key=${GOOGLE_API_KEY}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) throw new Error(`Calendar API 에러: ${res.status}`);
      const data = await res.json();

      events = (data.items || []).map(item => ({
        id:      item.id,
        summary: item.summary || '(제목 없음)',
        start:   item.start?.date || item.start?.dateTime?.split('T')[0],
        end:     item.end?.date || item.end?.dateTime?.split('T')[0],
        time:    item.start?.dateTime ? formatTime(item.start.dateTime) + '-' + formatTime(item.end.dateTime) : '종일',
        color:   item.colorId ? googleCalColor(item.colorId) : '#4A6CF7'
      }));

      notifyListeners();
      return events;
    } catch (err) {
      console.error('캘린더 이벤트 로드 실패:', err);
      return [];
    }
  }

  /* ── 이벤트 추가 ── */
  async function addEvent(taskTitle, deadline) {
    if (isDemoMode()) {
      events.push({
        id: 'ev-' + Date.now(),
        summary: taskTitle,
        start: deadline,
        end: deadline,
        color: '#4A6CF7',
        time: '종일'
      });
      notifyListeners();
      return true;
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `[WorkBoard] ${taskTitle}`,
            start: { date: deadline },
            end:   { date: deadline }
          })
        }
      );

      if (!res.ok) throw new Error(`Calendar API 에러: ${res.status}`);
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('캘린더 이벤트 추가 실패:', err);
      return false;
    }
  }

  /* ── 렌더 ── */
  function render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const today = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e => e.start >= today).slice(0, 5);

    if (!upcoming.length) {
      el.innerHTML = '<div class="cal-sync-empty">📅 다가오는 일정이 없습니다</div>';
      return;
    }

    el.innerHTML = upcoming.map(ev => {
      const isToday = ev.start === today;
      return `
        <div class="cal-sync-item ${isToday ? 'is-today' : ''}">
          <div class="cal-sync-color" style="background:${ev.color}"></div>
          <div class="cal-sync-info">
            <div class="cal-sync-title">${escHtml(ev.summary)}</div>
            <div class="cal-sync-meta">${formatEventDate(ev.start)} · ${ev.time}</div>
          </div>
          ${isToday ? '<span class="cal-sync-badge">TODAY</span>' : ''}
        </div>
      `;
    }).join('');
  }

  /* ── 유틸 ── */
  function formatTime(dt) {
    const d = new Date(dt);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function formatEventDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth()+1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
  }

  function googleCalColor(id) {
    const colors = { '1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73','5':'#F6BF26','6':'#F4511E','7':'#039BE5','8':'#616161','9':'#3F51B5','10':'#0B8043','11':'#D50000' };
    return colors[id] || '#4A6CF7';
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function onChange(cb) { listeners.push(cb); }
  function notifyListeners() { listeners.forEach(cb => cb(events)); }

  return { init, fetchEvents, addEvent, render, onChange, getEvents: () => events };
})();
