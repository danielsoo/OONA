# 데모 사이트 (어드바이저·투자자 체험용)

실서비스와 **같은 코드**를 별도 Firebase 프로젝트에 붙여서, 가짜 데이터로 가득 찬 사이트를 하나 더 띄운다. 어드바이저는 데모 계정으로 로그인해서 둘러보기·Society·프로필·포트폴리오 링크·메시지·알림·팔로우·업로드까지 써 볼 수 있고, 실서비스 DB는 건드리지 않는다.

- **가짜 세계:** `src/lib/demo-world.ts` (사람 101명, 작품 40개, 학교 12곳, 스틸). Society의 앱 내 데모(`/society?demo=1`)와 같은 데이터다.
- **채우기/초기화:** `scripts/demo-seed.mjs` (`npm run demo:seed`, `npm run demo:reset`). 실제로 쓰는 문서는 `scripts/lib/demo-seed-data.mjs`가 만든다 (테스트: `scripts/lib/demo-seed-data.test.mjs`).
- **표시:** `NEXT_PUBLIC_APP_ENV=demo`이면 모든 페이지 하단에 "Demo site" 표시, 제목에 "(demo)", 검색엔진 색인 안 함.
- **영상:** 데모 작품에는 Cloudflare 영상이 없다. 목록·시청 페이지는 포스터(스틸)를 보여 주고, 재생 버튼은 "재생할 영상이 없어요"로 꺼진다. 샘플 영상을 주면 재생된다 (아래 "영상").
- **결제:** 쓰지 않는다. 업로더 보증금은 코드에서 꺼져 있다.

## 채워지는 것

| 무엇 | 내용 |
|------|------|
| 사람 | 101명 + 어드바이저 5명. 모두 프로필 완성, Society에 노출, 핸들은 `lena`, `haneul` 같은 이름 |
| 작품 | 세계 작품 40개 + 어드바이저마다 자기 작품 2개 = 50개. 감독(없으면 첫 크루)이 주인, 크루 전원이 크레딧(수락됨) |
| 학교 | 12곳, 학교 페이지·랭킹에 작품 수 반영 |
| 팔로우 | 720개 (팔로워·팔로잉 수 일치) |
| 어드바이저마다 | 메시지 3개(하나는 안 읽음), 크루 그룹방 1개, 받은 구직 제안 1개, 알림(팔로워·제안·작품 승인), 포트폴리오 링크 1개, Riverside 재학 인증, 조회수 통계 |

로그인 계정: `advisor1@oona-demo.test` ~ `advisor5@oona-demo.test` (이름은 Alex Morgan, Jamie Cho, Riley Sato, Sam Ortiz, Taylor Kwon). 비밀번호는 채울 때 정한다. 관리자 권한은 없다.

## 한 번만 하는 설정

### 1. Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com) → **프로젝트 추가** → 이름 예: `oona-demo` (프로젝트 ID를 적어 둔다).
2. **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 사용 설정. Google 로그인도 쓰려면 Google도 켜고, **설정 → 승인된 도메인**에 데모 사이트 도메인을 추가한다.
3. **Firestore Database** → 데이터베이스 만들기 → **데이터베이스 ID를 `xiio`** 로 (실서비스와 같은 이름이라 `firebase.json`을 그대로 쓴다). 위치는 실서비스와 같게, 프로덕션 모드로.
4. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가** → 나오는 `firebaseConfig` 값들을 적어 둔다.
5. **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성** → JSON 다운로드. 데모 프로젝트 전용이며 커밋하지 않는다.
6. (업로드까지 체험하게 하려면) **Storage** → 시작하기. 업로드는 Storage를 거쳐 Cloudflare로 간다.

### 2. 규칙·인덱스 배포 (데모 프로젝트에)

```bash
npx firebase login
npx firebase deploy --only firestore --project oona-demo
```

Console → Firestore → `xiio` → 색인에서 전부 **사용 설정됨**이 될 때까지 몇 분 기다린다. (알림·구직 제안·학교 페이지가 쓰는 인덱스가 여기 포함돼 있다. 인덱스가 없으면 그 페이지가 비거나 오류가 난다.)

### 3. Vercel에 데모 배포 만들기

같은 Vercel 프로젝트에서 **`demo` 브랜치**를 데모 사이트로 쓴다.

1. GitHub에 `demo` 브랜치를 만든다 (`main`에서). 데모를 최신으로 맞출 때는 `main`을 `demo`에 머지해서 푸시한다.
2. Vercel → 프로젝트 → **Settings → Environment Variables**에서 아래를 **Preview** 환경, **Branch: `demo`** 로 한정해서 넣는다. (실서비스 값과 섞이지 않게 꼭 브랜치를 지정)

| 변수 | 값 |
|------|----|
| `NEXT_PUBLIC_APP_ENV` | `demo` |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | 1-4에서 적어 둔 데모 웹 앱 값 |
| `NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID`, `FIREBASE_FIRESTORE_DATABASE_ID` | `xiio` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 1-5 JSON 파일 내용 전체 (한 줄) |
| `NEXT_PUBLIC_APP_URL` | 데모 사이트 주소 (예: 연결한 `demo.` 도메인) |

