import os
import json
from datetime import datetime, timedelta
from typing import List, Optional, Union

import bcrypt
import jwt
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status, Body, Header, Request, BackgroundTasks, Security
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, APIKeyHeader
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import Session, sessionmaker, selectinload
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from .config import (
    DB_URL,
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
    JWT_SECRET_KEY,
    SERVER_API_KEY,
    LITELLM_USER_ID,
)
from .models import Admin, Base, User, AllowedModel, AllowedService, EventLog
from .schemas import (
    AdminCreateRequest,
    PasswordChangeRequest,
    UserCreateRequest,
    UserUpdateRequest,
    UsersCreateListRequest,
    UsersBatchUpdateRequest,
    UsersDeleteRequest,
    UserRead,
    KeyRequest,
    KeyResponse,
    EventLogRead,
    EventLogFilter,
    AdminPasswordSetRequest,
)
from .litellm_service import LiteLLMService


def init_db():
    """기본 슈퍼 관리자 계정 생성"""
    # 동기 엔진 생성
    sync_engine = create_engine(DB_URL)

    # 기본 슈퍼 관리자 계정 생성
    with sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)() as session:
        # 이미 mama 계정이 있는지 확인
        existing_admin = session.query(Admin).filter(Admin.username == "mama").first()
        if not existing_admin:
            admin = Admin(username="mama", is_super_admin=True)
            admin.set_password("mama")
            session.add(admin)
            session.commit()
            print("기본 슈퍼 관리자 계정이 생성되었습니다. (mama/mama)")
        else:
            print("기본 슈퍼 관리자 계정이 이미 존재합니다.")

    sync_engine.dispose()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup 단계
    init_db()
    yield
    # shutdown 단계 (필요하면 여기에 종료 처리 추가)


app = FastAPI(lifespan=lifespan)

# 정적 파일(프론트엔드 빌드 결과) 서빙 경로를 '/static'으로 변경
app.mount("/static", StaticFiles(directory="./frontend/dist", html=True), name="static")

# 동기 데이터베이스 설정 (백그라운드 로그용)
sync_engine = create_engine(DB_URL)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# 비동기 데이터베이스 설정
ASYNC_DB_URL = DB_URL.replace("postgresql+psycopg2", "postgresql+asyncpg")
engine = create_async_engine(
    ASYNC_DB_URL,
    echo=True,
    pool_size=10,  # 기본 연결 풀 크기
    max_overflow=20,  # 최대 오버플로우 연결 수
    pool_timeout=30,  # 연결 대기 시간 (초)
    pool_recycle=3600,  # 연결 재사용 시간 (1시간)
    pool_pre_ping=True,  # 연결 유효성 검사
)
SessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=engine, class_=AsyncSession
)


# DB 세션 의존성 함수
async def get_db():
    async with SessionLocal() as session:
        yield session


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)


