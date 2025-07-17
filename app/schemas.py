from pydantic import BaseModel

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str 

class AdminCreateRequest(BaseModel):
    username: str
    password: str 