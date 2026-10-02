# OONA 네이티브 앱 (iOS · Android)

앱은 `mobile/`에 있는 **Expo (React Native)** 프로젝트다. 웹사이트와 같은 백엔드를 쓴다.

- **서버**: 웹사이트의 Next.js API(`https://xiio.vercel.app/api/...`)를 그대로 호출한다. 요청 헤더는 `Authorization: Bearer <Firebase ID 토큰>`이다.
- **Firebase**: 같은 프로젝트(Auth, Firestore, Storage)를 쓴다.
- **공유 코드**: `src/`의 타입, 번역 사전(`src/i18n`), 순수 함수는 `@/...` 경로로 앱이 직접 가져다 쓴다. 웹에서 문구나 타입을 고치면 앱에도 반영된다.
- **웹사이트**는 계속 운영한다. 작품 공유 링크, 관리자, API 서버 역할을 맡는다.

## 실행

```bash
cd mobile
npm install
cp .env.example .env.local   # Firebase 값은 웹의 NEXT_PUBLIC_FIREBASE_*와 같다
npx expo run:ios             # Mac + Xcode
npx expo run:android         # Android Studio
```

Expo Go로는 실행되지 않는다. Google 로그인과 Apple 로그인이 네이티브 모듈이라 개발 빌드(`expo run:*`, 또는 EAS Build)가 필요하다.

## 구조

| 위치 | 내용 |
| --- | --- |
| `mobile/src/app/` | 화면 (Expo Router, 파일 = 화면) |
| `mobile/src/app/(tabs)/` | 하단 탭 5개: 필름, Discover, 업로드, 알림, 나 (웹의 `MOBILE_TABS`와 같음) |
| `mobile/src/lib/api.ts` | 웹 API 호출 (토큰 자동 첨부) |
| `mobile/src/lib/feeds.ts` | 화면별 API 함수 |
| `mobile/src/lib/auth.tsx` | 이메일, Google, Apple 로그인 |
| `mobile/src/lib/locale.tsx` | 웹과 같은 번역 사전, 기기 언어 기본값 |
| `mobile/src/theme.ts` | 웹 디자인 토큰(`tailwind.config.ts`)과 같은 색과 글자 크기 |
| `mobile/app.config.ts` | 앱 이름, 번들 ID `com.xiio.oona`, 아이콘, 권한 문구 |

## 화면 이전 현황

웹 화면 47개를 4단계로 옮긴다. 상태: ✅ 완료 · ◐ 일부 · ☐ 예정.

### 1단계: 보고, 찾고, 로그인 (지금)

| 웹 경로 | 앱 화면 | 상태 | 남은 것 |
| --- | --- | --- | --- |
| `/` | 필름 탭 | ◐ | 히어로 캐러셀, 쇼츠 줄, 카테고리, 추천 창작자, 학교 줄 |
| `/movies` `/series` `/entertainment` | 필름 탭 줄 | ◐ | 섹션별 전체 목록 화면, 필터 |
| `/discover` | Discover 탭 | ✅ | 전체 화면 세로 스와이프 쇼츠, 좋아요, 조회 기록, 본편 보기 |
| `/watch/[ownerUid]/[workId]` | 시청 | ✅ | 재생, 프롤로그 + 건너뛰기, 크레딧, 내 리스트, 신고, 같은 창작자의 작품, 비슷한 작품 |
| `/people/[handle]` | 창작자 프로필 | ◐ | 배너, 학교, 메시지 보내기, 포트폴리오 메모 |
| `/notifications` | 알림 탭 | ✅ | 메시지·방 알림은 메시지 화면이 생기면 연결 |
| `/login` | 로그인 | ✅ | 이메일, Apple, Google, 카카오, 네이버. 카카오·네이버는 앱 안 브라우저에서 웹 서버 로그인을 거쳐 `oona://auth/callback`으로 돌아온다 (아래) |
| `/account` | 나 탭 | ◐ | 계정 설정 항목 전체 |

### 2단계: 올리기와 가입