async def get_current_admin(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    result = await db.execute(select(Admin).where(Admin.username == username))
    admin = result.scalars().first()
    if admin is None:
        raise credentials_exception
    return admin


async def get_current_admin_or_api_key(
    token: Optional[str] = Security(oauth2_scheme),
    x_api_key: Optional[str] = Security(api_key_header),
    db: AsyncSession = Depends(get_db),
) -> tuple[Optional[Admin], Optional[str]]:
    """
    Get current admin from JWT token or verify x-api-key.
    Returns (Admin object, None) for JWT auth or (None, 'SERVER_API') for API key auth.
    """
    # x-api-key가 제공된 경우
    if x_api_key:
        if x_api_key != SERVER_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid or missing API key.")
        return (None, "SERVER_API")

    # JWT 토큰으로 인증
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    result = await db.execute(select(Admin).where(Admin.username == username))
    admin = result.scalars().first()
    if admin is None:
        raise credentials_exception
    return (admin, None)


def superuser_required(current_admin: Admin = Depends(get_current_admin)):
    try:
        is_super_admin = current_admin.is_super_admin
        if not bool(is_super_admin):
            raise HTTPException(status_code=403, detail="Super admin privileges required.")
        return current_admin
    except Exception as e:
        # admin 객체 접근 실패 시에도 권한 없음으로 처리
        raise HTTPException(status_code=403, detail="Super admin privileges required.")


def log_event_sync(
    admin_id: Optional[str],
    event_type: str,
    event_detail: Optional[str] = None,
    user_id: Optional[str] = None,
    result: str = "SUCCESS",
):
    """(동기) 별도 트랜잭션으로 이벤트 로그를 생성합니다."""
    db = None
    try:
        db = SyncSessionLocal()  # 동기 세션 생성

        event_log = EventLog(
            admin_id=admin_id,
            user_id=user_id,
            event_type=event_type,
            event_detail=event_detail,
            result=result,
        )
        db.add(event_log)
        db.commit()
    except Exception as e:
        print(f"Failed to create event log: {admin_id}, {event_type}, {e}")
    finally:
        if db:
            db.close()  # 세션 닫기


@app.post("/login")
async def login(
    request: Request,
    background_tasks: BackgroundTasks,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(Admin).where(Admin.username == form_data.username))
        admin = result.scalars().first()
        if not admin or not admin.verify_password(form_data.password):
            # 로그인 실패 시에는 이벤트 로그를 생성하지 않음 (보안상 알 수 없는 사용자의 시도는 기록하지 않음)
            raise HTTPException(status_code=400, detail="Incorrect username or password")

        # admin 객체의 속성을 미리 로드하여 지연 로딩 문제 방지
        admin_username = admin.username
        is_super_admin = admin.is_super_admin

        # 로그인 성공 로그 (백그라운드에서 처리)
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 문자열 전달
            event_type="LOGIN",
            event_detail=f"Successful login for admin: {admin_username}",
            result="SUCCESS",
        )

        access_token = create_access_token(
            data={"sub": admin_username, "is_super_admin": is_super_admin}
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        # 예상치 못한 오류 로그 - admin_id를 None으로 설정 (백그라운드에서 처리)
        background_tasks.add_task(
            log_event_sync,
            admin_id=None,  # None으로 설정
            event_type="LOGIN",
            event_detail=f"Unexpected error during login: {str(e)}",
            result="FAILURE",
        )
        raise


@app.post("/change-password")
async def change_password(
    request: Request,
    background_tasks: BackgroundTasks,
    req: PasswordChangeRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        # admin username을 미리 추출
        admin_username = current_admin.username

        result = await db.execute(select(Admin).where(Admin.id == current_admin.id))
        admin = result.scalars().first()
        if not admin or not admin.verify_password(req.old_password):
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="PASSWORD_CHANGE",
                event_detail="Failed password change - incorrect current password",
                result="FAILURE",
            )
            raise HTTPException(status_code=400, detail="Current password does not match.")

        admin.set_password(req.new_password)
        await db.commit()

        # 성공 로그 기록 (백그라운드에서 처리)
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="PASSWORD_CHANGE",
            event_detail="Password changed successfully",
            result="SUCCESS",
        )

        return {"msg": "비밀번호가 성공적으로 변경되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="PASSWORD_CHANGE",
            event_detail=f"Unexpected error during password change: {str(e)}",
            result="FAILURE",
        )
        raise


@app.post("/create-admin")
async def create_admin(
    request: Request,
    background_tasks: BackgroundTasks,
    req: AdminCreateRequest,
    current_admin: Admin = Depends(superuser_required),
    db: AsyncSession = Depends(get_db),
):
    try:
        # admin username을 미리 추출
        admin_username = current_admin.username

        result = await db.execute(select(Admin).where(Admin.username == req.username))
        if result.scalars().first():
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="ADMIN_CREATE",
                event_detail=f"Failed to create admin - username already exists: {req.username}",
                result="FAILURE",
            )
            raise HTTPException(status_code=400, detail="Admin username already exists.")

        new_admin = Admin(username=req.username, is_super_admin=False)
        new_admin.set_password(req.password)
        db.add(new_admin)
        await db.commit()

        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="ADMIN_CREATE",
            event_detail=f"Admin account created: {req.username}",
            result="SUCCESS",
        )

        return {"msg": f"관리자 계정({req.username})이 성공적으로 생성되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="ADMIN_CREATE",
            event_detail=f"Unexpected error during admin creation: {str(e)}",
            result="FAILURE",
        )
        raise


