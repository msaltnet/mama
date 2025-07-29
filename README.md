# mama

mama는 사용자 정보에 맞게 LiteLLM Virtual Key를 손쉽게 관리할 수 있는 Key Management 시스템입니다. 관리자는 Web UI를 통해 사용자 정보를 관리할 수 있으며, 관련 시스템은 REST API를 통해 Key와 사용자 정보를 얻을 수 있습니다.

## 요구사항
- 관리자가 권한 업데이트 할 수 있는 Web UI를 제공한다
  - 슈퍼 관리자는 정보는 admin/admin으로 최초 생성된다
  - 슈퍼 관리자는 관리자 계정을 생성/삭제 할 수 있어야 한다
  - 관리자는 자신의 패스워드를 변경할 수 있다
  - 사용자 정보는 ID, 조직, 키, 허용 모델, 허용 서비스, 기타 정보를 포함
  - 다수 사용자의 정보를 조회 할 수 있다
  - 다수 사용자의 정보를 동시에 변경 할 수 있다
  - 허용 모델과 서비스 정보를 업데이트 할 때 교체, 추가, 삭제 할 수 있다
- 사용자 정보를 통해 Key를 조회할 수 있는 REST API를 제공한다
  - 다수의 사용자 ID를 입력 받고, 그에 해당하는 정보를 반환한다
- 발급된 Key를 포함한 사용자 정보는 DB에 저장된다
- 모든 사용자 정보 조회/수정 이벤트와 API 요청은 결과와 함께 저장된다

## 작업 순서
1. 데이터베이스 및 데이터 모델 설계
   - 사용자, 키, 허용 모델/서비스, 이벤트 로그 등 테이블 구조 설계 및 DB 반영
2. 슈퍼 관리자(admin/admin) 계정 자동 생성 로직 구현
3. 인증 및 권한 관리 기능 구현
   - 로그인, 패스워드 변경, 관리자/슈퍼관리자 권한 구분 등
4. Web UI 관리자 기능 구현
   - 관리자 계정 생성/삭제
   - 패스워드 변경
   - 사용자 정보 등록/조회/수정
   - 허용 모델/서비스 관리 등
   - 다수 사용자 동시 처리 (사용성 개선)
5. REST API 구현
   - 사용자 ID 리스트로 정보 및 키 반환 API
6. 이벤트 및 API 요청 로그 저장 기능 구현
   - 모든 정보 조회/수정, API 요청 결과를 이벤트 로그로 저장
7. 테스트 및 문서화
   - 각 기능별 테스트 코드 작성 및 문서 보완

## TODO
- LiteLLM 모듈이 현재 사용가능한 모델 조회하는 기능
- LiteLLM 모듈이 키를 생성/삭제하는 기능
- LiteLLM 모듈 - LiteLLM에 접근해서 Key를 생성하는 모듈 구현
- LiteLLM 모듈이 Key의 alias를 생성 및 업데이트하는 기능, 조회 안됨
- LiteLLM 모듈이 Key가 사용가능한 모델을 설정하는 기능
- backend - LiteLLM에서 현재 사용가능한 모델 정보를 조회해서 제공하는 api
- frontend - 현재 사용가능한 모델 정보를 불러와서 사용자 생성시에 선택해서 사용할 수 있게 함
- frontend - 사용자 정보 출력시 현재 사용 가능하지 않은 모델은 붉은색으로 표시
- frontend - JWT 토큰 만료된 경우, logout 처리 및 루트로 이동
- frontend - 사용자 동시에 여러명 생성하기
- frontend - 모든 모델 설정은 어떻게 되지, "all-team-models" 추가 할 수 있게.
- frontend - 사용자 리스트 정렬 기능 제공 (각 항목 테이블 헤드 클릭으로)
- frontend - 사용자 리스트에서 검색 기능 추가, 키워드 입력하면 id, 조직 기준으로 검색된 사용자만 표시되게 해줘.
- frontend - 사용자 정보 클릭하면 정보 수정 가능한 다이얼로그가 떠서 수정할 수 있게
- frontend - 복수의 사용자를 선택해서 모델 정보를 수정할 수 있는 기능 추가
- frontend - 복수의 사용자를 선택해서 삭제할 수 있는 기능 추가
---
- 리패터링 - 불필요한 코드, 디버깅 코드, 테스트 방법 강구


