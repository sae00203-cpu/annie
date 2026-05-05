# 🌱 학원 관리 시스템

학생 성적 관리 + 학부모 공유 링크 기능을 갖춘 웹 앱입니다.

---

## Railway 배포 순서 (5단계)

### 1단계 — GitHub 저장소 만들기
1. github.com 접속 → 새 저장소(repository) 생성
2. 이 폴더 전체를 업로드하거나 아래 명령어 실행:

```bash
git init
git add .
git commit -m "첫 배포"
git remote add origin https://github.com/아이디/저장소명.git
git push -u origin main
```

### 2단계 — Railway 프로젝트 생성
1. railway.app 접속 → **New Project**
2. **Deploy from GitHub repo** 선택
3. 방금 만든 저장소 선택 → Deploy Now 클릭

### 3단계 — PostgreSQL 데이터베이스 추가
1. Railway 프로젝트 화면에서 **+ Add Service** 클릭
2. **Database → PostgreSQL** 선택
3. 자동으로 `DATABASE_URL` 환경변수가 앱에 연결됨 ✅

### 4단계 — 환경변수 설정
1. 앱 서비스 클릭 → **Variables** 탭
2. 아래 변수 추가:
   - `NODE_ENV` = `production`
3. `DATABASE_URL`은 PostgreSQL 추가 시 자동 설정됨

### 5단계 — 도메인 확인
1. 앱 서비스 → **Settings** → **Networking**
2. **Generate Domain** 클릭
3. 발급된 URL로 접속하면 완료! 🎉

---

## 폴더 구조

```
academy-app/
├── backend/
│   ├── server.js         # 메인 서버
│   ├── db.js             # DB 연결 및 테이블 초기화
│   ├── routes/
│   │   ├── students.js   # 학생 CRUD API
│   │   ├── reports.js    # 성적표 API
│   │   └── public.js     # 학부모 공개 링크 API
│   └── package.json
├── frontend/
│   └── public/
│       └── index.html    # 프론트엔드 (단일 파일)
├── Procfile              # Railway 실행 명령
└── .gitignore
```

## API 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/students | 전체 학생 목록 |
| POST | /api/students | 학생 추가 |
| PUT | /api/students/:id | 학생 수정 |
| DELETE | /api/students/:id | 학생 삭제 |
| POST | /api/reports | 성적표 저장 |
| GET | /api/public/report/:token | 학부모 성적표 조회 |

## 학부모 링크 구조

성적표 저장 시 고유 토큰이 생성됩니다.
학부모는 `https://your-app.railway.app/view/토큰` 링크로 로그인 없이 성적표를 확인합니다.
