"""import models

Revision ID: d6e8c01b3e78
Revises: 0f9b689ee6c4
Create Date: 2025-07-22 19:27:41.363599

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6e8c01b3e78'
down_revision: Union[str, Sequence[str], None] = '0f9b689ee6c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