3. (선택) **Settings → Domains**에서 `demo` 브랜치에 도메인을 붙인다 (예: `demo.<도메인>`).
4. `demo` 브랜치를 푸시하면 데모 사이트가 배포된다.

**넣지 말 것:** `NEXT_PUBLIC_DEMO_MODE` (켜면 영화 페이지가 시드 대신 예전 목업을 보여 준다), 실서비스 `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_*` (데모 계정이 관리자가 되면 안 된다), Stripe 키.

**업로드를 실제로 되게 하려면:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`도 넣는다. 실서비스 Cloudflare 계정을 같이 쓰면 데모 업로드가 실서비스 영상 목록에 섞이고 비용도 같이 나가므로, 가능하면 데모용 Cloudflare 계정을 따로 쓴다. 넣지 않으면 업로드 화면까지는 둘러볼 수 있고 마지막 영상 전송에서 멈춘다. 카카오·네이버 로그인을 데모에서도 쓰려면 각 개발자 콘솔에 데모 도메인을 등록하고 키를 넣는다 (안 넣으면 그 버튼만 동작하지 않는다).

### 4. 가짜 데이터 채우기

```bash
# 데모 프로젝트 키로 (실서비스 키면 스크립트가 거부한다)
export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/oona-demo-xxxx.json)"

# 먼저 무엇을 쓸지 확인 (아무것도 안 씀)
npm run demo:seed -- --project oona-demo --database xiio

# 실제로 채우기
npm run demo:seed -- --project oona-demo --database xiio --apply --password '어드바이저용-비밀번호'
```

끝나면 로그인 계정 목록이 출력된다. 어드바이저에게 데모 사이트 주소와 계정 하나씩 주면 된다. `--password`를 빼면 비밀번호를 하나 만들어서 출력한다.

## 처음 상태로 되돌리기

어드바이저들이 데이터를 어질렀을 때:

```bash
npm run demo:reset -- --project oona-demo --database xiio --apply --password '어드바이저용-비밀번호'
```

DB 안의 **모든 것**(시드와 어드바이저들이 만든 것)과 데모 로그인 계정을 지우고 다시 채운다. 사이트는 목록을 1분, 시청 페이지를 5분 동안 기억하므로, 되돌린 직후 잠깐은 예전 내용이 보일 수 있다.

**안전장치:**
- 실서비스 프로젝트(`xiio-9d86b`)와 그 서비스 계정 키는 이름으로 거부한다.
- 이 스크립트가 남긴 표시 문서(`site/demoSeed`)가 있는 DB만 지운다.
- 표시 없이 사용자가 들어 있는 DB는 채우지도 지우지도 않는다.

## 영상

기본은 **포스터만**이다. 샘플 영상이 있으면 채울 때(또는 되돌릴 때) 넘겨 준다. 작품마다 돌아가며 붙는다.

```bash
npm run demo:reset -- --project oona-demo --database xiio --apply --password '…' \
  --sample-video https://…/clip1.mp4 --sample-video https://…/clip2.mp4
```

https 주소의 `.mp4`나 HLS `.m3u8`이면 된다. 직접 찍은 영상이나 사용권이 확실한 영상만 쓰고, 실제 유저 영상은 쓰지 않는다.

## 내 컴퓨터에서 미리 보기 (에뮬레이터)

`firebase.json`에는 Auth 에뮬레이터 설정이 없으므로, 아래 내용의 `firebase.json`을 둔 빈 폴더에 `firestore.rules`, `firestore.indexes.json`을 복사해서 거기서 에뮬레이터를 띄운다.

```json
{
  "firestore": [{ "database": "xiio", "rules": "firestore.rules", "indexes": "firestore.indexes.json" }],
  "auth": {},
  "emulators": { "auth": { "port": 9099 }, "firestore": { "port": 8080 }, "ui": { "enabled": false }, "singleProjectMode": true }
}
```

```bash
# 터미널 1 (위 폴더에서): Auth + Firestore 에뮬레이터
npx firebase emulators:start --only auth,firestore --project demo-oona

# 터미널 2 (OONA 폴더): 채우기
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-oona
npm run demo:seed -- --project demo-oona --database xiio --apply --password demo-pass

# 같은 터미널: 앱 (NEXT_PUBLIC_FIREBASE_EMULATOR_HOST가 브라우저 쪽을 에뮬레이터에 붙인다)
export NEXT_PUBLIC_APP_ENV=demo NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1 \
  NEXT_PUBLIC_FIREBASE_API_KEY=demo-key NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-oona \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-oona.firebaseapp.com NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID=xiio
npm run build && npx next start
```

에뮬레이터는 인덱스를 요구하지 않으므로, 인덱스 문제는 실제 데모 프로젝트에서만 드러난다 (2단계를 꼭 할 것).
