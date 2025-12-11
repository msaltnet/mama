from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class AdminCreateRequest(BaseModel):
    username: str
    password: str


class AdminPasswordSetRequest(BaseModel):
    username: str
    new_password: str


class UserRead(BaseModel):
    id: int
    user_id: str
    organization: str | None = None
    key_value: str
    extra_info: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    allowed_models: list[str] = []
    allowed_services: list[str] = []

    class Config:
        orm_mode = True


class UserListRequest(BaseModel):
    organization: str | None = None


class UserCreateRequest(BaseModel):
    user_id: str
    organization: str | None = None
    extra_info: str | None = None
    allowed_models: list[str] = []


class UserUpdateRequest(BaseModel):
    organization: str | None = None
    extra_info: str | None = None
    allowed_models: list[str] = []


class UsersCreateListRequest(BaseModel):
    users: list[UserCreateRequest]


class UsersBatchUpdateRequest(BaseModel):
    user_ids: list[str]
    allowed_models: list[str] = []
    organization: Optional[str] = None
    extra_info: Optional[str] = None


class UsersDeleteRequest(BaseModel):
    user_ids: list[str]


class KeyRequest(BaseModel):
    user_ids: list[str]


class KeyResponse(BaseModel):
    user_id: str
    user_key: str


class EventLogRead(BaseModel):
    id: int
    admin_id: Optional[str] = None
    user_id: Optional[str] = None
    event_type: str
    event_detail: Optional[str] = None
    result: str
    created_at: datetime

    class Config:
        orm_mode = True


class EventLogFilter(BaseModel):
    admin_id: Optional[str] = None
    user_id: Optional[str] = None
    event_type: Optional[str] = None
    result: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
