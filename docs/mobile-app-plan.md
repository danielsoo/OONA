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
| `/discover` | Discover 탭 | ◐ | 세로 스와이프 쇼츠 플레이어, 좋아요 |
| `/watch/[ownerUid]/[workId]` | 시청 | ◐ | 프롤로그 먼저 재생 + 건너뛰기, 비슷한 작품, 신고, 내 리스트 추가 |
| `/people/[handle]` | 창작자 프로필 | ◐ | 배너, 학교, 메시지 보내기, 포트폴리오 메모 |
| `/notifications` | 알림 탭 | ✅ | 메시지·방 알림은 메시지 화면이 생기면 연결 |
| `/login` | 로그인 | ◐ | 카카오·네이버 로그인 |
| `/account` | 나 탭 | ◐ | 계정 설정 항목 전체 |

### 2단계: 올리기와 가입

| 웹 경로 | 앱 화면 | 상태 | 남은 것 |
| --- | --- | --- | --- |
| `/signup` `/profiles` | 가입, 프로필 완성, 이메일 인증 | ✅ | 웹과 같은 단계·검증 규칙. Apple·Google로 처음 들어온 사람은 프로필 단계만 |
| `/uploader/upload` | 업로드 탭 | ◐ | 단계·API 순서는 웹과 같음. 남은 것: 쇼츠 프레임 크롭 편집(지금은 기본값), 썸네일 크롭, 학교 선택, 임시 저장, 백그라운드 업로드 |
| `/uploader/works` | 내 작품 | ◐ | 목록·상태·초안 삭제(길게 누르기). 남은 것: 수정, 프롤로그·프로모 편집, 삭제 요청, 순서 바꾸기 |
| `/uploader/works/[workId]/*` | | ☐ | 작품 수정, 프롤로그·프로모 편집 |
| `/uploader/verify` | | ☐ | 업로더 보증금(현재 꺼져 있음). iOS는 인앱 결제 규정 확인 필요 |
| `/collab-invite/[token]` | 크레딧 초대 수락 | ✅ | `oona://collab-invite/<token>`으로 열림. 메일 링크(https)가 앱으로 바로 열리려면 유니버설 링크 설정 필요 (아래) |

**업로드 주의:** 앱이 화면을 벗어나거나 잠기면 업로드가 멈출 수 있다. 큰 영상은 Wi-Fi에서 화면을 켠 채로 올리도록 안내하고, 다음 단계에서 백그라운드 업로드를 붙인다. 영상은 웹과 같이 Firebase Storage(스테이징)와 Cloudflare Stream에 각각 한 번씩, 총 두 번 올라간다.

**유니버설 링크:** 웹사이트가 `/.well-known/apple-app-site-association`과 `/.well-known/assetlinks.json`을 서빙하고, `app.config.ts`에 `ios.associatedDomains`와 `android.intentFilters`를 넣어야 한다. Apple 팀 ID와 Android 서명 키 SHA-256이 필요해서 계정이 생긴 뒤에 한다.

### 3단계: 소통

| 웹 경로 | 앱 화면 | 상태 | 남은 것 |
| --- | --- | --- | --- |
| `/messages` `/messages/[threadId]` | 메시지함, 1:1 대화 | ◐ | 웹처럼 8초마다 새로고침, 길게 눌러 답장. 남은 것: 이모지 반응, 수정·삭제, 새 1:1 대화 검색(지금은 프로필의 메시지 버튼으로 시작) |
| `/messages/rooms/[roomId]` | 그룹 대화, 새 그룹, 나가기 | ✅ | 멤버 추가·관리 |
| `/society` `/creators` | 소사이어티 | ◐ | 사람 찾기, 협업 가능, 내 커넥션. 남은 것: 역할·학교 필터, 구직 제안(요청·보낸 요청) |
| `/projects/[projectId]` | | ☐ | 프로젝트 |
| `/my-list` | 내 리스트 + 시청 화면의 담기 버튼 | ✅ | |
| `/search` | 검색 (홈 오른쪽 위) | ✅ | 최근 검색어 |
| (신규) 푸시 알림 | | ☐ | `expo-notifications` + 서버에 기기 토큰 저장 API 추가 |

### 4단계: 나머지

| 웹 경로 | 상태 | 메모 |
| --- | --- | --- |
| `/schools` `/school/[schoolId]` | ☐ | 학교 목록, 학교 페이지 |
| `/entertainment/[showId]` `/series/[seriesId]` | ☐ | 시리즈·쇼 상세, 에피소드 |
| `/shorts` | ☐ | 쇼츠 |
| `/settings` `/account/profile` | ☐ | 설정, 프로필 수정, 계정 삭제(스토어 필수) |
| `/uploader/analytics` | ☐ | 내 작품 통계 |
| `/p/[token]` | ☐ | 공개 포트폴리오 (웹 링크로 충분할 수 있음) |
| `/about` | ☐ | 소개 |
| `/admin/*` | 웹 유지 | 관리자 기능은 웹에서만 쓴다 |
| `/auth/callback` | 해당 없음 | 웹 전용 OAuth 콜백 |

## 스토어 제출 전에 필요한 것

1. **계정**: Apple Developer Program(연 $99), Google Play Console(1회 $25). 가격과 조건은 가입할 때 확인한다.
2. **Firebase 콘솔에 앱 등록**: iOS·Android 앱으로 각각 등록한다(번들 ID `com.xiio.oona`).
   - Google 로그인: `.env.example`의 `EXPO_PUBLIC_GOOGLE_*` 값을 채운다.
   - Android: SHA-1을 등록한다.
   - Apple 로그인: Firebase에서 Apple 로그인을 켜고, Apple Developer에서 Sign in with Apple을 켠다.
3. **빌드**: EAS Build(`npx eas build`) 또는 Xcode·Android Studio.
4. **스토어 필수 항목**:
   - 앱 안에서 계정 삭제 (4단계 설정 화면)
   - 신고·차단 (사용자 콘텐츠 앱 규정)
   - 개인정보처리방침 공개 URL (`docs/privacy-policy-draft.md`를 확정해서 공개)
   - 심사용 데모 계정
5. **번들 ID `com.xiio.oona`**: 첫 업로드 뒤에는 바꿀 수 없다. 이름 정리(OONA/XIIO)가 끝나면 확정한다.
