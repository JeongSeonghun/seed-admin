# seed-admin

gundsh 플랫폼 관리자 웹 대시보드.

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Vue 3 |
| 빌드 도구 | Vite |
| 언어 | TypeScript |
| 상태 관리 | Pinia |
| 라우팅 | Vue Router |
| HTTP | Axios |
| 배포 URL | https://admin.gundsh.co.kr |

## 페이지 구성

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
| `/game/words` | 단어 관리 | 게임 단어 데이터 |
| `/game/stages` | 스테이지 관리 | 게임 스테이지 구성 |
| `/game/scene-packs` | 씬 팩 관리 | 배경/씬 에셋 관리 |
| `/game/bundles` | 번들 관리 | 패키지 번들 구성 |
| `/game/characters` | 캐릭터 관리 | 캐릭터 이미지/정보 |
| `/game/app-config` | 앱 설정 | 게임 앱 전역 설정 |
| `/my` | 내 정보 | 관리자 프로필 수정 |

## 개발 환경 설정

### IDE

VS Code + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 확장 권장 (Vetur 비활성화)

### 환경변수

```env
VITE_API_BASE_URL=http://localhost:8900
```

프로덕션 빌드 시:
```env
VITE_API_BASE_URL=https://api.gundsh.co.kr
```

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 프로덕션 빌드
npm run type-check # 타입 검사
```

## 프로젝트 구조

```
src/
├── layouts/     # AdminLayout (사이드바 + 헤더 공통 레이아웃)
├── views/       # 페이지 컴포넌트
│   └── game/    # 게임 관련 페이지
├── stores/      # Pinia 스토어 (auth 등)
├── router/      # Vue Router 설정
└── network/     # Axios 인스턴스 및 API 함수
```

## 관련 서비스

- [core-api](../core-api) — 백엔드 API 서버
