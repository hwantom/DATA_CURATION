# WorkBoard Pro – 업무 종합 대시보드

## 제작자 정보

| 항목 | 내용 |
|------|------|
| 이름 | 민승환 |
| 학번 | 202101308 |

---

## 프로젝트 소개

**WorkBoard Pro**는 팀 협업 업무 종합 대시보드입니다.  
Google OAuth 로그인, 실시간 채팅, 업무 분장, 결산 분석, 포스트잇 메모 등 다양한 기능을 **16:9 한 화면**에 통합하여 제공합니다.

---

## 주요 기능 (카드 12개)

### 🔐 인증 & 팀 관리
1. **Google OAuth 로그인** – Firebase Authentication 기반 Google 계정 로그인
2. **팀장/팀원 역할 관리** – 팀 생성(팀장), 팀 참가(팀원, 코드 입력)
3. **팀 업무 분장/공유** – 팀원에게 업무 배정, 실시간 상태 공유 (Firestore)

### 📊 대시보드 카드
4. **통계 카드 (4개)** – 전체/완료/진행중/긴급 업무 현황
5. **주간 캘린더** – 일별 도넛 차트로 주간 업무 완료율 시각화
6. **D-Day 관리** – 마감 임박 업무 D-Day 카운트다운
7. **오늘의 업무** – 업무 추가/완료/삭제 + 진행률 바
8. **우선순위 TOP 3** – 미완료 업무 자동 순위 표시

### 💬 협업
9. **업무용 SNS 채팅** – Slack 스타일 실시간 메시징 (1:1 + 단체 + 스레드)
10. **포스트잇 메모** – 드래그 가능한 스티키 노트 (색상 6종)

### 📈 분석 & 도구
11. **결산 분석** – 일일/주간/월간/분기/연간 결산 (차트 + 히트맵)
12. **집중 타이머** – 포모도로 타이머 (25/10/5분)
13. **퇴근 노트** – localStorage 자동 저장
14. **Google 캘린더** – 일정 동기화 위젯

### 🎁 보너스
15. **Gmail 자동 결산 발송** – 일일 결산 리포트 HTML 이메일
16. **생산성 점수** – 업무 완료율 + 타이머 + 노트 기반 점수

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프론트엔드 | HTML5, CSS3 (글래스모피즘), Vanilla JavaScript (ES6+) |
| 폰트 | Google Fonts (Inter) |
| 인증 | Firebase Authentication (Google OAuth) |
| 데이터베이스 | Firebase Firestore (실시간 동기화) |
| API | Gmail API, Google Calendar API |
| 로컬 저장 | Web Storage API (localStorage) |
| 서버 | Node.js + Express (Railway 배포) |
| 디자인 | 글래스모피즘, 그라데이션, 마이크로 애니메이션 |

---

## 실행 방법

### 로컬 실행
```bash
cd work-dashboard
npm install
npm start
# → http://localhost:3000
```

### Firebase 설정 (선택)
1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. Authentication → Google 로그인 활성화
3. Firestore Database 생성
4. `firebase-config.js`에 프로젝트 설정 입력
5. Firebase 미설정 시 **데모 모드**로 모든 기능 체험 가능

### Railway 배포
1. GitHub에 Push
2. [Railway](https://railway.app)에서 GitHub 연동
3. 자동 배포 (Node.js 감지)

---

## 파일 구조

```
work-dashboard/
├── index.html          # 메인 HTML (로그인 + 대시보드 + 모달)
├── style.css           # 프리미엄 디자인 시스템 (글래스모피즘)
├── script.js           # 코어 로직 (모듈 통합 + 기존 기능)
├── firebase-config.js  # Firebase SDK 초기화
├── auth.js             # Google OAuth + 역할 관리
├── team.js             # 팀 업무 CRUD + 실시간 동기화
├── chat.js             # 실시간 SNS 채팅 (Slack 스타일)
├── postit.js           # 드래그 가능 포스트잇 메모
├── analytics.js        # 일일/주간/월간/분기/연간 결산
├── gmail.js            # Gmail API 결산 이메일 발송
├── calendar-sync.js    # Google Calendar 연동
├── server.js           # Express 정적 서버 (Railway용)
├── package.json        # Node.js 패키지 설정
├── README.md           # 프로젝트 설명
└── github-link.txt     # GitHub 링크
```

---

## 제출 안내

- GitHub 저장소: `github-link.txt` 참조
- Railway 배포 URL: (배포 후 기재)
- Firebase 미설정 시에도 **데모 모드**로 모든 기능 동작

---

*WorkBoard Pro – 팀 협업 업무 종합 대시보드 © 2024 민승환*
