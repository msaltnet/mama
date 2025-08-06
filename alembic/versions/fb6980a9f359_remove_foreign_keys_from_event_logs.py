"""remove_foreign_keys_from_event_logs

Revision ID: fb6980a9f359
Revises: 2afc55eb9ecb
Create Date: 2025-08-06 16:35:51.111030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb6980a9f359'
down_revision: Union[str, Sequence[str], None] = '2afc55eb9ecb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # EventLog 테이블에서 외래키 제약 조건 제거
    op.drop_constraint('event_logs_admin_id_fkey', 'event_logs', type_='foreignkey')
    op.drop_constraint('event_logs_user_id_fkey', 'event_logs', type_='foreignkey')
    
    # admin_id와 user_id 컬럼을 문자열로 변경
    op.alter_column('event_logs', 'admin_id',
                    existing_type=sa.Integer(),
                    type_=sa.String(length=50),
                    existing_nullable=True)
    
    op.alter_column('event_logs', 'user_id',
                    existing_type=sa.Integer(),
                    type_=sa.String(length=50),
                    existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # admin_id와 user_id 컬럼을 정수로 되돌리기
    op.alter_column('event_logs', 'admin_id',
                    existing_type=sa.String(length=50),
                    type_=sa.Integer(),
                    existing_nullable=True)
    
    op.alter_column('event_logs', 'user_id',
                    existing_type=sa.String(length=50),
                    type_=sa.Integer(),
                    existing_nullable=True)
    
    # 외래키 제약 조건 다시 추가
    op.create_foreign_key('event_logs_admin_id_fkey', 'event_logs', 'admins', ['admin_id'], ['id'])
    op.create_foreign_key('event_logs_user_id_fkey', 'event_logs', 'users', ['user_id'], ['id'])
