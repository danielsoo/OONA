# XIIO 영상계 네트워크 (제품 방향)

XIIO는 **공개 스트리밍 피드**를 유지하면서, 영화·영상 업계를 위한 **전문 프로필·크레딧·포트폴리오 제출·창구(발견)·팔로우·DM** 기능을 더합니다.

## 핵심 개념

| 용어 | 설명 |
|------|------|
| **전문 프로필** | `/people/{handle}` — 헤드라인·소개·역할 칩·출연·감독 작품 |
| **프로필 설정** | `/account?tab=profile` — 소개·역할·협업 창구·포트폴리오 제출 링크 |
| **사람 찾기** | `/society?tab=discover` — 프로필 검색·Connect |
| **크레딧** | 작품에 연결된 XIIO 회원 (`users/{owner}/works/{id}/credits`) |
| **creditIndex** | `users/{uid}/creditIndex` — 출연작 조회용 역인덱스 |
| **포트폴리오 제출 링크** | `/p/{token}` — 비로그인, 선별·승인 작품만 재생 |
| **팔로우** | `follows/{follower}_{following}` |
| **DM** | `dmThreads/{id}/messages` — 프로필에서 시작하는 1:1 텍스트 |

## 프로필 표현

- **헤드라인·bio** — 구직·협업용 **전부 자유 작성** (역할·분야 칩 없음)
- **openToCollaborate** + **collaborationNote** — 사람 찾기에서 「협업 가능」 표시 (선택)
- 검색은 headline·bio·handle 텍스트 기준

레거시 `roleTags` / `primaryField`는 저장 시 비우며, API·DB 호환만 유지합니다.

## 공개 범위

| 경로 | 로그인 | 재생 |
|------|--------|------|
| 홈·섹션 피드 | 회원 (기존) | 회원 |
| `/watch/...` | 회원 (기존) | 회원 |
| `/people/{handle}` | 불필요 (메타·팔로우·DM은 로그인) | 회원만 |
| `/account?tab=profile` | 회원 | — |
| `/account/profile` | — | → `/account?tab=profile` 리다이렉트 |
| `/society?tab=discover` | 회원 | — |
| `/discover`, `/creators` | — | → `/society?tab=discover` 리다이렉트 |
| `/messages` | 회원 | — |
| `/p/{token}` | **불필요** | **가능** |

## API 요약

| API | 용도 |
|-----|------|
| `GET/PATCH /api/me/professional-profile` | 프로필 설정 (`/account?tab=profile`) |
| `GET /api/people/{handle}` | 공개 프로필 (+ viewer 팔로우 여부) |
| `GET /api/discover/people` | 창구 목록 |
| `POST/DELETE /api/me/follows/{uid}` | 팔로우 |
| `GET/POST /api/me/dm/threads` | 대화 목록·생성 |
| `GET/POST /api/me/dm/threads/{id}/messages` | 메시지 |
| `POST/DELETE /api/me/blocks/{uid}` | 차단 |
| `GET/POST /api/me/portfolio-shares` | 제출 링크 |
| `GET /api/portfolio/{token}` | 비로그인 제출 뷰 |

## 포트폴리오 제출 링크 규칙

링크는 보낼 곳마다 따로 만든다(편집 지원에는 편집작만, 촬영 지원에는 촬영작만). 각 링크는 고른 작품 목록(`includedWorkIds`)을 갖고 그 작품만 보여 준다. 프로필이나 다른 링크는 바뀌지 않고, 나중에 생긴 작품도 이미 보낸 링크에 끼어들지 않는다. 링크의 작품 구성은 같은 주소 그대로 바꿀 수 있다(`PATCH /api/me/portfolio-shares/{id}`).

작품이 링크에 포함되려면:

1. `platformStatus === "published"`
2. 링크 소유자가 **작품 owner** 이거나 **creditIndex**에 있음
3. `portfolioShares.excludedWorkIds`에 없음
4. `includedWorkIds`가 있으면 거기에 있음 (없으면 — 예전 링크 — `portfolioSubmissionHidden !== true`)
5. 다른 사람 작품이면 owner가 `portfolioSubmissionHidden`으로 숨기지 않았음 (본인 작품은 목록에 넣으면 보인다)

## DM·안전

- 텍스트만 (이미지 DM 없음)
- 차단 시 새 메시지 불가
- 신고는 기존 `POST /api/reports` 확장 예정 (`user` / `dm_message` 타입)

## Firestore 인덱스

`firebase deploy --only firestore:indexes`

- `users`: `isDiscoverable` + `updatedAt`
- `follows`: `followerUid` + `createdAt`
- `dmThreads`: `participantIds` + `lastMessageAt`
- `portfolioShares.token`, `creditIndex` (기존)

## 벤더 전환

AI 검열은 [content-moderation.md](./content-moderation.md) 참고. 네트워크 기능과 독립입니다.