@app.post("/set-admin-password")
async def set_admin_password(
    request: Request,
    background_tasks: BackgroundTasks,
    req: AdminPasswordSetRequest,
    current_admin: Admin = Depends(superuser_required),
    db: AsyncSession = Depends(get_db),
):
    try:
        # admin username을 미리 추출
        admin_username = current_admin.username

        # 대상 admin 계정이 존재하는지 확인
        result = await db.execute(select(Admin).where(Admin.username == req.username))
        target_admin = result.scalars().first()
        if not target_admin:
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,
                event_type="Admin Password Set",
                event_detail=f"Failed to set admin password - admin not found: {req.username}",
                result="FAILURE",
            )
            raise HTTPException(status_code=404, detail="Admin account not found.")

        # 패스워드 변경
        target_admin.set_password(req.new_password)
        await db.commit()

        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,
            event_type="Admin Password Set",
            event_detail=f"Admin password set successfully: {req.username}",
            result="SUCCESS",
        )

        return {"msg": f"관리자 계정({req.username})의 패스워드가 성공적으로 변경되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,
            event_type="Admin Password Set",
            event_detail=f"Unexpected error during admin password set: {str(e)}",
            result="FAILURE",
        )
        raise


@app.get("/", response_class=HTMLResponse)
async def serve_spa():
    """React SPA 서빙"""
    try:
        with open("frontend/dist/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>System Error. Please contact administrator.</h1>")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/health/db")
async def db_health_check():
    """데이터베이스 연결 풀 상태 확인"""
    pool = engine.pool
    return {
        "status": "healthy",
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool.invalid(),
    }


@app.get("/users", response_model=List[UserRead])
async def list_users(
    organization: Optional[str] = None,
    auth: tuple[Optional[Admin], Optional[str]] = Depends(get_current_admin_or_api_key),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).options(
        selectinload(User.allowed_models), selectinload(User.allowed_services)
    )
    if organization:
        stmt = stmt.where(User.organization == organization)
    result = await db.execute(stmt)
    users = result.scalars().all()
    out = []
    for user in users:
        out.append(
            {
                "id": user.id,
                "user_id": user.user_id,
                "organization": user.organization,
                "key_value": user.key_value,
                "extra_info": user.extra_info,
                "created_at": user.created_at.isoformat() if user.created_at is not None else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at is not None else None,
                "allowed_models": [m.model_name for m in user.allowed_models],
                "allowed_services": [s.service_name for s in user.allowed_services],
            }
        )
    return out


