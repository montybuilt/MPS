import os

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-key-for-local-dev')

class DevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = 'sqlite:///db.sqlite'

class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASS')}"
        f"@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
    )

config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig
}
