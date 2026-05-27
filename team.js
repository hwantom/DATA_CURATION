/* ============================================================
   WorkBoard Pro – Team Module
   팀 업무 분장, 배정, 실시간 공유
   ============================================================ */

const Team = (() => {
  let teamTasks = [];
  let unsubscribe = null;
  let listeners = [];

  /* ── 데모 업무 데이터 ── */
  function demoTasks() {
    const now = Date.now();
    return [
      { id: 't1', title: '기획안 초안 작성',       assignedTo: 'demo-user-001', assigneeName: '민승환', status: 'progress',  priority: 'high',   deadline: _addDays(2),  createdAt: now - 86400000, description: '프로젝트 기획안 1차 초안' },
      { id: 't2', title: '발표 자료 제작',          assignedTo: 'demo-user-001', assigneeName: '민승환', status: 'waiting',   priority: 'high',   deadline: _addDays(5),  createdAt: now - 172800000, description: '최종 발표 PPT' },
      { id: 't3', title: '데이터 분석 보고서 정리', assignedTo: 'demo-user-001', assigneeName: '민승환', status: 'progress',  priority: 'medium', deadline: _addDays(0),  createdAt: now - 259200000, description: '' },
      { id: 't4', title: '팀 회의 준비',            assignedTo: 'demo-user-001', assigneeName: '민승환', status: 'done',      priority: 'low',    deadline: _addDays(-1), createdAt: now - 345600000, description: '' },
      { id: 't5', title: '최종 제출 파일 압축',     assignedTo: 'demo-user-001', assigneeName: '민승환', status: 'waiting',   priority: 'medium', deadline: _addDays(7),  createdAt: now - 432000000, description: '' },
      { id: 't6', title: 'UI 디자인 리뷰',          assignedTo: 'demo-user-001', assigneeName: '민승환', status: 'progress',  priority: 'high',   deadline: _addDays(1),  createdAt: now - 100000000, description: '' },
    ];
  }

  function _addDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  /* ── 초기화 ── */
  function init() {
    if (isDemoMode()) {
      teamTasks = demoTasks();
      notifyListeners();
      return;
    }
    listenToTasks();
  }

  /* ── Firestore 실시간 리스너 ── */
  function listenToTasks() {
    const team = Auth.getTeam();
    if (!team) return;

    if (unsubscribe) unsubscribe();

    unsubscribe = FS.tasks(team.id)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        teamTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notifyListeners();
      }, err => {
        console.error('업무 리스너 에러:', err);
      });
  }

  /* ── CRUD ── */
  async function addTask(taskData) {
    const user = Auth.getUser();
    const team = Auth.getTeam();
    if (!user || !team) return null;

    const task = {
      title:        taskData.title,
      description:  taskData.description || '',
      assignedTo:   taskData.assignedTo || user.uid,
      assigneeName: taskData.assigneeName || user.displayName,
      status:       'waiting',
      priority:     taskData.priority || 'medium',
      deadline:     taskData.deadline || '',
      createdBy:    user.uid,
      createdAt:    isDemoMode() ? Date.now() : FS.timestamp(),
      updatedAt:    isDemoMode() ? Date.now() : FS.timestamp()
    };

    if (isDemoMode()) {
      task.id = 't-' + Date.now();
      teamTasks.unshift(task);
      notifyListeners();
      return task;
    }

    try {
      const ref = await FS.tasks(team.id).add(task);
      return { id: ref.id, ...task };
    } catch (err) {
      console.error('업무 추가 실패:', err);
      return null;
    }
  }

  async function updateTask(taskId, updates) {
    const team = Auth.getTeam();
    if (!team) return;

    if (isDemoMode()) {
      const idx = teamTasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        teamTasks[idx] = { ...teamTasks[idx], ...updates };
        notifyListeners();
      }
      return;
    }

    try {
      updates.updatedAt = FS.timestamp();
      await FS.tasks(team.id).doc(taskId).update(updates);
    } catch (err) {
      console.error('업무 업데이트 실패:', err);
    }
  }

  async function deleteTask(taskId) {
    const team = Auth.getTeam();
    if (!team) return;

    if (isDemoMode()) {
      teamTasks = teamTasks.filter(t => t.id !== taskId);
      notifyListeners();
      return;
    }

    try {
      await FS.tasks(team.id).doc(taskId).delete();
    } catch (err) {
      console.error('업무 삭제 실패:', err);
    }
  }

  /* ── 통계 ── */
  function getStats() {
    const total   = teamTasks.length;
    const done    = teamTasks.filter(t => t.status === 'done').length;
    const inProg  = teamTasks.filter(t => t.status === 'progress').length;
    const waiting = teamTasks.filter(t => t.status === 'waiting').length;
    const today   = new Date().toISOString().split('T')[0];
    const urgent  = teamTasks.filter(t => {
      if (!t.deadline || t.status === 'done') return false;
      const diff = Math.round((new Date(t.deadline) - new Date(today)) / 86400000);
      return diff >= 0 && diff <= 3;
    }).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    return { total, done, inProg, waiting, urgent, pct };
  }

  function getMyTasks() {
    const user = Auth.getUser();
    if (!user) return [];
    return teamTasks.filter(t => t.assignedTo === user.uid);
  }

  function getTasksByMember(uid) {
    return teamTasks.filter(t => t.assignedTo === uid);
  }

  function getUrgentTasks() {
    const today = new Date().toISOString().split('T')[0];
    return teamTasks.filter(t => {
      if (!t.deadline || t.status === 'done') return false;
      const diff = Math.round((new Date(t.deadline) - new Date(today)) / 86400000);
      return diff >= 0 && diff <= 3;
    });
  }

  /* ── 이벤트 ── */
  function onChange(cb) { listeners.push(cb); }
  function notifyListeners() { listeners.forEach(cb => cb(teamTasks)); }

  /* ── 정리 ── */
  function destroy() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    teamTasks = [];
    listeners = [];
  }

  return {
    init, destroy,
    addTask, updateTask, deleteTask,
    getStats, getMyTasks, getTasksByMember, getUrgentTasks,
    getTasks: () => teamTasks,
    onChange
  };
})();
