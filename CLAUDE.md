# 앤도버 생활기록 — Claude 작업 메모

새 대화를 시작하면 이 파일부터 읽어요. 사용자와 그동안 정한 규칙과 작업 방법을 모아 둔 곳이에요.
새로 정한 규칙이 생기면 여기에 짧게 추가해요.

## 사용자
- 학원 **관리자**예요 ("원장" 아님. 화면 문구도 "관리자"). 개발자가 아니에요.
- 답은 **한국어로, 짧고 쉽게**. 코드 설명 대신 "어디서 무엇을 누르면 되는지"로 설명해요.
- 원하는 모양은 사진이나 예시 파일로 자주 보내줘요. 그 모양에 최대한 맞춰요.
- 한 번 말한 규칙은 다시 묻지 않게 이 파일에 적어 둬요.

## 꼭 지킬 것
- **학생 데이터는 절대 커밋하지 않아요**: `data/`, `store.json`, 성적·기록 JSON, 사용자가 보낸 엑셀 등.
  변환 결과물은 스크래치패드에 만들어 사용자에게 파일로 보내요.
- 작업 브랜치: `claude/academy-program-standalone-4mhcjb` 에만 커밋·푸시. PR은 요청할 때만.
- 비밀번호·키는 채팅으로 받지 않아요. Firebase 서비스 계정 JSON은 GitHub Secrets(`FIREBASE_SERVICE_ACCOUNT`)에만.
- 사용자 이메일은 공개하지 않아요. `cloud/firestore.rules` 의 `ANNIE_EMAIL` 자리표시는 그대로 둬요.
- 커밋 메시지·코드에 모델 이름을 넣지 않아요.

## 구조
- 앱 전체가 파일 하나: `public/andover-app.html` (HTML+CSS+JS, 상태는 클로저 안의 `S`).
- 클라우드 버전: `cloud/cloud.js` (Firestore `docs` 컬렉션, `window.ANDOVER_CLOUD` API: me / isAdmin / staffList / setActive / setAdmin / importStore / exportStore / trash).
  지운 문서는 `old` 필드를 남겨 휴지통에서 되살릴 수 있어요.
- `cloud/firestore.rules`: 메인 관리자(isMain) + 직원 중 `admin==true` 도 관리자.
  **규칙을 바꾸면 사용자가 Firebase 콘솔(Firestore → 규칙)에 직접 붙여넣어야 해요.** 꼭 알려줘요.
- 단독 실행(학원 PC) 버전: `server.js`, `public/standalone.js`, `start-*.{bat,command}`, 데이터는 `data/`.
- 가이드: `docs/guide/`, 보고서 자원: `docs/report/`.

## 빌드와 배포 (고친 뒤 매번)
1. `public/andover-app.html` 의 버전 표시를 올려요: `<p class="appver" id="appVer">버전 11.28-N</p>` (N+1).
   사용자는 왼쪽 메뉴 아래 이 번호로 새 버전이 올라갔는지 확인해요. 답에 새 번호를 꼭 알려줘요.
2. `python3 tools/build_cloud.py` → `docs/app/` 갱신 (`hosting/`은 깃에 안 올라가요, Actions가 만들어요).
3. `python3 tools/demo/build_demo.py <스크래치폴더>` → `docs/index.html`(GitHub Pages 체험판) + 테스트용 `andover-demo.html`.
4. 커밋·푸시하면 GitHub Actions(`.github/workflows/firebase-hosting.yml`)가 andover-record.web.app 에 올려요.
- 영어 화면 번역 추가: `python3 tools/add_i18n.py '{"한국어":"English"}'`.

## 테스트 방법
- Playwright(설치돼 있음)로 체험판 `andover-demo.html` 을 열어 확인해요. 시작 안내창은 `[role=note]` 를 숨겨요.
- 엑셀 CDN은 막혀 있을 수 있어요 → `public/vendor/xlsx.full.min.js` 로 route.
- 내부 함수를 직접 부르고 싶으면 사본에서 `function lpdFit(ov){` 앞에 `window.__T=function(){return {S:S, lpdPages:lpdPages, ...}};` 를 끼워 넣어요.
- 컴퓨터(1360~1600px)와 휴대폰(`devices['iPhone 13']`) 둘 다 스크린샷으로 확인하고, 사용자에게 보여줄 땐 사진을 같이 보내요.
- 쉘에서 heredoc/sed 가 막히면 Write 도구로 파일을 만들어요.