@app.get("/user/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    auth: tuple[Optional[Admin], Optional[str]] = Depends(get_current_admin_or_api_key),
    db: AsyncSession = Depends(get_db),
):
    """특정 사용자 정보 조회"""
    result = await db.execute(
        select(User)
        .options(selectinload(User.allowed_models), selectinload(User.allowed_services))
        .where(User.user_id == user_id)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return {
        "id": user.id,
        "user_id": user.user_id,
        "organization": user.organization,
        "key_value": user.key_value,
        "extra_info": user.extra_info,
        "created_at": user.created_at.isoformat() if user.created_at is not None else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at is not None else None,
        "allowed_models": [m.model_name for m in user.allowed_models],
        "allowed_services": [s.service_name for s in user.allowed_services],
    }


@app.post("/users", response_model=List[UserRead])
async def create_user(
    request: Request,
    background_tasks: BackgroundTasks,
    req: UsersCreateListRequest,
    auth: tuple[Optional[Admin], Optional[str]] = Depends(get_current_admin_or_api_key),
    db: AsyncSession = Depends(get_db),
):
    try:
        # admin username을 미리 추출
        current_admin, api_identifier = auth
        admin_username = api_identifier if api_identifier else current_admin.username

        # 중복 검사
        user_ids = [user.user_id for user in req.users]
        existing_users = await db.execute(select(User).where(User.user_id.in_(user_ids)))
        existing_user_ids = [user.user_id for user in existing_users.scalars().all()]

        if existing_user_ids:
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="USER_CREATE",
                event_detail=f"Failed to create users - duplicates found: {existing_user_ids}",
                result="FAILURE",
            )
            raise HTTPException(
                status_code=400,
                detail=f"존재하는 사용자 ID가 있습니다: {', '.join(existing_user_ids)}",
            )

        # LiteLLM 키 초기화
        litellm_service = LiteLLMService()

        # 모든 사용자 생성
        created_users_data = []
        for user_req in req.users:
            try:
                # LiteLLM에서 키 생성
                # 모델 리스트를 받아옵니다
                key_value = await litellm_service.generate_key(
                    models=user_req.allowed_models,  # 모델 리스트를 받아옵니다
                    user_id=LITELLM_USER_ID,  # 환경 변수에서 가져온 LiteLLM 사용자 ID
                    key_alias=user_req.user_id,
                    metadata={"organization": user_req.organization},
                )

                user = User(
                    user_id=user_req.user_id,
                    organization=user_req.organization,
                    key_value=key_value,
                    extra_info=user_req.extra_info,
                )
                db.add(user)
                created_users_data.append({"user": user, "user_req": user_req})

            except Exception as e:
                # 생성 실패에 대한 롤백
                await db.rollback()
                background_tasks.add_task(
                    log_event_sync,
                    admin_id=admin_username,  # username 사용
                    event_type="USER_CREATE",
                    event_detail=f"Failed to create user {user_req.user_id}: {str(e)}",
                    result="FAILURE",
                )
                raise HTTPException(
                    status_code=500,
                    detail=f"사용자 {user_req.user_id} 생성에 실패했습니다: {str(e)}",
                )

        # 먼저 사용자들을 커밋하고 ID를 생성합니다
        await db.commit()

        # 생성된 사용자들의 ID를 조회하여 모델 권한을 설정합니다
        for data in created_users_data:
            # 사용자 ID를 조회합니다
            result = await db.execute(
                select(User.id).where(User.user_id == data["user_req"].user_id)
            )
            user_id = result.scalar_one()

            # 사용자 모델 권한 설정 (ID가 생성됨)
            for model_name in data["user_req"].allowed_models:
                allowed_model = AllowedModel(user_id=user_id, model_name=model_name)
                db.add(allowed_model)

        # 모델 권한 커밋
        await db.commit()

        # 성공 로그 기록 (백그라운드에서 처리)
        created_user_ids = [data["user_req"].user_id for data in created_users_data]
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,
            user_id=created_user_ids[0],
            event_type="USER_CREATE",
            event_detail=f"Users created successfully: {created_user_ids}",
            result="SUCCESS",
        )

        # 응답 형식으로 변환
        result_users = []
        for data in created_users_data:
            # 생성된 사용자를 조회합니다
            result = await db.execute(select(User).where(User.user_id == data["user_req"].user_id))
            created_user = result.scalar_one()

            # 생성된 사용자의 allowed_models를 조회합니다
            models_result = await db.execute(
                select(AllowedModel.model_name).where(AllowedModel.user_id == created_user.id)
            )
            allowed_models = [row[0] for row in models_result.fetchall()]

            result_users.append(
                {
                    "id": created_user.id,
                    "user_id": created_user.user_id,
                    "organization": created_user.organization,
                    "key_value": created_user.key_value,
                    "extra_info": created_user.extra_info,
                    "created_at": (
                        created_user.created_at.isoformat()
                        if created_user.created_at is not None
                        else None
                    ),
                    "updated_at": (
                        created_user.updated_at.isoformat()
                        if created_user.updated_at is not None
                        else None
                    ),
                    "allowed_models": allowed_models,
                    "allowed_services": [],
                }
            )

        return result_users
    except HTTPException:
        raise
    except Exception as e:
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # 미리 추출한 ID 사용
            event_type="USER_CREATE",
            event_detail=f"Unexpected error during user creation: {str(e)}",
            result="FAILURE",
        )
        raise


def verify_server_api_key(x_api_key: str = Header(None)) -> str:
    """Verify x-api-key header and return 'SERVER_API' identifier for logging"""
    if x_api_key != SERVER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")
    return "SERVER_API"


