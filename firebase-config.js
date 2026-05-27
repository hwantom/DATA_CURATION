/* ============================================================
   WorkBoard Pro – Firebase Configuration
   ⚠️ Firebase Console에서 발급받은 실제 값으로 교체하세요!
   ============================================================ */

// ── Firebase 설정 (Firebase Console → 프로젝트 설정 → 일반 → Firebase SDK snippet) ──
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── Google API 설정 (Google Cloud Console → API & Services → Credentials) ──
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_API_KEY   = "YOUR_GOOGLE_API_KEY";

// Gmail / Calendar 스코프
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

/* ── Firebase 초기화 ── */
let app, db, auth, googleProvider;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('⚠️ Firebase SDK가 로드되지 않았습니다.');
      return false;
    }
    // 이미 초기화된 경우 재사용
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.apps[0];
    }

    db   = firebase.firestore();
    auth = firebase.auth();

    // Google 로그인 Provider
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');

    // 한국어 UI
    auth.languageCode = 'ko';

    console.log('✅ Firebase 초기화 완료');
    return true;
  } catch (err) {
    console.error('❌ Firebase 초기화 실패:', err);
    return false;
  }
}

/* ── Firestore 헬퍼 ── */
const FS = {
  // 컬렉션 참조
  users:    () => db.collection('users'),
  teams:    () => db.collection('teams'),
  tasks:    (teamId) => db.collection('teams').doc(teamId).collection('tasks'),
  chats:    () => db.collection('chats'),
  messages: (chatId) => db.collection('chats').doc(chatId).collection('messages'),
  postits:  (teamId) => db.collection('teams').doc(teamId).collection('postits'),
  analytics:(teamId) => db.collection('teams').doc(teamId).collection('analytics'),

  // 서버 타임스탬프
  timestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
  arrayUnion:  (...vals) => firebase.firestore.FieldValue.arrayUnion(...vals),
  arrayRemove: (...vals) => firebase.firestore.FieldValue.arrayRemove(...vals),
};

/* ── 데모 모드 (Firebase 미설정 시) ── */
function isDemoMode() {
  return firebaseConfig.apiKey === "YOUR_API_KEY";
}
