/* ============================================================
   WorkBoard Pro – Post-it Module
   드래그 가능한 포스트잇 스티키 노트
   ============================================================ */

const PostIt = (() => {
  let postits = [];
  let container = null;
  let unsubscribe = null;
  let dragState = null;

  const COLORS = [
    { name: '노랑', bg: '#FEF9C3', border: '#FDE047', header: '#EAB308' },
    { name: '분홍', bg: '#FCE7F3', border: '#F9A8D4', header: '#EC4899' },
    { name: '초록', bg: '#D1FAE5', border: '#6EE7B7', header: '#10B981' },
    { name: '파랑', bg: '#DBEAFE', border: '#93C5FD', header: '#3B82F6' },
    { name: '보라', bg: '#EDE9FE', border: '#C4B5FD', header: '#8B5CF6' },
    { name: '주황', bg: '#FED7AA', border: '#FDBA74', header: '#F97316' },
  ];

  /* ── 데모 데이터 ── */
  function demoPostits() {
    return [
      { id: 'p1', text: '📌 오늘 기획안 초안 마무리!', colorIdx: 0, x: 20,  y: 20,  w: 180, h: 120, createdBy: 'demo-user-001', zIndex: 1 },
      { id: 'p2', text: '🔥 발표 자료 목차 정리하기', colorIdx: 1, x: 220, y: 30,  w: 180, h: 120, createdBy: 'demo-user-001', zIndex: 2 },
      { id: 'p3', text: '💡 데이터 분석 시 필터 조건 확인', colorIdx: 2, x: 420, y: 15,  w: 180, h: 120, createdBy: 'demo-user-001', zIndex: 3 },
      { id: 'p4', text: '☕ 오후 3시 팀미팅 준비',    colorIdx: 3, x: 100, y: 155, w: 180, h: 120, createdBy: 'demo-user-001', zIndex: 4 },
    ];
  }

  /* ── 초기화 ── */
  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    if (isDemoMode()) {
      postits = demoPostits();
      render();
      return;
    }
    listenToPostits();
  }

  /* ── Firestore 리스너 ── */
  function listenToPostits() {
    const team = Auth.getTeam();
    if (!team) return;
    if (unsubscribe) unsubscribe();

    unsubscribe = FS.postits(team.id).orderBy('zIndex').onSnapshot(snap => {
      postits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      render();
    });
  }

  /* ── 렌더 ── */
  function render() {
    if (!container) return;
    container.innerHTML = '';

    // 추가 버튼
    const addBtn = document.createElement('button');
    addBtn.className = 'postit-add-btn';
    addBtn.innerHTML = '<span>+</span> 새 메모';
    addBtn.onclick = () => addPostit();
    container.appendChild(addBtn);

    postits.forEach(p => {
      const note = document.createElement('div');
      const color = COLORS[p.colorIdx] || COLORS[0];
      note.className = 'postit-note';
      note.dataset.id = p.id;
      note.style.cssText = `
        left:${p.x}px; top:${p.y}px; width:${p.w}px; min-height:${p.h}px;
        background:${color.bg}; border-color:${color.border};
        z-index:${p.zIndex || 1};
      `;

      note.innerHTML = `
        <div class="postit-header" style="background:${color.header}">
          <div class="postit-colors">
            ${COLORS.map((c, i) => `<span class="postit-cdot${i === p.colorIdx ? ' active' : ''}" data-ci="${i}" style="background:${c.header}" title="${c.name}"></span>`).join('')}
          </div>
          <button class="postit-del" data-id="${p.id}" title="삭제">✕</button>
        </div>
        <div class="postit-body" contenteditable="true" data-id="${p.id}">${escHtml(p.text)}</div>
      `;

      // 드래그
      const header = note.querySelector('.postit-header');
      header.addEventListener('mousedown', (e) => startDrag(e, p.id, note));
      header.addEventListener('touchstart', (e) => startDrag(e, p.id, note), { passive: false });

      // 삭제
      note.querySelector('.postit-del').addEventListener('click', () => deletePostit(p.id));

      // 색상 변경
      note.querySelectorAll('.postit-cdot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          changeColor(p.id, parseInt(dot.dataset.ci));
        });
      });

      // 텍스트 편집
      const body = note.querySelector('.postit-body');
      body.addEventListener('blur', () => {
        updateText(p.id, body.innerText);
      });

      // Z-index 올리기 (클릭 시)
      note.addEventListener('mousedown', () => bringToFront(p.id, note));

      container.appendChild(note);
    });
  }

  /* ── 드래그 ── */
  function startDrag(e, id, el) {
    if (e.target.closest('.postit-cdot') || e.target.closest('.postit-del')) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const rect = el.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    dragState = {
      id,
      el,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      contLeft: contRect.left,
      contTop: contRect.top
    };

    const onMove = (ev) => {
      if (!dragState) return;
      ev.preventDefault();
      const t = ev.touches ? ev.touches[0] : ev;
      const x = t.clientX - dragState.contLeft - dragState.offsetX;
      const y = t.clientY - dragState.contTop - dragState.offsetY;
      dragState.el.style.left = Math.max(0, x) + 'px';
      dragState.el.style.top  = Math.max(0, y) + 'px';
    };

    const onEnd = () => {
      if (dragState) {
        const x = parseInt(dragState.el.style.left) || 0;
        const y = parseInt(dragState.el.style.top) || 0;
        updatePosition(dragState.id, x, y);
        dragState = null;
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  function bringToFront(id, el) {
    const maxZ = Math.max(...postits.map(p => p.zIndex || 1), 0);
    el.style.zIndex = maxZ + 1;
    const p = postits.find(pp => pp.id === id);
    if (p) p.zIndex = maxZ + 1;
  }

  /* ── CRUD ── */
  async function addPostit() {
    const user = Auth.getUser();
    if (!user) return;

    const maxZ = Math.max(...postits.map(p => p.zIndex || 1), 0);
    const data = {
      text: '새 메모를 입력하세요',
      colorIdx: Math.floor(Math.random() * COLORS.length),
      x: 20 + Math.random() * 200,
      y: 20 + Math.random() * 100,
      w: 180,
      h: 120,
      zIndex: maxZ + 1,
      createdBy: user.uid,
      createdAt: isDemoMode() ? Date.now() : FS.timestamp()
    };

    if (isDemoMode()) {
      data.id = 'p-' + Date.now();
      postits.push(data);
      render();
      return;
    }

    try {
      const team = Auth.getTeam();
      if (team) await FS.postits(team.id).add(data);
    } catch (e) { console.error(e); }
  }

  async function deletePostit(id) {
    if (isDemoMode()) {
      postits = postits.filter(p => p.id !== id);
      render();
      return;
    }
    try {
      const team = Auth.getTeam();
      if (team) await FS.postits(team.id).doc(id).delete();
    } catch (e) { console.error(e); }
  }

  async function updatePosition(id, x, y) {
    const p = postits.find(pp => pp.id === id);
    if (p) { p.x = x; p.y = y; }
    if (isDemoMode()) return;
    try {
      const team = Auth.getTeam();
      if (team) await FS.postits(team.id).doc(id).update({ x, y });
    } catch (e) { console.error(e); }
  }

  async function updateText(id, text) {
    const p = postits.find(pp => pp.id === id);
    if (p) p.text = text;
    if (isDemoMode()) return;
    try {
      const team = Auth.getTeam();
      if (team) await FS.postits(team.id).doc(id).update({ text });
    } catch (e) { console.error(e); }
  }

  async function changeColor(id, colorIdx) {
    const p = postits.find(pp => pp.id === id);
    if (p) p.colorIdx = colorIdx;
    if (isDemoMode()) { render(); return; }
    try {
      const team = Auth.getTeam();
      if (team) await FS.postits(team.id).doc(id).update({ colorIdx });
    } catch (e) { console.error(e); }
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function destroy() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    postits = [];
  }

  return { init, destroy, render };
})();
