import os
from datetime import datetime, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, status, Body, Header
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import DB_URL, JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET_KEY, SERVER_API_KEY
from .models import Admin, Base, User
from .schemas import (
    AdminCreateRequest,
    PasswordChangeRequest,
    UserCreateRequest,
    UserRead,
    KeyRequest,
    KeyResponse,
)
import random

app = FastAPI()

# 정적 파일(프론트엔드 빌드 결과) 서빙
app.mount("/", StaticFiles(directory="./frontend/dist", html=True), name="static")

engine = create_engine(DB_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# 테이블 생성 (최초 1회)
def init_db():
    Base.metadata.create_all(bind=engine)
    # 슈퍼 관리자(admin/admin) 자동 생성
    session = Session(bind=engine)
    try:
        super_admin = session.query(Admin).filter_by(is_super_admin=True).first()
        if not super_admin:
            # 비밀번호 해시
            hashed_pw = bcrypt.hashpw("mama".encode("utf-8"), bcrypt.gensalt())
            admin = Admin(username="mama", password=hashed_pw.decode("utf-8"), is_super_admin=True)
            session.add(admin)
            session.commit()
            print("[INFO] 슈퍼 관리자(mama/mama) 계정이 생성되었습니다.")
        else:
            print("[INFO] 슈퍼 관리자 계정이 이미 존재합니다.")
    finally:
        session.close()


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


def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(SessionLocal)):
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
    admin = db.query(Admin).filter(Admin.username == username).first()
    if admin is None:
        raise credentials_exception
    return admin


def superuser_required(current_admin: Admin = Depends(get_current_admin)):
    if not bool(current_admin.is_super_admin):
        raise HTTPException(status_code=403, detail="Super admin privileges required.")
    return current_admin


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(SessionLocal)):
    try:
        admin = db.query(Admin).filter(Admin.username == form_data.username).first()
        if not admin or not bcrypt.checkpw(
            form_data.password.encode("utf-8"), admin.password.encode("utf-8")
        ):
            raise HTTPException(status_code=400, detail="Incorrect username or password")
        access_token = create_access_token(
            data={"sub": admin.username, "is_super_admin": admin.is_super_admin}
        )
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()


@app.post("/change-password")
def change_password(req: PasswordChangeRequest, current_admin: Admin = Depends(get_current_admin)):
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.id == current_admin.id).first()
        if not admin or not admin.verify_password(req.old_password):
            raise HTTPException(status_code=400, detail="Current password does not match.")
        admin.set_password(req.new_password)
        db.commit()
        return {"msg": "비밀번호가 성공적으로 변경되었습니다."}
    finally:
        db.close()


@app.post("/create-admin")
def create_admin(req: AdminCreateRequest, current_admin: Admin = Depends(superuser_required)):
    db = SessionLocal()
    try:
        if db.query(Admin).filter(Admin.username == req.username).first():
            raise HTTPException(status_code=400, detail="Admin username already exists.")
        new_admin = Admin(username=req.username, is_super_admin=False)
        new_admin.set_password(req.password)
        db.add(new_admin)
        db.commit()
        return {"msg": f"관리자 계정({req.username})이 성공적으로 생성되었습니다."}
    finally:
        db.close()


if __name__ == "__main__":
    init_db()


@app.get("/", response_class=HTMLResponse)
def serve_spa():
    """Serve React SPA"""
    try:
        with open("frontend/dist/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>System Error. Please contact administrator.</h1>")


@app.get("/health")
def health_check():
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
def list_users(
    organization: Optional[str] = None,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(SessionLocal),
):
    query = db.query(User)
    if organization:
        query = query.filter(User.organization == organization)
    users = query.all()
    # allowed_models, allowed_services 정보 포함
    result = []
    for user in users:
        result.append(
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
    return result


@app.post("/users", response_model=UserRead)
def create_user(
    req: UserCreateRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(SessionLocal),
):
    # user_id 중복 체크
    if db.query(User).filter(User.user_id == req.user_id).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자 ID입니다.")
    key_value = get_random_bird_key()
    user = User(
        user_id=req.user_id,
        organization=req.organization,
        key_value=key_value,
        extra_info=req.extra_info,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # allowed_models, allowed_services는 빈 리스트로 반환
    return {
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


def verify_serve_api_key(authorization: str = Header(None)):
    if authorization != SERVER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


@app.get("/key/{user_id}")
def get_user_key(
    user_id: str,
    db: Session = Depends(SessionLocal),
    authorization: str = Header(None),
):
    verify_serve_api_key(authorization)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return {"key": user.key_value}


@app.post("/key/info", response_model=list[KeyResponse])
def get_keys(
    req: KeyRequest = Body(...),
    db: Session = Depends(SessionLocal),
    authorization: str = Header(None),
):
    verify_serve_api_key(authorization)
    users = db.query(User).filter(User.user_id.in_(req.user_ids)).all()
    result = [KeyResponse(user_id=u.user_id, user_key=u.key_value) for u in users]
    return result
