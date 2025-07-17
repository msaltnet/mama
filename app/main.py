from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import os

from .config import DB_URL, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, Admin
from sqlalchemy.orm import Session
import bcrypt
import jwt
from datetime import datetime, timedelta
from .schemas import PasswordChangeRequest, AdminCreateRequest


app = FastAPI()

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
            hashed_pw = bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt())
            admin = Admin(
                username='admin',
                password=hashed_pw.decode('utf-8'),
                is_super_admin=True
            )
            session.add(admin)
            session.commit()
            print("[INFO] 슈퍼 관리자(admin/admin) 계정이 생성되었습니다.")
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
        raise HTTPException(status_code=403, detail="슈퍼관리자 권한이 필요합니다.")
    return current_admin

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.username == form_data.username).first()
        if not admin or not bcrypt.checkpw(form_data.password.encode('utf-8'), admin.password.encode('utf-8')):
            raise HTTPException(status_code=400, detail="Incorrect username or password")
        access_token = create_access_token(
            data={"sub": admin.username, "is_super_admin": admin.is_super_admin}
        )
        return {"access_token": access_token, "token_type": "bearer"}
    finally:
        db.close()

@app.post("/change-password")
def change_password(
    req: PasswordChangeRequest,
    current_admin: Admin = Depends(get_current_admin)
):
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.id == current_admin.id).first()
        if not admin or not admin.verify_password(req.old_password):
            raise HTTPException(status_code=400, detail="기존 비밀번호가 일치하지 않습니다.")
        admin.set_password(req.new_password)
        db.commit()
        return {"msg": "비밀번호가 성공적으로 변경되었습니다."}
    finally:
        db.close()

@app.post("/create-admin")
def create_admin(
    req: AdminCreateRequest,
    current_admin: Admin = Depends(superuser_required)
):
    db = SessionLocal()
    try:
        if db.query(Admin).filter(Admin.username == req.username).first():
            raise HTTPException(status_code=400, detail="이미 존재하는 관리자 아이디입니다.")
        new_admin = Admin(username=req.username, is_super_admin=False)
        new_admin.set_password(req.password)
        db.add(new_admin)
        db.commit()
        return {"msg": f"관리자 계정({req.username})이 성공적으로 생성되었습니다."}
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"} 