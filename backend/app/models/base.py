import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.mysql import CHAR


def gen_uuid() -> str:
    return str(uuid.uuid4())


class UUIDPKMixin:
    id = Column(CHAR(36), primary_key=True, default=gen_uuid)


class TimestampMixin:
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)
