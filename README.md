# seed-admin

gundsh 플랫폼 관리자 웹 대시보드.

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Vue 3 (Composition API) |
| 빌드 도구 | Vite |
| 언어 | TypeScript |
| 상태 관리 | Pinia |
| 라우팅 | Vue Router |
| HTTP | Axios (토큰 자동 갱신 인터셉터 포함) |
| 마크다운 | marked + DOMPurify (AI 응답 렌더링) |
| 배포 URL | https://admin.gundsh.co.kr |

## 페이지 구성

### 플랫폼 관리

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/dashboard` | 대시보드 | 플랫폼 현황 요약 |
| `/managers` | 관리자 관리 | 관리자 계정 CRUD |
| `/users` | 사용자 관리 | 앱 사용자 목록/상세 |
| `/notices` | 공지사항 | 공지 작성/관리 |
| `/monitor` | 서버 모니터링 | 서버 상태 확인 |
| `/services` | 서비스 관리 | 서비스 활성화 제어 |
| `/versions` | 버전 관리 | 앱 버전 등록/관리 |
| `/push` | 푸시 알림 | FCM 푸시 발송 및 이력 |
| `/my` | 내 정보 | 관리자 프로필 수정 |

### 게임 관리

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/game/words` | 단어 관리 | 게임 단어 데이터 |
| `/game/stages` | 스테이지 관리 | 게임 스테이지 구성 |
| `/game/scene-packs` | 씬 팩 관리 | 배경/씬 에셋 관리 |
| `/game/bundles` | 번들 관리 | 패키지 번들 구성 |
| `/game/characters` | 캐릭터 관리 | 캐릭터 이미지/정보 |
| `/game/app-config` | 앱 설정 | 게임 앱 전역 설정 |

### 스마트팜

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/smartfarm` | 디바이스 관리 | 센서 조회, 명령 전송, 자동 규칙 설정 |

### AI Agent 플랫폼

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/agent` | Agent 콘솔 | SSE 스트리밍 채팅 (세션 관리, 마크다운 렌더링) |
| `/agent/prompts` | 프롬프트 관리 | Agent 등록/수정/삭제 (system prompt, 모델, temperature) |
| `/agent/logs` | 로그 조회 | 대화 로그 목록 및 통계 (전체 수, 오류, 평균 응답 시간) |

## 프로젝트 구조

```
src/
├── layouts/
│   └── AdminLayout.vue    # 사이드바 + 헤더 공통 레이아웃
├── views/
│   ├── AgentView.vue      # AI Agent 채팅 콘솔
│   ├── AgentPromptsView.vue  # Agent 프롬프트 관리
│   ├── AgentLogsView.vue  # 대화 로그 조회
│   ├── SmartfarmView.vue
│   ├── game/
│   └── ...                # 기타 관리 페이지
├── composables/
│   ├── useAgentStream.ts  # fetch + ReadableStream 기반 SSE 클라이언트
│   └── useMarkdown.ts     # marked + DOMPurify 마크다운 렌더링
├── stores/
│   ├── auth.ts            # 토큰 관리
│   └── agent.ts           # Agent 상태 (모델 목록, 세션, 메시지 히스토리)
├── router/
│   └── index.ts
└── network/
    └── index.ts           # Axios 인스턴스 + 401 자동 갱신 + API 함수 모음
```

## 개발 환경 설정

### IDE

VS Code + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 확장 권장 (Vetur 비활성화)

### 환경변수

```env
VITE_API_URL=http://localhost:8900/api
```

프로덕션 빌드 시:
```env
VITE_API_URL=https://api.gundsh.co.kr/api
```

> 미설정 시 `http://localhost:8900/api`를 기본값으로 사용합니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:8910)
npm run build      # 프로덕션 빌드
npm run type-check # 타입 검사
```

## SSE 스트리밍 구조

브라우저의 `EventSource`는 GET 요청만 지원하므로, POST Body + JWT 인증이 필요한 Agent 스트리밍은 `fetch + ReadableStream`으로 구현합니다.

```
AgentView.vue
  └─ useAgentStream.ts
       └─ fetch POST /agent/chat/stream  (Authorization: Bearer ...)
            └─ ReadableStream → SSE 파싱 ("data: {...}\n\n")
                 └─ onChunk() → store.appendToLastAssistantMessage()
                      └─ v-html + renderMarkdown() → 실시간 마크다운 렌더링
```

**세션 관리:** 대화 컨텍스트(히스토리)는 서버 Redis에서 관리되며, 클라이언트는 `sessionId`만 유지합니다. "새 대화 시작" 버튼으로 새 세션을 생성할 수 있습니다.

## 관련 서비스

- [core-api](../core-api) — 백엔드 API 서버 (AI Agent 포함)
- [push-service](../push-service) — FCM 푸시 알림 서버
