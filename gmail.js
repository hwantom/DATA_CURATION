/* ============================================================
   WorkBoard Pro – Gmail Module
   Gmail API를 통한 일일 결산 자동 이메일 발송
   ============================================================ */

const GmailSender = (() => {
  let tokenClient = null;
  let accessToken  = null;

  /* ── 초기화 (Google Identity Services) ── */
  function init() {
    if (isDemoMode()) return;

    // GIS (Google Identity Services) 토큰 클라이언트
    if (typeof google !== 'undefined' && google.accounts) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        callback: (response) => {
          if (response.error) {
            console.error('Gmail 토큰 에러:', response.error);
            return;
          }
          accessToken = response.access_token;
        }
      });
    }
  }

  /* ── 토큰 요청 ── */
  async function requestAccess() {
    if (isDemoMode()) {
      return true; // 데모에서는 바로 성공
    }
    return new Promise((resolve) => {
      if (accessToken) { resolve(true); return; }
      if (!tokenClient) { resolve(false); return; }
      tokenClient.callback = (response) => {
        if (response.error) { resolve(false); return; }
        accessToken = response.access_token;
        resolve(true);
      };
      tokenClient.requestAccessToken();
    });
  }

  /* ── 이메일 발송 ── */
  async function sendDailyReport(recipientEmail) {
    const summary = Analytics.getDailySummary();

    if (isDemoMode()) {
      console.log('📧 데모 모드 – 이메일 발송 시뮬레이션');
      console.log('수신:', recipientEmail || summary.userName);
      console.log('내용:', summary);
      return { success: true, demo: true };
    }

    const hasAccess = await requestAccess();
    if (!hasAccess) {
      throw new Error('Gmail 접근 권한이 없습니다.');
    }

    const user = Auth.getUser();
    const to   = recipientEmail || user.email;
    const subject = `[WorkBoard] 일일 결산 리포트 – ${summary.date}`;
    const body = buildEmailHTML(summary);

    // RFC 2822 형식 이메일
    const email = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'Content-Type: text/html; charset=UTF-8',
      'MIME-Version: 1.0',
      '',
      body
    ].join('\r\n');

    const raw = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
      });

      if (!res.ok) throw new Error(`Gmail API 에러: ${res.status}`);
      return { success: true };
    } catch (err) {
      console.error('이메일 발송 실패:', err);
      throw err;
    }
  }

  /* ── HTML 이메일 템플릿 ── */
  function buildEmailHTML(summary) {
    const completedList = summary.completedTasks.length
      ? summary.completedTasks.map(t => `<li style="color:#10B981;margin:4px 0">✅ ${escHtml(t)}</li>`).join('')
      : '<li style="color:#94A3B8">완료된 업무 없음</li>';

    const pendingList = summary.pendingTasks.length
      ? summary.pendingTasks.map(t => `<li style="color:#EF4444;margin:4px 0">⏳ ${escHtml(t)}</li>`).join('')
      : '<li style="color:#94A3B8">남은 업무 없음</li>';

    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif">
      <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- 헤더 -->
        <div style="background:linear-gradient(135deg,#4A6CF7,#06B6D4);padding:28px 32px;color:#fff">
          <h1 style="margin:0;font-size:22px">📊 일일 결산 리포트</h1>
          <p style="margin:6px 0 0;opacity:0.9;font-size:14px">${summary.date}</p>
          <p style="margin:4px 0 0;opacity:0.8;font-size:13px">작성자: ${escHtml(summary.userName)}</p>
        </div>

        <!-- KPI -->
        <div style="display:flex;padding:20px 32px;gap:16px;border-bottom:1px solid #E2E8F0">
          <div style="flex:1;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#4A6CF7">${summary.completionRate}%</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:4px">완료율</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#10B981">${summary.done}</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:4px">완료</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#F59E0B">${summary.inProgress}</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:4px">진행중</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#EF4444">${summary.urgent}</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:4px">긴급</div>
          </div>
        </div>

        <!-- 완료 업무 -->
        <div style="padding:20px 32px;border-bottom:1px solid #E2E8F0">
          <h3 style="margin:0 0 10px;font-size:14px;color:#1E293B">✅ 완료 업무 (${summary.done}건)</h3>
          <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8">${completedList}</ul>
        </div>

        <!-- 미완료 업무 -->
        <div style="padding:20px 32px;border-bottom:1px solid #E2E8F0">
          <h3 style="margin:0 0 10px;font-size:14px;color:#1E293B">⏳ 진행/대기 업무 (${summary.total - summary.done}건)</h3>
          <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.8">${pendingList}</ul>
        </div>

        ${summary.note ? `
        <!-- 퇴근 노트 -->
        <div style="padding:20px 32px;border-bottom:1px solid #E2E8F0">
          <h3 style="margin:0 0 10px;font-size:14px;color:#1E293B">📝 퇴근 노트</h3>
          <div style="background:#F8FAFC;padding:12px 16px;border-radius:8px;font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.6">${escHtml(summary.note)}</div>
        </div>
        ` : ''}

        <!-- 푸터 -->
        <div style="padding:16px 32px;text-align:center;font-size:11px;color:#94A3B8">
          WorkBoard Pro &copy; 2024 – 자동 생성된 결산 리포트
        </div>
      </div>
    </body>
    </html>`;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, sendDailyReport, requestAccess };
})();