## Alembic 마이그레이션 사용법

### 1. Alembic 환경 초기화(최초 1회)
```
pip install alembic
alembic init alembic
```

### 2. 마이그레이션 파일 생성
```
alembic revision --autogenerate -m "메시지"
```

### 3. 마이그레이션 적용(업그레이드)
```
alembic upgrade head
```

### 4. 마이그레이션 롤백(다운그레이드)
```
alembic downgrade -1
```

### 5. 환경설정
- DB 연결 정보는 `.env` 파일에서 관리하며, `alembic/env.py`에서 자동으로 불러옵니다.
- 모델 변경 시 `alembic revision --autogenerate`로 변경사항을 감지할 수 있습니다.
- 마이그레이션 파일은 `alembic/versions/` 폴더에 생성됩니다.

### 6. 마이그레이션 버전 및 히스토리 확인
- 현재 DB에 적용된 마이그레이션 버전 확인
```
alembic current
```
- 전체 마이그레이션 히스토리 확인
```
alembic history
```

## Local Development Guide

### 1. Backend (FastAPI)

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up environment variables:
   - Copy `.env_example` to `.env` and fill in your DB and secret settings.
   - Example:
     ```
     cp .env_example .env
     # Edit .env as needed
     ```
3. Run the backend server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   - The API will be available at http://localhost:8000

### 2. Frontend (React + Vite)

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run the frontend dev server:
   ```bash
   npm run dev
   ```
   - The app will be available at http://localhost:5173 (default)

### 3. Accessing the App
- Open http://localhost:5173 in your browser.
- The frontend will connect to the backend at http://localhost:8000 (CORS 설정 필요시 backend에 추가).

### 4. Default Super Admin
- The default super admin account is created automatically:
  - **Username:** `admin`
  - **Password:** `admin`

### FastAPI에서 프론트엔드(React) 정적 파일 서빙 (로컬 개발)

1. 프론트엔드 빌드
```bash
cd frontend
npm install
npm run build
```

2. FastAPI 실행
```bash
uvicorn app.main:app --reload
```

3. 접속
- http://localhost:8000
  (프론트엔드와 백엔드가 모두 FastAPI에서 서빙됨)

> 개발 중에는 Vite dev 서버(`npm run dev`)를 사용하면 핫리로드 등 개발이 더 편리합니다.

### Testing

- Backend unit test test
   ```bash
   python -m pytest .
   ```

- 전체 린트 검사
  ```bash
  npm run lint
  ```
  - 백엔드: pylint(app)
  - 프론트엔드: ESLint(frontend)

- 전체 코드 자동 포맷
  ```bash
  npm run format
  ```
  - 백엔드: black(app)
  - 프론트엔드: Prettier(frontend)

## Deployment Guide

### Docker Compose 통합 배포 (권장)

백엔드와 프론트엔드가 하나의 서버에서 실행됩니다.

```bash
docker compose up -d --build
```

DB 마이그레이션 수행

```bash
docker compose run --rm migrate
```

- 웹 애플리케이션: http://localhost:8000
- API 문서: http://localhost:8000/docs

### Dockerfile 통합 빌드

프로젝트 루트에서 아래 명령어 실행. Dockerfile이 하나로 프론트엔드 빌드 후 백엔드에 포함

```bash
docker build -t mama .
```

빌드된 이미지 실행

```bash
docker run -p 8000:8000 --env-file .env mama
```

- 접속(프론트엔드와 백엔드가 모두 FastAPI에서 서빙됨): http://localhost:8000

### Dockerfile 개별 서비스 빌드 및 실행

1. 백엔드(FastAPI) 단독 빌드/실행
```bash
# 빌드
docker build -f Dockerfile.backend -t mama-backend .

# 실행
# .env 파일을 환경변수로 사용하려면 --env-file 옵션 사용
# (DB도 별도 띄워야 함)
docker run -p 8000:8000 --env-file .env mama-backend
```

2. 프론트엔드(React) 단독 빌드/실행
```bash
cd frontend

# 빌드
docker build -t mama-frontend .

# 실행
docker run -p 80:80 mama-frontend
```

**참고사항**
- Dockerfile만 사용할 경우, DB 등 다른 서비스는 별도로 띄워야 합니다.
- 여러 컨테이너를 연동하거나, 마이그레이션 등 자동화가 필요하면 docker-compose 사용을 권장합니다.
