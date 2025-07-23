import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app, get_current_admin, get_db
from app.models import Base, Admin, User
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, SERVER_API_KEY
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer

import re


# 테스트용 데이터베이스 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# OAuth2 스키마 정의
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


# 의존성 오버라이드
def override_get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(override_get_db)):
    credentials_exception = HTTPException(
        status_code=401,
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


# 의존성 오버라이드 설정
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_admin] = override_get_current_admin

# 테스트용 클라이언트 생성
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """테스트 데이터베이스 설정"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def admin_token():
    """테스트용 관리자 토큰 생성"""
    # 테스트용 관리자 생성
    db = TestingSessionLocal()
    try:
        admin = Admin(username="test_admin", is_super_admin=True)
        admin.set_password("test_password")
        db.add(admin)
        db.commit()
        
        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=30)
        to_encode = {
            "sub": admin.username,
            "is_super_admin": admin.is_super_admin,
            "exp": datetime.utcnow() + access_token_expires
        }
        token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token
    finally:
        db.close()


@pytest.fixture
def test_user():
    """테스트용 사용자 생성"""
    db = TestingSessionLocal()
    try:
        user = User(
            user_id="test_user",
            organization="test_org",
            key_value="sparrow-1234",
            extra_info="테스트 사용자"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


class TestGetUserKey:
    """사용자 키 조회 API 테스트"""
    
    def test_get_user_key_success(self, test_user):
        headers = {"Authorization": SERVER_API_KEY}
        response = client.get(f"/key/{test_user.user_id}", headers=headers)
        assert response.status_code == 200
        assert response.json() == {"key": "sparrow-1234"}
    
    def test_get_user_key_not_found(self):
        headers = {"Authorization": SERVER_API_KEY}
        response = client.get("/key/nonexistent_user", headers=headers)
        assert response.status_code == 404
        assert response.json()["detail"] == "사용자를 찾을 수 없습니다."

    def test_get_user_key_unauthorized(self, test_user):
        response = client.get(f"/key/{test_user.user_id}")
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or missing API key."


class TestLogin:
    """로그인 API 테스트"""
    
    def test_login_success(self):
        """정상적인 로그인 테스트"""
        # 테스트용 관리자 생성
        db = TestingSessionLocal()
        try:
            admin = Admin(username="login_test_admin", is_super_admin=False)
            admin.set_password("test_password")
            db.add(admin)
            db.commit()
        finally:
            db.close()
        
        response = client.post(
            "/login",
            data={"username": "login_test_admin", "password": "test_password"}
        )
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self):
        """잘못된 인증 정보로 로그인 테스트"""
        response = client.post(
            "/login",
            data={"username": "wrong_user", "password": "wrong_password"}
        )
        
        assert response.status_code == 400
        assert response.json()["detail"] == "Incorrect username or password"


class TestCreateUser:
    """사용자 생성 API 테스트"""
    
    def test_create_user_success(self, admin_token):
        """정상적인 사용자 생성 테스트"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_data = {
            "user_id": "new_user",
            "organization": "test_org",
            "extra_info": "새로운 사용자"
        }
        
        response = client.post("/users", json=user_data, headers=headers)
        
        assert response.status_code == 200
        result = response.json()
        assert result["user_id"] == "new_user"
        assert result["organization"] == "test_org"
        assert result["extra_info"] == "새로운 사용자"
        # bird-name-숫자 형식 확인
        assert re.match(r"^[a-z]+-[0-9]{4}$", result["key_value"])
    
    def test_create_user_duplicate_id(self, admin_token, test_user):
        """중복된 사용자 ID로 생성 시도 테스트"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_data = {
            "user_id": test_user.user_id,  # 이미 존재하는 ID
            "organization": "test_org",
            "extra_info": "중복 사용자"
        }
        
        response = client.post("/users", json=user_data, headers=headers)
        
        assert response.status_code == 400
        assert response.json()["detail"] == "이미 존재하는 사용자 ID입니다."


class TestListUsers:
    """사용자 목록 조회 API 테스트"""
    
    def test_list_users_success(self, admin_token, test_user):
        """정상적인 사용자 목록 조회 테스트"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/users", headers=headers)
        
        assert response.status_code == 200
        users = response.json()
        assert len(users) == 1
        assert users[0]["user_id"] == test_user.user_id
    
    def test_list_users_with_organization_filter(self, admin_token, test_user):
        """조직별 필터링 테스트"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/users?organization=test_org", headers=headers)
        
        assert response.status_code == 200
        users = response.json()
        assert len(users) == 1
        assert users[0]["organization"] == "test_org"
    
    def test_list_users_empty_result(self, admin_token):
        """조직 필터로 빈 결과 테스트"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = client.get("/users?organization=nonexistent_org", headers=headers)
        
        assert response.status_code == 200
        assert response.json() == [] 


class TestGetKeys:
    """/key API 단체 사용자 키 조회 테스트"""

    def test_get_keys_success(self, test_user):
        db = TestingSessionLocal()
        try:
            user2 = User(
                user_id="test_user2",
                organization="test_org2",
                key_value="owl-5678",
                extra_info="두번째 사용자"
            )
            db.add(user2)
            db.commit()
        finally:
            db.close()

        headers = {"Authorization": SERVER_API_KEY}
        payload = {"user_ids": [test_user.user_id, "test_user2"]}
        response = client.post("/key/info", json=payload, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert {"user_id": test_user.user_id, "user_key": test_user.key_value} in result
        assert {"user_id": "test_user2", "user_key": "owl-5678"} in result
        assert len(result) == 2

    def test_get_keys_partial_found(self, test_user):
        headers = {"Authorization": SERVER_API_KEY}
        payload = {"user_ids": [test_user.user_id, "not_exist_user"]}
        response = client.post("/key/info", json=payload, headers=headers)
        assert response.status_code == 200
        result = response.json()
        assert {"user_id": test_user.user_id, "user_key": test_user.key_value} in result
        assert len(result) == 1

    def test_get_keys_empty(self):
        headers = {"Authorization": SERVER_API_KEY}
        payload = {"user_ids": []}
        response = client.post("/key/info", json=payload, headers=headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_keys_unauthorized(self, test_user):
        payload = {"user_ids": [test_user.user_id]}
        response = client.post("/key/info", json=payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid or missing API key." 