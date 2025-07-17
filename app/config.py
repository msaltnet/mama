import os
from dotenv import load_dotenv

load_dotenv()

# DB 설정
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')
DB_NAME = os.getenv('POSTGRES_DB', 'mama_db')
DB_USER = os.getenv('POSTGRES_USER', 'your_username')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'your_password')
DB_URL = f'postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

# JWT 설정
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your_jwt_secret')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_MINUTES = 60 