@app.get("/key/{user_id}")
async def get_user_key(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    x_api_key: str = Header(None),
):
    api_identifier = verify_server_api_key(x_api_key)
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()
    if not user:
        background_tasks.add_task(
            log_event_sync,
            admin_id=api_identifier,
            event_type="GET_USER_KEY",
            event_detail=f"Failed to get user key - user not found: {user_id}",
            user_id=user_id,
            result="FAILURE",
        )
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    background_tasks.add_task(
        log_event_sync,
        admin_id=api_identifier,
        event_type="GET_USER_KEY",
        event_detail=f"User key retrieved successfully: {user_id}",
        user_id=user_id,
        result="SUCCESS",
    )
    return {"key": user.key_value}


@app.post("/key/info", response_model=list[KeyResponse])
async def get_keys(
    background_tasks: BackgroundTasks,
    req: KeyRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    x_api_key: str = Header(None),
):
    api_identifier = verify_server_api_key(x_api_key)
    stmt = select(User).where(User.user_id.in_(req.user_ids))
    result = await db.execute(stmt)
    users = result.scalars().all()
    out = [KeyResponse(user_id=u.user_id, user_key=u.key_value) for u in users]

    background_tasks.add_task(
        log_event_sync,
        admin_id=api_identifier,
        event_type="GET_KEYS_INFO",
        event_detail=f"Keys info retrieved for {len(out)} users: {req.user_ids}",
        user_id=req.user_ids[0] if req.user_ids else None,
        result="SUCCESS",
    )
    return out


@app.get("/models")
async def get_litellm_models(current_admin: Admin = Depends(get_current_admin)):
    """
    LiteLLM에서 사용 가능한 모델 목록을 반환하는 API
    관리자 인증 필요
    """
    service = LiteLLMService()
    try:
        models = await service.get_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/users/batch", response_model=List[UserRead])
async def batch_update_users(
    request: Request,
    background_tasks: BackgroundTasks,
    req: UsersBatchUpdateRequest,
    auth: tuple[Optional[Admin], Optional[str]] = Depends(get_current_admin_or_api_key),
    db: AsyncSession = Depends(get_db),
):
    """복수 사용자 모델 권한 배치 수정"""
    try:
        # admin username을 미리 추출
        current_admin, api_identifier = auth
        admin_username = api_identifier if api_identifier else current_admin.username

        if not req.user_ids:
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="USER_UPDATE",
                event_detail="Failed to batch update users - no user IDs provided",
                result="FAILURE",
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one user ID is required",
            )

        # 사용자 존재 여부 확인
        result = await db.execute(select(User).where(User.user_id.in_(req.user_ids)))
        users = result.scalars().all()

        if len(users) != len(req.user_ids):
            found_user_ids = {user.user_id for user in users}
            missing_user_ids = [uid for uid in req.user_ids if uid not in found_user_ids]
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="USER_UPDATE",
                event_detail=f"Failed to batch update users - users not found: {missing_user_ids}",
                result="FAILURE",
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Users not found: {missing_user_ids}",
            )

        updated_users = []

        # LiteLLM 키 초기화
        litellm_service = LiteLLMService()

        for user in users:
            # allowed_models 업데이트
            if req.allowed_models is not None:
                # 기존 allowed_models 삭제
                await db.execute(delete(AllowedModel).where(AllowedModel.user_id == user.id))

                # 새로운 allowed_models 추가
                for model_name in req.allowed_models:
                    allowed_model = AllowedModel(user_id=user.id, model_name=model_name)
                    db.add(allowed_model)

                # LiteLLM 키의 모델 권한 업데이트
                try:
                    await litellm_service.update_key_models(user.key_value, req.allowed_models)
                except Exception as e:
                    # LiteLLM 데이터 업데이트 실패에 대한 DB 커밋 (예외 발생 시 무시)
                    print(
                        f"Warning: Failed to update LiteLLM key models for user {user.user_id}: {str(e)}"
                    )

            # updated_at 업데이트
            user.updated_at = datetime.utcnow()

            updated_users.append(user)

        await db.commit()

        # 성공 로그 기록 (백그라운드에서 처리)
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="USER_UPDATE",
            event_detail=f"Batch update completed successfully for users: {req.user_ids}",
            result="SUCCESS",
        )

        # 데이터 업데이트된 사용자들을 반환합니다
        result_users = []
        for user in updated_users:
            await db.refresh(user)

            # 데이터 allowed_models와 allowed_services를 조회합니다
            models_result = await db.execute(
                select(AllowedModel.model_name).where(AllowedModel.user_id == user.id)
            )
            allowed_models = [row[0] for row in models_result.fetchall()]

            services_result = await db.execute(
                select(AllowedService.service_name).where(AllowedService.user_id == user.id)
            )
            allowed_services = [row[0] for row in services_result.fetchall()]

            result_users.append(
                {
                    "id": user.id,
                    "user_id": user.user_id,
                    "organization": user.organization,
                    "key_value": user.key_value,
                    "extra_info": user.extra_info,
                    "created_at": (
                        user.created_at.isoformat() if user.created_at is not None else None
                    ),
                    "updated_at": (
                        user.updated_at.isoformat() if user.updated_at is not None else None
                    ),
                    "allowed_models": allowed_models,
                    "allowed_services": allowed_services,
                }
            )

        return result_users
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # 미리 추출한 ID 사용
            event_type="USER_UPDATE",
            event_detail=f"Unexpected error during batch user update: {str(e)}",
            result="FAILURE",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch update users: {str(e)}",
        )