## 화면 구성 (왼쪽 메뉴 순서)
월간 일정(첫 화면) · 오늘 수업 · 레슨플랜 · 코칭 · 온라인·영상 · 월간 리포트 · 학생 기록 · 대시보드, 그리고 ⚙ 설정.
- 설정은 큰 탭 **반 관리 / 학원 관리**.
- 반 관리 항목 순서: 반이름 → 레벨 → 담당 → 수업요일 → 학생 → 온라인 학습 사이트 → 스피킹인증 레벨 → 교재·달별 시수.
  항목 사이 간격은 넉넉하게. 종료된 반은 토글 뒤에 숨겨요.
- **반 합치기 / 지운 반 되살리기** 탭은 관리자만 봐요.

## 학원 규칙 (정해진 것)
- **학년도는 1월~12월** (3월 시작 아님). 2026년 1~12월, 2027년 1~12월. 연간 계획의 "[27]", "(27년)" 은 연도 표시예요.
- 달력은 **일요일부터** 시작.
- Session 기간은 반마다 달라요. 다음 Session은 이전 끝 다음 날이 아니라 **그 반의 첫 수업 요일**에 맞춰 시작해요 (`sessRange`).
- 2027년 준비: 반 이름 변경 예약, 반 운영기간(시작·끝), 요일 변경 예약, **반 편성 예약**(날짜별로 쌓임, 덮어쓰지 않음), 신규생은 첫 수업일(enrolledAt).
  예약일이 지나면 "변경 예정" 표시는 안 보여요. 달력에는 "2027 Session 시작"처럼 짧게.

## 레슨플랜
- 만들기: Syllabus 올리기, 연간 교재 계획(엑셀), 반별 달별 시수, 교재별 Unit/Day 수.
- 레슨플랜 칸에는 **Unit·Day만** (예: "Unit 3 Day 2"), "23회" 같은 회차는 안 보여요. 오늘 수업 탭도 같아요.
- 담당 선생님이 쓰는 것: 맨 위 **Notice(이달의 공지) 한 칸** + 날마다 **단어시험** 칸.
- 교재별 **단어시험 패턴**·**준비 과제**(예: Trophy 9 은 매 Day 4 마다 Role Play)는 그 수업의 **바로 전 수업일**에 자동으로 채워져요.
- 행사(Voca King, 정기평가)는 시수에 포함, 날짜를 골라 넣고 달력에는 제목만.
- 설정 → 레슨플랜 기준: 교재 목록(Unit/Days, 숙제, 단어시험, 준비 칸), 엑셀 업로드로 자동 적용, 여러 개 골라 지우기.
  분류: **Grammar / Reading / Trophy 9 / Writing / Speaking / Phonics / 기타**, 열고 닫기. 교재 고르기는 A–Z 찾기.
- 한셀(한컴) xlsx 도 읽어요 (XLSX.read 가 빈 시트를 주면 XML로 다시 읽음).

## 레슨플랜 PDF (학원 양식)
- A4 가로. 잘리는 것 없이 한 장에 맞춰요 (넘치면 글자를 줄임, `lpdFit`).
- **주 2회반: 한 장에 4일. 주 3회 이상: 한 장에 6일 (3일씩 두 줄, 양면 인쇄).** 실제 수업일로 판단하고, PDF 화면 버튼으로 반마다 직접 고를 수 있어요 (`S.cfg.lpPdfN`).
- 과목별 색이 정해져 있어요 (`lpdColor`). 제목은 한 줄, Session·기간 줄은 크게. 폰트는 **원래 폰트 유지** (보고서 폰트로 바꾸지 말 것).
- 숙제 줄마다 앞에 학생이 체크하는 네모 칸.

## 월간 일정 (첫 화면)
- 관리자: 날짜를 눌러 일정 넣기. 색, 시간(시작~끝), 메모, 반복(매주 요일 여러 개 / 격주 / 매달 같은 날, 끝나는 날).
  선생님은 눌러서 보기만. 저장 위치 `S.cfg.cal`.
- 여러 날 일정은 **이어진 막대 하나**로 (날마다 반복 표시 금지). 휴대폰에서도 달력 모양 + 일정 창은 스크롤.
- 휴강·보강·공휴일·Voca King·정기평가·새 Session은 다른 화면 데이터로 자동 표시.

## 관리자 기능
- 관리자 여러 명 가능 (직원 목록에서 관리자 지정). 기록한 사람(감사) 페이지, 반 합치기, 지운 반 되살리기, 클라우드 휴지통.
- 학원 PC 데이터 올리기: `store.json` 을 관리자 화면에서 가져오기 (중복 반이 생기면 반 합치기로 정리).

## 해 볼 만한 것 (사용자에게 제안만 한 상태)
- 반복 일정에서 "이 날만 빼기" (`calRepHit` 은 이미 `x.skip` 을 봐요, 화면만 없음).
- 철자 다른 같은 학생 합치기, PDF 로고 이미지.