| 웹 경로 | 앱 화면 | 상태 | 남은 것 |
| --- | --- | --- | --- |
| `/signup` `/profiles` | 가입, 프로필 완성, 이메일 인증 | ✅ | 웹과 같은 단계·검증 규칙. Apple·Google로 처음 들어온 사람은 프로필 단계만 |
| `/uploader/upload` | 업로드 탭 | ◐ | 단계·API 순서는 웹과 같음. 남은 것: 쇼츠 프레임 크롭 편집(지금은 기본값), 썸네일 크롭, 임시 저장. 학교 선택은 됨, 백그라운드 업로드 |
| `/uploader/works` | 내 작품 | ◐ | 목록·상태·초안 삭제(길게 누르기), 수정, 분석. 남은 것: 프롤로그·프로모 편집, 삭제 요청, 순서 바꾸기 |
| `/uploader/works/[workId]/*` | 작품 수정 | ◐ | 제목·설명·카테고리·태그를 수정본으로 저장하고 검토 요청(웹과 같음). 남은 것: 프롤로그·프로모 편집 |
| `/uploader/verify` | | ☐ | 업로더 보증금(현재 꺼져 있음). iOS는 인앱 결제 규정 확인 필요 |
| `/collab-invite/[token]` | 크레딧 초대 수락 | ✅ | `oona://collab-invite/<token>`으로 열림. 메일 링크(https)가 앱으로 바로 열리려면 유니버설 링크 설정 필요 (아래) |

**업로드 주의:** 업로드 중에는 화면이 꺼지지 않게 해 두었다. 그래도 다른 앱으로 넘어가면 멈출 수 있어서, 큰 영상은 Wi-Fi에서 앱을 켠 채로 올리도록 안내한다. 영상은 웹과 같이 Firebase Storage(스테이징)와 Cloudflare Stream에 각각 한 번씩, 총 두 번 올라간다.

**유니버설 링크:** `/watch`, `/people`, `/collab-invite`, `/messages` 링크가 앱으로 열린다. 웹사이트가 `/.well-known/apple-app-site-association`과 `/.well-known/assetlinks.json`을 서빙하는데(`src/app/.well-known/`), Vercel 환경 변수 `APPLE_TEAM_ID`(Apple 팀 ID)와 `ANDROID_APP_SHA256`(서명 키 SHA-256, Play 앱 서명 키 포함, 쉼표로 구분)을 넣어야 켜진다. 앱 쪽 도메인은 `APP_LINK_HOST`(기본 xiio.vercel.app)로 바꿀 수 있다.

### 3단계: 소통

| 웹 경로 | 앱 화면 | 상태 | 남은 것 |
| --- | --- | --- | --- |
| `/messages` `/messages/[threadId]` | 메시지함, 1:1 대화 | ✅ | 8초마다 새로고침, 길게 눌러 반응·답장·삭제. 새 1:1 대화는 프로필의 메시지 버튼으로 시작 |
| `/messages/rooms/[roomId]` | 그룹 대화, 새 그룹, 나가기 | ✅ | 멤버 추가·관리 |
| `/society` `/creators` | 소사이어티, 구직 제안함 | ◐ | 사람 찾기, 협업 가능, 내 커넥션, 받은·보낸 제안 수락·거절, 역할 필터, 프로필에서 프로젝트 제안 보내기(프로젝트 새로 만들기 포함). 남은 것: 학교 필터(서버 API에 아직 없음), 제안 첨부 파일 |
| `/projects/[projectId]` | | ☐ | 프로젝트 |
| `/my-list` | 내 리스트 + 시청 화면의 담기 버튼 | ✅ | |
| `/search` | 검색 (홈 오른쪽 위) | ✅ | 최근 검색어 |
| (신규) 푸시 알림 | 앱 전체 | ◐ | 새 메시지(1:1·그룹), 새 팔로워, 작품 승인·반려, 구직 제안에 푸시가 간다. 누르면 해당 화면으로 열림. 실제 발송에는 EAS 프로젝트 ID가 필요하다 (아래) |

### 4단계: 나머지