@app.put("/user/{user_id}", response_model=UserRead)
async def update_user(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: str,
    req: UserUpdateRequest,
    auth: tuple[Optional[Admin], Optional[str]] = Depends(get_current_admin_or_api_key),
    db: AsyncSession = Depends(get_db),
):
    """사용자 정보 수정"""
    try:
        # admin username을 미리 추출
        current_admin, api_identifier = auth
        admin_username = api_identifier if api_identifier else current_admin.username

        # 사용자 존재 여부 확인
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="USER_UPDATE",
                event_detail=f"Failed to update user - user not found: {user_id}",
                result="FAILURE",
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # 사용자 정보 업데이트
        if req.organization is not None:
            user.organization = req.organization
        if req.extra_info is not None:
            user.extra_info = req.extra_info

        # allowed_models 업데이트
        if req.allowed_models is not None:
            # 기존 allowed_models 삭제
            await db.execute(delete(AllowedModel).where(AllowedModel.user_id == user.id))

            # 새로운 allowed_models 추가
            for model_name in req.allowed_models:
                allowed_model = AllowedModel(user_id=user.id, model_name=model_name)
                db.add(allowed_model)

            # LiteLLM 키의 모델 권한 업데이트
            try:
                litellm_service = LiteLLMService()
                await litellm_service.update_key_models(user.key_value, req.allowed_models)
            except Exception as e:
                # LiteLLM 데이터 업데이트 실패에 대한 DB 커밋 (예외 발생 시 무시)
                print(
                    f"Warning: Failed to update LiteLLM key models for user {user.user_id}: {str(e)}"
                )

        # updated_at 업데이트
        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        # 데이터 allowed_models와 allowed_services를 조회합니다
        models_result = await db.execute(
            select(AllowedModel.model_name).where(AllowedModel.user_id == user.id)
        )
        allowed_models = [row[0] for row in models_result.fetchall()]

        services_result = await db.execute(
            select(AllowedService.service_name).where(AllowedService.user_id == user.id)
        )
        allowed_services = [row[0] for row in services_result.fetchall()]

        # 성공 로그 기록 (백그라운드에서 처리)
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="USER_UPDATE",
            event_detail=f"User updated successfully: {user_id}",
            user_id=user.user_id,
            result="SUCCESS",
        )

        return {
            "id": user.id,
            "user_id": user.user_id,
            "organization": user.organization,
            "key_value": user.key_value,
            "extra_info": user.extra_info,
            "created_at": user.created_at.isoformat() if user.created_at is not None else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at is not None else None,
            "allowed_models": allowed_models,
            "allowed_services": allowed_services,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="USER_UPDATE",
            event_detail=f"Unexpected error during user update: {str(e)}",
            result="FAILURE",
        )


