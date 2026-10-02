# iOS · Android 앱 출시 가이드

OONA 앱은 [Capacitor](https://capacitorjs.com) 8로 만든 iOS/Android 앱이다. 앱은 배포된 사이트(`https://xiio.vercel.app`)를 그대로 불러온다. 그래서 **웹을 배포하면 앱도 바로 바뀌고**, 스토어 재심사는 네이티브 설정을 바꿀 때만 필요하다.

사이트가 Next.js API 라우트와 서버 렌더링을 쓰기 때문에 정적 파일로 앱에 넣을 수 없다. 앱에 들어가는 파일은 `mobile-shell/`의 오프라인 안내 화면뿐이다.

## 이 저장소에 이미 들어간 것

| 항목 | 위치 |
| --- | --- |
| 앱 설정 (앱 ID `com.xiio.oona`, 이름 OONA, 불러올 주소) | `capacitor.config.ts` |
| Android 프로젝트 | `android/` |
| iOS 프로젝트 (Swift Package Manager, CocoaPods 불필요) | `ios/` |
| 앱 아이콘과 스플래시 (OONA 워드마크, 원본은 `assets/`) | 각 플랫폼 리소스 폴더 |
| 앱 안에서 Google/Apple 네이티브 로그인 | `src/lib/native/social-sign-in.ts` |
| 상태바, 스플래시, Android 뒤로가기 버튼 | `src/components/NativeAppBridge.tsx` |
| 오프라인 화면 | `mobile-shell/offline.html` |
| iOS 권한 문구 (카메라, 마이크, 사진), Apple 로그인 권한 | `ios/App/App/Info.plist`, `ios/App/App/App.entitlements` |

**Google 로그인을 바꾼 이유:** Google은 앱 안 WebView에서 OAuth 로그인을 막고, WebView에서는 팝업도 열리지 않는다. 그래서 앱에서는 기기의 네이티브 Google/Apple 로그인을 쓰고, 받은 토큰을 사이트와 같은 Firebase 웹 SDK에 넘긴다. 브라우저에서는 예전처럼 팝업 로그인이 그대로 동작한다.

**앱 ID `com.xiio.oona`는 스토어에 처음 올린 뒤에는 바꿀 수 없다.** 바꾸려면 첫 업로드 전에 `capacitor.config.ts`, `android/app/build.gradle`(`applicationId`, `namespace`), Xcode의 Bundle Identifier를 함께 바꾼다.

## 1. 계정 준비 (사람이 직접)

| 할 일 | 비용 | 비고 |
| --- | --- | --- |
| Apple Developer Program 가입 | 연 $99 | 개인 또는 법인. 법인이면 D-U-N-S 번호가 필요해서 시간이 더 걸린다 |
| Google Play Console 가입 | 1회 $25 | 개인 신규 계정은 출시 전에 테스터 12명 이상이 14일 동안 비공개 테스트해야 한다 |
| Mac + Xcode 16.3 이상 | | iOS 빌드는 Mac에서만 가능 |
| Android Studio | 무료 | Mac/Windows/Linux |

가격과 Play의 테스트 조건은 바뀔 수 있으니 가입할 때 각 콘솔에서 확인한다.

## 2. Firebase에 앱 등록

1. Firebase 콘솔 → 프로젝트 설정 → **앱 추가 → Android**, 패키지 이름 `com.xiio.oona`.
   - `google-services.json`을 받아 `android/app/google-services.json`에 둔다. 이 파일은 git에 올리지 않는다(`.gitignore`에 있음).
   - 디버그 키와 업로드 키의 **SHA-1**을 등록한다(`cd android && ./gradlew signingReport`).
   - Play에 올린 뒤에는 Play Console → 앱 서명 페이지의 **앱 서명 키 SHA-1**도 추가하고 `google-services.json`을 다시 받는다. 안 하면 스토어에서 받은 앱에서만 Google 로그인이 실패한다.
2. **앱 추가 → iOS**, 번들 ID `com.xiio.oona`.
   - `GoogleService-Info.plist`를 받아 Xcode에서 `App/App` 폴더로 끌어다 넣는다(모든 타깃에 추가).
   - 파일 안의 `REVERSED_CLIENT_ID` 값을 Xcode → App 타깃 → Info → URL Types에 URL Scheme으로 추가한다.
3. Firebase Authentication → 로그인 방법에서 Google, Apple이 켜져 있는지 확인한다.
4. Apple 로그인: Apple Developer → Identifiers에서 `com.xiio.oona`에 **Sign in with Apple**을 켠다(엔타이틀먼트 파일은 이미 들어 있다).

## 3. 빌드

```bash
npm install
npm run cap:android   # 동기화 후 Android Studio 열기
npm run cap:ios       # 동기화 후 Xcode 열기 (Mac)
```

`ios/App/CapApp-SPM/symlinks/`는 git에 없고 `cap sync ios`가 만든다. Xcode를 열기 전에 꼭 동기화한다.

다른 주소(예: Vercel 프리뷰)로 테스트하려면:

```bash
CAP_SERVER_URL=https://<preview>.vercel.app npx cap sync
```

- **Android 서명:** Android Studio → Build → Generate Signed App Bundle로 업로드 키(keystore)를 만들고 `.aab`를 만든다. keystore와 비밀번호를 잃어버리면 업데이트를 못 올리니 안전한 곳에 백업한다. git에 올리지 않는다.
- **iOS 서명:** Xcode → App 타깃 → Signing & Capabilities에서 팀을 고르고 Archive → App Store Connect로 업로드한다.
- **버전:** Android는 `android/app/build.gradle`의 `versionCode`(업로드마다 +1)와 `versionName`, iOS는 Xcode의 Version과 Build를 올린다.

## 4. 스토어 제출 전에 꼭 할 것

| 항목 | 상태 | 할 일 |
| --- | --- | --- |
| 개인정보처리방침 URL | **없음** | 두 스토어 모두 필수. `docs/privacy-policy-draft.md`를 확정해서 `/privacy` 같은 공개 페이지로 올린다 |
| 이용약관 | 초안만 있음 | `docs/terms-of-service-draft.md`를 확정해 공개 페이지로 올린다. 사용자 콘텐츠 앱은 약관 동의가 필요하다 |
| 앱 안 계정 삭제 | 있음 | 설정 → 계정 삭제가 앱에서도 되는지 확인 |
| 신고 · 차단 · 검수 | 있음 | 사용자 콘텐츠 앱 필수 요건(Apple 1.2). 앱에서 신고와 차단이 되는지 확인 |
| Google 로그인과 함께 Apple 로그인 제공 | 있음 | iOS에서 Apple 로그인이 동작하는지 확인 |
| 심사용 데모 계정 | 없음 | 심사 메모에 테스트 계정 아이디/비밀번호와 업로드 방법을 적는다 |
| 스크린샷 | 없음 | iPhone 6.9형, iPad 13형(iPad 지원 시), Android 휴대폰 |
| 연령 등급 | | 사용자 업로드 영상이 있으니 설문에 정직하게 답한다 |
| Apple 앱 개인정보 / Play 데이터 보안 양식 | | 이메일, 이름, 업로드 영상, 시청 기록, Firebase · Cloudflare · Stripe 사용을 적는다 |

## 5. 심사 위험과 대응

1. **Apple 4.2 (최소 기능): 웹사이트를 감싼 앱은 거절될 수 있다.** 가장 큰 위험이다. 지금 앱에는 네이티브 Google/Apple 로그인, 오프라인 화면, 네이티브 상태바와 뒤로가기가 있다. 제출 전에 아래를 추가하면 통과 가능성이 높아진다.
   - 푸시 알림(크레딧 확인 요청, 메시지, 영상 승인): `@capacitor-firebase/messaging`과 APNs 키가 필요하다.
   - 네이티브 공유 시트로 작품 공유: `@capacitor/share`.
2. **Apple 3.1.1 (인앱 결제):** iOS 앱 안에서 디지털 기능(예: 창작자 Pro)을 팔려면 Apple 인앱 결제를 써야 한다. 지금 Stripe 업로더 보증금은 꺼져 있다(`src/lib/payments/config.ts`). 유료 기능을 켤 때 iOS 앱에서는 숨기거나 인앱 결제를 붙인다(`isNativeApp()` 사용).
3. **카카오 · 네이버 로그인:** 앱 안 이동을 허용해 두었다(`server.allowNavigation`). 실제 기기에서 로그인 후 사이트로 잘 돌아오는지 확인하고, 카카오 개발자 콘솔에 앱 플랫폼 등록이 필요한지 확인한다.

## 6. 테스트 순서

1. Android Studio 에뮬레이터 또는 실제 기기에서 실행: 로그인(이메일, Google, 카카오, 네이버), 영상 재생과 전체 화면, 업로드(갤러리에서 영상 선택), 메시지, 오프라인 화면(비행기 모드), 뒤로가기.
2. Xcode 시뮬레이터 또는 실제 iPhone에서 같은 항목과 Apple 로그인.
3. TestFlight(iOS)와 Play 내부 테스트(Android)로 팀원에게 배포.
4. 문제가 없으면 심사 제출.
