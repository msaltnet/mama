from pydantic import BaseModel


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class AdminCreateRequest(BaseModel):
    username: str
    password: str


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


class KeyRequest(BaseModel):
    user_ids: list[str]


class KeyResponse(BaseModel):
    user_id: str
    user_key: str