@app.delete("/users/batch")
async def batch_delete_users(
    request: Request,
    background_tasks: BackgroundTasks,
    req: UsersDeleteRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """복수 사용자 배치 삭제"""
    try:
        # admin username을 미리 추출
        admin_username = current_admin.username

        if not req.user_ids:
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="USER_DELETE",
                event_detail="Failed to delete users - no user IDs provided",
                result="FAILURE",
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one user ID is required",
            )

        # 사용자 존재 여부 확인
        result = await db.execute(select(User).where(User.user_id.in_(req.user_ids)))
        users = result.scalars().all()

        if len(users) != len(req.user_ids):
            found_user_ids = {user.user_id for user in users}
            missing_user_ids = [uid for uid in req.user_ids if uid not in found_user_ids]
            background_tasks.add_task(
                log_event_sync,
                admin_id=admin_username,  # username 사용
                event_type="USER_DELETE",
                event_detail=f"Failed to delete users - users not found: {missing_user_ids}",
                result="FAILURE",
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Users not found: {missing_user_ids}",
            )

        # LiteLLM 키 초기화
        litellm_service = LiteLLMService()

        # 관리자 이외의 모든 것 (AllowedModel, AllowedService)을 LiteLLM에 전달
        for user in users:
            await db.execute(delete(AllowedModel).where(AllowedModel.user_id == user.id))
            await db.execute(delete(AllowedService).where(AllowedService.user_id == user.id))

            # LiteLLM에서 키 삭제
            try:
                await litellm_service.delete_key(user.key_value)
            except Exception as e:
                # 키 삭제 실패에 대한 계속 진행 (예외 발생 시 무시)
                print(f"Warning: Failed to delete LiteLLM key for user {user.user_id}: {str(e)}")

        # 사용자 삭제
        await db.execute(delete(User).where(User.user_id.in_(req.user_ids)))

        await db.commit()

        # 성공 로그 기록 (백그라운드에서 처리)
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="USER_DELETE",
            event_detail=f"Users deleted successfully: {req.user_ids}",
            result="SUCCESS",
        )

        return {
            "message": f"Successfully deleted {len(req.user_ids)} users",
            "deleted_user_ids": req.user_ids,
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        background_tasks.add_task(
            log_event_sync,
            admin_id=admin_username,  # username 사용
            event_type="USER_DELETE",
            event_detail=f"Unexpected error during user deletion: {str(e)}",
            result="FAILURE",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete users: {str(e)}",
        )


@app.get("/event-logs", response_model=List[EventLogRead])
async def get_event_logs(
    admin_id: Optional[str] = None,
    user_id: Optional[str] = None,
    event_type: Optional[str] = None,
    result: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """이벤트 로그 조회"""
    try:
        # 기본 쿼리
        stmt = select(EventLog)

        # 필터 조건 추가
        if admin_id is not None:
            stmt = stmt.where(EventLog.admin_id == admin_id)
        if user_id is not None:
            stmt = stmt.where(EventLog.user_id == user_id)
        if event_type is not None:
            stmt = stmt.where(EventLog.event_type == event_type)
        if result is not None:
            stmt = stmt.where(EventLog.result == result)
        if start_date is not None:
            stmt = stmt.where(EventLog.created_at >= start_date)
        if end_date is not None:
            stmt = stmt.where(EventLog.created_at <= end_date)

        # 정렬 (최신순)
        stmt = stmt.order_by(EventLog.created_at.desc())

        # 페이지네이션
        stmt = stmt.limit(limit).offset(offset)

        result = await db.execute(stmt)
        event_logs = result.scalars().all()

        # 응답 형식으로 변환
        out = []
        for log in event_logs:
            out.append(
                {
                    "id": log.id,
                    "admin_id": log.admin_id,
                    "user_id": log.user_id,
                    "event_type": log.event_type,
                    "event_detail": log.event_detail,
                    "result": log.result,
                    "created_at": log.created_at,
                }
            )

        return out
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve event logs: {str(e)}",
        )
