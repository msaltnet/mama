from fastapi import FastAPI
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, Admin
from sqlalchemy.orm import Session
import bcrypt

# .env 파일 로드
load_dotenv()

# 환경변수에서 DB 정보 읽기
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')
DB_NAME = os.getenv('POSTGRES_DB', 'mama_db')
DB_USER = os.getenv('POSTGRES_USER', 'your_username')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'your_password')

DB_URL = f'postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

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

if __name__ == "__main__":
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"} 