| 웹 경로 | 앱 화면 | 상태 | 남은 것 |
| --- | --- | --- | --- |
| `/settings` `/account/profile` | 설정 (나 탭) | ◐ | 프로필 사진, 한 줄 소개, 소개, 검색 노출, 협업 가능, 외부 링크, 언어, 표시 이름·핸들·감독명 변경 요청. 역할 태그는 웹에도 편집 화면이 없어 보류 |
| (계정 삭제) | 계정 삭제 | ✅ | 웹과 같은 안내, 확인 문구, 비밀번호 재인증, 같은 API. 스토어 필수 요건 |
| `/schools` `/school/[schoolId]` | 학교 순위, 학교 페이지 (홈 오른쪽 위) | ✅ | 학교 페이지용 API `/api/schools/[schoolId]`를 새로 추가 (웹 서버 렌더링과 같은 데이터) |
| `/series/[seriesId]` `/entertainment/[showId]` | 해당 없음 | — | 웹에서도 데모 모드에서만 열리는 화면이라 앱에는 넣지 않음 |
| `/shorts` | Discover 탭 | ✅ | |
| `/uploader/analytics` | 통계 (내 작품) | ✅ | 30일 조회·좋아요 추이, 참여율, 작품별 표 |
| `/p/[token]` | | ☐ | 공개 포트폴리오 (웹 링크로 충분할 수 있음) |
| `/about` | | ☐ | 소개 (웹 링크로 충분할 수 있음) |
| `/admin/*` | 웹 유지 | — | 관리자 기능은 웹에서만 쓴다 |
| `/auth/callback` | 해당 없음 | — | 웹 전용 OAuth 콜백 |

**카카오·네이버 앱 로그인 설정:**
- 네이버: 웹과 같은 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`를 쓴다. 추가 설정은 없다(`/api/auth/naver/start?app=1`).
- 카카오: 웹은 JS SDK를 쓰지만 앱은 REST 로그인을 쓴다. Vercel에 `KAKAO_REST_API_KEY`(필요하면 `KAKAO_CLIENT_SECRET`)를 넣고, Kakao Developers → 카카오 로그인 → Redirect URI에 `https://xiio.vercel.app/api/auth/kakao/callback`을 등록한다.

## 스토어 제출 전에 필요한 것

1. **계정**: Apple Developer Program(연 $99), Google Play Console(1회 $25). 가격과 조건은 가입할 때 확인한다.
2. **Firebase 콘솔에 앱 등록**: iOS·Android 앱으로 각각 등록한다(번들 ID `com.xiio.oona`).
   - Google 로그인: `.env.example`의 `EXPO_PUBLIC_GOOGLE_*` 값을 채운다.
   - Android: SHA-1을 등록한다.
   - Apple 로그인: Firebase에서 Apple 로그인을 켜고, Apple Developer에서 Sign in with Apple을 켠다.
3. **빌드**: EAS Build(`npx eas build`) 또는 Xcode·Android Studio.
   - 푸시 알림: `cd mobile && npx eas init`으로 EAS 프로젝트를 만들면 프로젝트 ID가 앱 설정에 들어간다(또는 `EAS_PROJECT_ID` 환경 변수). iOS는 EAS가 APNs 키를, Android는 Firebase(FCM) 설정을 요구한다.
   - 서버: `/api/me/push-tokens`가 기기 토큰을 `users/{uid}/pushTokens`에 저장하고, 알림·메시지가 생기면 Expo 푸시 서비스로 보낸다(`src/lib/server/push.ts`). 응답을 보낸 뒤에 보내기 때문에 푸시가 실패해도 원래 요청에는 영향이 없다.
4. **스토어 필수 항목**:
   - 앱 안에서 계정 삭제 (설정 → 계정 삭제, 완료). Apple 로그인 사용자는 삭제할 때 Apple 확인 창이 한 번 더 뜨고 Apple 토큰이 해지된다 (완료)
   - 신고·차단 (사용자 콘텐츠 앱 규정): 시청 화면의 신고, 프로필의 차단 (완료)
   - 개인정보처리방침 공개 URL (`docs/privacy-policy-draft.md`를 확정해서 공개)
   - 심사용 데모 계정
5. **번들 ID `com.xiio.oona`**: 첫 업로드 뒤에는 바꿀 수 없다. 이름 정리(OONA/XIIO)가 끝나면 확정한다.
