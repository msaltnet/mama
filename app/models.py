import bcrypt
from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Text)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    is_super_admin = Column(Boolean, default=False)
    # pylint: disable=not-callable
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # pylint: disable=not-callable
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def verify_password(self, plain_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), self.password.encode("utf-8"))

    def set_password(self, new_password: str):
        hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
        self.password = hashed_pw.decode("utf-8")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    user_id = Column(String(50), unique=True, nullable=False)  # 관리 대상 사용자 ID
    organization = Column(String(100))
    key_value = Column(String(255), nullable=False)
    extra_info = Column(Text)
    # pylint: disable=not-callable
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # pylint: disable=not-callable
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    allowed_models = relationship("AllowedModel", back_populates="user")
    allowed_services = relationship("AllowedService", back_populates="user")
    event_logs = relationship("EventLog", back_populates="user")


class AllowedModel(Base):
    __tablename__ = "allowed_models"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model_name = Column(String(100), nullable=False)

    user = relationship("User", back_populates="allowed_models")


class AllowedService(Base):
    __tablename__ = "allowed_services"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_name = Column(String(100), nullable=False)

    user = relationship("User", back_populates="allowed_services")


class EventLog(Base):
    __tablename__ = "event_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    admin_id = Column(Integer, ForeignKey("admins.id"))  # 어떤 관리자가 이벤트를 발생시켰는지
    event_type = Column(String(50), nullable=False)
    event_detail = Column(Text)
    result = Column(String(50))
    # pylint: disable=not-callable
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="event_logs")
    admin = relationship("Admin")
