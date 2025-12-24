from pydantic_settings import BaseSettings

class LemmySettings(BaseSettings):
    LEMMY_API_URL: str = 'https://rabotaem.app'
    LEMMY_USERNAME: str = 'admin'
    LEMMY_PASSWORD: str = 'strong_admin_password'
    LEMMY_URL_PREFIX: str = 'https://rabotaem.app'
    SITEMAP_LOCATION: str = './output'

settings = LemmySettings()
