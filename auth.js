/* ============================================================
   WorkBoard Pro – Authentication Module
   Google OAuth 로그인 + 역할 관리 + 팀 시스템
   ============================================================ */

const Auth = (() => {
  let currentUser = null;
  let currentTeam = null;
  let userProfile = null;
  let authStateListeners = [];

  /* ── 데모 사용자 (Firebase 미설정 시) ── */
  const DEMO_USER = {
    uid: 'demo-user-001',
    displayName: '민승환',
    email: 'demo@workboard.pro',
    photoURL: null,
    role: 'admin',
    teamId: 'demo-team'
  };

  const DEMO_TEAM = {
    id: 'demo-team',
    name: 'WorkBoard 팀',
    code: 'WB2024',
    createdBy: 'demo-user-001',
    members: ['demo-user-001'],
    memberNames: { 'demo-user-001': '민승환' },
    memberRoles: { 'demo-user-001': 'admin' },
    memberPhotos: { 'demo-user-001': null }
  };

  /* ── 초기화 ── */
  function init() {
    if (isDemoMode()) {
      console.log('🎮 데모 모드 – Firebase 미설정');
      return;
    }
    // Firebase Auth 상태 감시
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUser = user;
        await loadUserProfile(user);
        notifyListeners('signed-in', userProfile);
      } else {
        currentUser = null;
        userProfile = null;
        currentTeam = null;
        notifyListeners('signed-out', null);
      }
    });
  }

  /* ── Google 로그인 ── */
  async function signInWithGoogle() {
    if (isDemoMode()) {
      // 데모 모드: 바로 로그인 시뮬레이션
      currentUser = DEMO_USER;
      userProfile = { ...DEMO_USER };
      currentTeam = { ...DEMO_TEAM };
      notifyListeners('signed-in', userProfile);
      return userProfile;
    }
    try {
      const result = await auth.signInWithPopup(googleProvider);
      currentUser = result.user;
      await loadUserProfile(result.user);
      return userProfile;
    } catch (err) {
      console.error('로그인 실패:', err);
      throw err;
    }
  }

  /* ── 로그아웃 ── */
  async function signOut() {
    if (isDemoMode()) {
      currentUser = null;
      userProfile = null;
      currentTeam = null;
      notifyListeners('signed-out', null);
      return;
    }
    try {
      await auth.signOut();
    } catch (err) {
      console.error('로그아웃 실패:', err);
    }
  }

  /* ── 유저 프로필 로드/생성 ── */
  async function loadUserProfile(user) {
    if (isDemoMode()) return;
    try {
      const ref = FS.users().doc(user.uid);
      const doc = await ref.get();
      if (doc.exists) {
        userProfile = { uid: user.uid, ...doc.data() };
        if (userProfile.teamId) {
          await loadTeam(userProfile.teamId);
        }
      } else {
        // 신규 사용자
        userProfile = {
          uid:         user.uid,
          displayName: user.displayName || '사용자',
          email:       user.email,
          photoURL:    user.photoURL,
          role:        null,   // 아직 미설정
          teamId:      null,
          createdAt:   FS.timestamp()
        };
        await ref.set(userProfile);
      }
    } catch (err) {
      console.error('프로필 로드 실패:', err);
      userProfile = {
        uid: user.uid,
        displayName: user.displayName || '사용자',
        email: user.email,
        photoURL: user.photoURL,
        role: null,
        teamId: null
      };
    }
  }

  /* ── 역할 설정 ── */
  async function setRole(role) {
    if (!userProfile) return;
    userProfile.role = role;
    if (!isDemoMode()) {
      try {
        await FS.users().doc(userProfile.uid).update({ role });
      } catch (e) { console.error(e); }
    }
  }

  /* ── 팀 생성 (팀장) ── */
  async function createTeam(teamName) {
    if (!userProfile) return null;
    const code = generateTeamCode();
    const teamData = {
      name: teamName,
      code: code,
      createdBy: userProfile.uid,
      members: [userProfile.uid],
      memberNames: { [userProfile.uid]: userProfile.displayName },
      memberRoles: { [userProfile.uid]: 'admin' },
      memberPhotos: { [userProfile.uid]: userProfile.photoURL || null },
      createdAt: isDemoMode() ? new Date().toISOString() : FS.timestamp()
    };

    if (isDemoMode()) {
      const teamId = 'team-' + Date.now();
      currentTeam = { id: teamId, ...teamData };
      userProfile.teamId = teamId;
      userProfile.role = 'admin';
      return currentTeam;
    }

    try {
      const ref = await FS.teams().add(teamData);
      currentTeam = { id: ref.id, ...teamData };
      await FS.users().doc(userProfile.uid).update({
        teamId: ref.id,
        role: 'admin'
      });
      userProfile.teamId = ref.id;
      userProfile.role = 'admin';
      return currentTeam;
    } catch (err) {
      console.error('팀 생성 실패:', err);
      return null;
    }
  }

  /* ── 팀 참가 (팀원) ── */
  async function joinTeam(teamCode) {
    if (!userProfile) return null;

    if (isDemoMode()) {
      currentTeam = { ...DEMO_TEAM };
      currentTeam.members.push(userProfile.uid);
      currentTeam.memberNames[userProfile.uid] = userProfile.displayName;
      currentTeam.memberRoles[userProfile.uid] = 'member';
      currentTeam.memberPhotos[userProfile.uid] = userProfile.photoURL || null;
      userProfile.teamId = currentTeam.id;
      userProfile.role = 'member';
      return currentTeam;
    }

    try {
      const snap = await FS.teams().where('code', '==', teamCode).limit(1).get();
      if (snap.empty) {
        throw new Error('팀 코드를 찾을 수 없습니다.');
      }
      const teamDoc = snap.docs[0];
      const teamId  = teamDoc.id;
      const data    = teamDoc.data();

      // 팀에 멤버 추가
      await FS.teams().doc(teamId).update({
        members: FS.arrayUnion(userProfile.uid),
        [`memberNames.${userProfile.uid}`]:  userProfile.displayName,
        [`memberRoles.${userProfile.uid}`]:  'member',
        [`memberPhotos.${userProfile.uid}`]: userProfile.photoURL || null
      });

      // 유저 프로필 업데이트
      await FS.users().doc(userProfile.uid).update({
        teamId: teamId,
        role: 'member'
      });

      userProfile.teamId = teamId;
      userProfile.role = 'member';
      data.members.push(userProfile.uid);
      currentTeam = { id: teamId, ...data };
      return currentTeam;
    } catch (err) {
      console.error('팀 참가 실패:', err);
      throw err;
    }
  }

  /* ── 팀 로드 ── */
  async function loadTeam(teamId) {
    if (isDemoMode()) {
      currentTeam = { ...DEMO_TEAM };
      return currentTeam;
    }
    try {
      const doc = await FS.teams().doc(teamId).get();
      if (doc.exists) {
        currentTeam = { id: doc.id, ...doc.data() };
      }
      return currentTeam;
    } catch (err) {
      console.error('팀 로드 실패:', err);
      return null;
    }
  }

  /* ── 팀 코드 생성 ── */
  function generateTeamCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /* ── 이벤트 리스너 ── */
  function onAuthStateChanged(callback) {
    authStateListeners.push(callback);
  }

  function notifyListeners(event, data) {
    authStateListeners.forEach(cb => cb(event, data));
  }

  /* ── Getters ── */
  function getUser()    { return userProfile; }
  function getTeam()    { return currentTeam; }
  function isAdmin()    { return userProfile?.role === 'admin'; }
  function isSignedIn() { return !!userProfile; }
  function hasTeam()    { return !!currentTeam; }

  function getTeamMembers() {
    if (!currentTeam) return [];
    return currentTeam.members.map(uid => ({
      uid,
      name:  currentTeam.memberNames?.[uid] || '알 수 없음',
      role:  currentTeam.memberRoles?.[uid] || 'member',
      photo: currentTeam.memberPhotos?.[uid] || null
    }));
  }

  return {
    init,
    signInWithGoogle,
    signOut,
    setRole,
    createTeam,
    joinTeam,
    loadTeam,
    onAuthStateChanged,
    getUser,
    getTeam,
    isAdmin,
    isSignedIn,
    hasTeam,
    getTeamMembers
  };
})();
