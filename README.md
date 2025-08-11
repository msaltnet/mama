# mama

mama는 사용자 정보에 맞게 LiteLLM Virtual Key를 손쉽게 관리할 수 있는 Key Management 시스템입니다. 관리자는 Web UI를 통해 사용자 정보를 관리할 수 있으며, 관련 시스템은 REST API를 통해 Key와 사용자 정보를 얻을 수 있습니다.

## 🚀 주요 기능

- **사용자 관리**: 사용자 생성, 수정, 삭제 및 일괄 처리
- **API Key 관리**: LiteLLM Virtual Key 생성 및 관리
- **권한 관리**: 사용자별 모델 및 서비스 접근 권한 설정
- **관리자 시스템**: 다중 관리자 계정 및 권한 레벨 관리
- **이벤트 로깅**: 모든 관리 작업에 대한 상세한 로그 기록
- **REST API**: 외부 시스템과의 연동을 위한 API 제공

## 🏗️ Architecture

### 백엔드 (FastAPI)
- **FastAPI**: 현대적이고 빠른 Python 웹 프레임워크
- **SQLAlchemy**: 비동기 ORM을 통한 데이터베이스 관리
- **PostgreSQL**: 메인 데이터베이스
- **JWT**: 보안 인증 시스템
- **Alembic**: 데이터베이스 마이그레이션 관리

### 프론트엔드 (React)
- **React**: 최신 React 버전
- **TypeScript**: 타입 안전성 보장
- **Material-UI**: 현대적이고 반응형 UI 컴포넌트
- **Vite**: 빠른 개발 및 빌드 도구

## 📋 요구사항

- Docker & Docker Compose
- Python 3.8+
- Node.js 18+
- PostgreSQL 15+

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/msaltnet/mama
cd mama
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 필요한 환경 변수를 설정하세요:

```env
# 데이터베이스 설정
POSTGRES_DB=mama_db
POSTGRES_USER=mama_user
POSTGRES_PASSWORD=mama_password

# JWT 설정
JWT_SECRET_KEY=your_jwt_secret_key_here

# 서버 API Key
SERVER_API_KEY=your_server_api_key_here

# LiteLLM 설정
LITELLM_URL=http://host.docker.internal:4444
LITELLM_MASTER_KEY=sk-4444
LITELLM_TIMEOUT=10
LITELLM_MAX_RETRIES=3
LITELLM_RETRY_DELAY=1.0
LITELLM_USER_ID=mama_user

# 애플리케이션 포트
APP_PORT=8000
```

### 3. Docker Compose로 실행
```bash
# 애플리케이션 실행
docker compose up -d --build

# 데이터베이스 마이그레이션 실행
docker compose run --rm migrate
```

### 4. 접속
- **웹 애플리케이션**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **기본 관리자 계정**: `mama` / `mama`

## 🛠️ 개발 환경 설정

### 백엔드 개발
```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
export $(cat .env | xargs)

# 애플리케이션 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드 개발
```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 데이터베이스 마이그레이션
```bash
# 마이그레이션 생성
alembic revision --autogenerate -m "description"

# 마이그레이션 적용
alembic upgrade head

# 마이그레이션 롤백
alembic downgrade -1
```

## 📚 API 사용법

### 인증
대부분의 API 엔드포인트는 JWT 토큰 인증이 필요합니다.

```bash
# 로그인하여 토큰 획득
curl -X POST "http://localhost:8000/login" \
  -H "Content-Type: application/x-format" \
  -d "username=mama&password=mama"

# 토큰을 사용하여 API 호출
curl -X GET "http://localhost:8000/users" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 주요 API 엔드포인트

#### 사용자 관리
- `GET /users` - 사용자 목록 조회
- `POST /users` - 사용자 생성
- `PUT /user/{user_id}` - 사용자 정보 수정
- `DELETE /users/batch` - 사용자 일괄 삭제

#### API Key 관리
- `GET /key/{user_id}` - 특정 사용자의 Key 조회
- `POST /key/info` - 여러 사용자의 Key 정보 조회

#### 이벤트 로그
- `GET /event-logs` - 이벤트 로그 조회 (필터링 지원)

## 🔧 설정 및 커스터마이징

### LiteLLM 연동 설정
`app/litellm_service.py`에서 LiteLLM 서비스 설정을 조정할 수 있습니다:

- 연결 타임아웃
- 재시도 횟수 및 간격
- 에러 처리 로직

### 데이터베이스 설정
`app/config.py`에서 데이터베이스 연결 설정을 조정할 수 있습니다:

- 연결 풀 크기
- 타임아웃 설정
- SSL 설정

## 📦 배포

### Docker 이미지 빌드
```bash
# 백엔드 이미지
docker build -f Dockerfile.backend -t mama-backend .

# 프론트엔드 이미지
docker build -f frontend/Dockerfile -t mama-frontend ./frontend
```

### 프로덕션 환경 변수
프로덕션 환경에서는 다음 환경 변수를 반드시 설정하세요:

- `JWT_SECRET_KEY`: 강력한 랜덤 문자열
- `SERVER_API_KEY`: 외부 시스템 인증용 API Key
- `POSTGRES_PASSWORD`: 강력한 데이터베이스 비밀번호
