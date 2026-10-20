# 데모 사이트 (어드바이저·투자자 체험용)

실서비스와 **같은 코드**를 별도 Firebase 프로젝트에 붙여서, 가짜 데이터로 가득 찬 사이트를 하나 더 띄운다. 어드바이저는 데모 계정으로 로그인해서 업로드·메시지·팔로우·포트폴리오 링크까지 모든 기능을 써 볼 수 있고, 실서비스 DB는 건드리지 않는다.

- 가짜 세계: `src/lib/demo-world.ts` (사람 101명, 작품 40개, 학교, 스틸). Society의 앱 내 데모(`/society?demo=1`)와 같은 데이터다.
- 채우기/초기화: `scripts/demo-seed.mjs` (+ `scripts/lib/demo-seed-data.mjs`)
- 표시: `NEXT_PUBLIC_APP_ENV=demo`이면 모든 페이지 하단에 "Demo site" 표시, 제목에 "(demo)", 검색엔진 색인 안 함.
- 결제(업로더 보증금)는 데모에서 쓰지 않는다. 데모 계정은 보증금이 이미 처리된 상태로 만들어진다.

## 한 번만 하는 설정

### 1. Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com) → **프로젝트 추가** → 이름 예: `oona-demo` (프로젝트 ID를 적어 둔다).
2. **Authentication** → 시작하기 → 로그인 방법에서 **이메일/비밀번호** 사용 설정. (Google 로그인도 쓰려면 Google 사용 설정 후, 승인된 도메인에 데모 사이트 도메인 추가)
3. **Firestore Database** → 데이터베이스 만들기 → **데이터베이스 ID를 `xiio`** 로 (실서비스와 같은 이름이라 `firebase.json`을 그대로 쓸 수 있다). 위치는 실서비스와 같게. 프로덕션 모드로 시작.
4. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가** → 나오는 `firebaseConfig` 값들을 적어 둔다 (아래 3단계 환경변수).
5. **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성** → JSON 파일 다운로드. 이 파일은 데모 프로젝트 전용이며 커밋하지 않는다.

### 2. 규칙·인덱스 배포 (데모 프로젝트에)

```bash
npx firebase login
npx firebase deploy --only firestore --project oona-demo
```

인덱스는 Console → Firestore → `xiio` → 색인에서 **사용 설정됨**이 될 때까지 몇 분 걸린다.

### 3. Vercel에 데모 배포 만들기

같은 Vercel 프로젝트에서 **`demo` 브랜치**를 데모 사이트로 쓴다.

1. GitHub에 `demo` 브랜치를 만든다 (`main`에서 분기). 데모를 최신으로 맞출 때는 `main`을 `demo`에 머지·푸시하면 된다.
2. Vercel → 프로젝트 → **Settings → Environment Variables**에서 아래 값을 **Preview** 환경, **Branch: `demo`** 로 한정해서 추가한다. (실서비스 값과 섞이지 않게 꼭 브랜치를 지정)

| 변수 | 값 |
|------|----|
| `NEXT_PUBLIC_APP_ENV` | `demo` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` 등 `NEXT_PUBLIC_FIREBASE_*` 6개 | 1-4에서 적어 둔 데모 웹 앱 값 |
| `NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID` | `xiio` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | 1-5 JSON 파일 내용 전체 (한 줄) |
| `NEXT_PUBLIC_APP_URL` | 데모 사이트 주소 (예: `https://xiio-git-demo-….vercel.app` 또는 연결한 도메인) |
| `UPLOADER_DEPOSIT_ENABLED` | `false` |

3. (선택) **Settings → Domains**에서 `demo` 브랜치에 보기 좋은 도메인을 붙인다 (예: `demo.<도메인>`). 붙이면 `NEXT_PUBLIC_APP_URL`도 그 주소로.
4. `demo` 브랜치를 푸시하면 Vercel이 데모 사이트를 배포한다.

넣지 않는 것: Stripe 키(결제 안 씀), 실서비스 `FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_*`(데모에 관리자 없음). 카카오·네이버 로그인을 데모에서도 쓰려면 각 개발자 콘솔에 데모 도메인을 등록하고 키를 넣는다 (안 넣으면 그 버튼만 동작하지 않는다).

### 4. 가짜 데이터 채우기

```bash
# 데모 프로젝트 키로 (실서비스 키 아님 — 스크립트가 확인하고 거부한다)
export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/oona-demo-xxxx.json)"

# 먼저 무엇을 쓸지 확인 (아무것도 안 씀)
npm run demo:seed -- --project oona-demo --database xiio

# 실제로 채우기
npm run demo:seed -- --project oona-demo --database xiio --apply --password '어드바이저용-비밀번호'
```

끝나면 로그인 계정 목록이 출력된다. 어드바이저에게 데모 사이트 주소와 계정 하나씩 주면 된다.

## 처음 상태로 되돌리기

어드바이저들이 데이터를 어질렀을 때:

```bash
npm run demo:reset -- --project oona-demo --database xiio --apply --password '어드바이저용-비밀번호'
```

이 스크립트가 채운 DB(표시 문서 `site/demoSeed`가 있는 DB)만 지우고 다시 채운다. 실서비스 프로젝트(`xiio-9d86b`)는 이름으로 막혀 있고, 표시 없는 DB에 사용자가 있으면 거부한다.

## 영상

기본값은 **포스터만** 보여 준다 (재생 버튼 없음). 샘플 영상을 붙이려면 데모 Cloudflare Stream에 영상을 올리고 그 UID들을 `scripts/lib/demo-seed-data.mjs`의 `SAMPLE_STREAM_UIDS`에 넣은 뒤 초기화를 다시 돌린다. 이때 Vercel 데모 환경변수에 `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`도 필요하다. 실제 유저 영상은 쓰지 않는다.

## 내 컴퓨터에서 미리 보기 (에뮬레이터)

```bash
# 터미널 1: Auth + Firestore 에뮬레이터 (firebase.json에 auth 설정이 없으므로 emulators 설정을 따로 둔 폴더에서)
npx firebase emulators:start --only auth,firestore --project demo-oona

# 터미널 2: 채우기
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  npm run demo:seed -- --project demo-oona --database xiio --apply --password demo-pass

# 터미널 3: 앱 (NEXT_PUBLIC_FIREBASE_EMULATOR_HOST가 클라이언트를 에뮬레이터에 붙인다)
NEXT_PUBLIC_APP_ENV=demo NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1 \
NEXT_PUBLIC_FIREBASE_API_KEY=demo NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-oona \
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-oona.firebaseapp.com NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID=xiio \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-oona \
  npm run dev
```
