import os
from datetime import datetime, timedelta
from typing import List, Optional

import bcrypt
import jwt
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status, Body, Header
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from .config import DB_URL, JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET_KEY, SERVER_API_KEY
from .models import Admin, Base, User, AllowedModel, AllowedService
from .schemas import (
    AdminCreateRequest,
    PasswordChangeRequest,
    UserCreateRequest,
    UserUpdateRequest,
    UsersCreateListRequest,
    UserRead,
    KeyRequest,
    KeyResponse,
)
import random
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


app = FastAPI()

# 정적 파일(프론트엔드 빌드 결과) 서빙 경로를 '/static'으로 변경
app.mount("/static", StaticFiles(directory="./frontend/dist", html=True), name="static")

ASYNC_DB_URL = DB_URL.replace("postgresql+psycopg2", "postgresql+asyncpg")
engine = create_async_engine(ASYNC_DB_URL, echo=True)
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


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


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


def superuser_required(current_admin: Admin = Depends(get_current_admin)):
    if not bool(current_admin.is_super_admin):
        raise HTTPException(status_code=403, detail="Super admin privileges required.")
    return current_admin


@app.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(select(Admin).where(Admin.username == form_data.username))
        admin = result.scalars().first()
        if not admin or not admin.verify_password(form_data.password):
            raise HTTPException(status_code=400, detail="Incorrect username or password")
        access_token = create_access_token(
            data={"sub": admin.username, "is_super_admin": admin.is_super_admin}
        )
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        pass


@app.post("/change-password")
async def change_password(
    req: PasswordChangeRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Admin).where(Admin.id == current_admin.id))
    admin = result.scalars().first()
    if not admin or not admin.verify_password(req.old_password):
        raise HTTPException(status_code=400, detail="Current password does not match.")
    admin.set_password(req.new_password)
    await db.commit()
    return {"msg": "비밀번호가 성공적으로 변경되었습니다."}


@app.post("/create-admin")
async def create_admin(
    req: AdminCreateRequest,
    current_admin: Admin = Depends(superuser_required),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Admin).where(Admin.username == req.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Admin username already exists.")
    new_admin = Admin(username=req.username, is_super_admin=False)
    new_admin.set_password(req.password)
    db.add(new_admin)
    await db.commit()
    return {"msg": f"관리자 계정({req.username})이 성공적으로 생성되었습니다."}


@app.get("/", response_class=HTMLResponse)
async def serve_spa():
    """Serve React SPA"""
    try:
        with open("frontend/dist/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>System Error. Please contact administrator.</h1>")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# 조류 이름 리스트
BIRD_NAMES = [
    "sparrow",
    "eagle",
    "owl",
    "parrot",
    "falcon",
    "heron",
    "crane",
    "duck",
    "swan",
    "magpie",
    "woodpecker",
    "kingfisher",
    "pigeon",
    "dove",
    "wren",
    "robin",
    "finch",
    "tit",
    "jay",
    "lark",
]


def get_random_bird_key():
    bird = random.choice(BIRD_NAMES)
    num = random.randint(1000, 9999)
    return f"{bird}-{num}"


@app.get("/users", response_model=List[UserRead])
async def list_users(
    organization: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
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


@app.post("/users", response_model=List[UserRead])
async def create_user(
    req: UsersCreateListRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # 중복 검사
    user_ids = [user.user_id for user in req.users]
    existing_users = await db.execute(select(User).where(User.user_id.in_(user_ids)))
    existing_user_ids = [user.user_id for user in existing_users.scalars().all()]

    if existing_user_ids:
        raise HTTPException(
            status_code=400, detail=f"이미 존재하는 사용자 ID입니다: {', '.join(existing_user_ids)}"
        )

    # 모든 사용자 생성
    created_users = []
    for user_req in req.users:
        user = User(
            user_id=user_req.user_id,
            organization=user_req.organization,
            key_value=get_random_bird_key(),
            extra_info=user_req.extra_info,
        )
        db.add(user)
        created_users.append(user)

    await db.commit()

    # 생성된 사용자들을 새로고침하여 ID 등을 가져옴
    for user in created_users:
        await db.refresh(user)

    # 응답 형식으로 변환
    return [
        {
            "id": user.id,
            "user_id": user.user_id,
            "organization": user.organization,
            "key_value": user.key_value,
            "extra_info": user.extra_info,
            "created_at": user.created_at.isoformat() if user.created_at is not None else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at is not None else None,
            "allowed_models": [],
            "allowed_services": [],
        }
        for user in created_users
    ]


def verify_server_api_key(x_api_key: str = Header(None)):
    print(f"x_api_key: {x_api_key}")
    if x_api_key != SERVER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


@app.get("/key/{user_id}")
async def get_user_key(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    x_api_key: str = Header(None),
):
    verify_server_api_key(x_api_key)
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return {"key": user.key_value}


@app.post("/key/info", response_model=list[KeyResponse])
async def get_keys(
    req: KeyRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    x_api_key: str = Header(None),
):
    verify_server_api_key(x_api_key)
    stmt = select(User).where(User.user_id.in_(req.user_ids))
    result = await db.execute(stmt)
    users = result.scalars().all()
    out = [KeyResponse(user_id=u.user_id, user_key=u.key_value) for u in users]
    return out


@app.get("/models")
async def get_litellm_models(current_admin: Admin = Depends(get_current_admin)):
    """
    LiteLLM에서 사용 가능한 모델 리스트를 반환하는 API
    관리자 인증 필요
    """
    service = LiteLLMService()
    try:
        models = await service.get_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    req: UserUpdateRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """사용자 정보를 수정합니다."""
    try:
        # 사용자 존재 여부 확인
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
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

        # updated_at 필드 업데이트
        user.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(user)

        # 업데이트된 allowed_models와 allowed_services 조회
        models_result = await db.execute(
            select(AllowedModel.model_name).where(AllowedModel.user_id == user.id)
        )
        allowed_models = [row[0] for row in models_result.fetchall()]
        
        services_result = await db.execute(
            select(AllowedService.service_name).where(AllowedService.user_id == user.id)
        )
        allowed_services = [row[0] for row in services_result.fetchall()]

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}",
        )
