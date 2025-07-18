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

    class Config:
        orm_mode = True


class UserListRequest(BaseModel):
    organization: str | None = None
