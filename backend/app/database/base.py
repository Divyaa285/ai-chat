from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import all models here so Alembic can detect them
from app.models.user import User          
from app.models.chat import ChatSession  
from app.models.message import Message   
from app.models.log import Log            