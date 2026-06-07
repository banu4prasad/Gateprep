"""Add foreign key indexes

Revision ID: 54e3661375a4
Revises: 
Create Date: 2026-06-07 23:49:28.611574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '54e3661375a4'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(op.f('ix_checklist_subjects_created_by'), 'checklist_subjects', ['created_by'], unique=False)
    op.create_index(op.f('ix_checklist_topics_subject_id'), 'checklist_topics', ['subject_id'], unique=False)
    op.create_index(op.f('ix_questions_test_id'), 'questions', ['test_id'], unique=False)
    op.create_index(op.f('ix_test_attempts_test_id'), 'test_attempts', ['test_id'], unique=False)
    op.create_index('ix_test_attempts_test_id_status_user_id', 'test_attempts', ['test_id', 'status', 'user_id'], unique=False)
    op.create_index(op.f('ix_test_attempts_user_id'), 'test_attempts', ['user_id'], unique=False)
    op.create_index(op.f('ix_test_series_created_by'), 'test_series', ['created_by'], unique=False)
    op.create_index(op.f('ix_tests_created_by'), 'tests', ['created_by'], unique=False)
    op.create_index(op.f('ix_tests_series_id'), 'tests', ['series_id'], unique=False)
    op.create_index(op.f('ix_user_answers_attempt_id'), 'user_answers', ['attempt_id'], unique=False)
    op.create_index(op.f('ix_user_answers_question_id'), 'user_answers', ['question_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_answers_question_id'), table_name='user_answers')
    op.drop_index(op.f('ix_user_answers_attempt_id'), table_name='user_answers')
    op.drop_index(op.f('ix_tests_series_id'), table_name='tests')
    op.drop_index(op.f('ix_tests_created_by'), table_name='tests')
    op.drop_index(op.f('ix_test_series_created_by'), table_name='test_series')
    op.drop_index(op.f('ix_test_attempts_user_id'), table_name='test_attempts')
    op.drop_index('ix_test_attempts_test_id_status_user_id', table_name='test_attempts')
    op.drop_index(op.f('ix_test_attempts_test_id'), table_name='test_attempts')
    op.drop_index(op.f('ix_questions_test_id'), table_name='questions')
    op.drop_index(op.f('ix_checklist_topics_subject_id'), table_name='checklist_topics')
    op.drop_index(op.f('ix_checklist_subjects_created_by'), table_name='checklist_subjects')
