from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
import requests
from settings import settings
import logging
#from slugify import slugify

@dataclass
class Article:
    id: int
    name: str
    published: datetime
    updated: Optional[datetime]
    deleted: bool
    removed: bool
    hidden: bool
    local: bool
    slug: str = ""    
    url: str = ""
    
    def __post_init__(self):
        self.slug = Article.name_to_slug(self.name)
        self.url = f"{settings.LEMMY_URL_PREFIX}/post/{self.id}-{self.slug}"
        
    @staticmethod
    def name_to_slug(name: str) -> str:
        import re
        cyrillic_to_latin = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
            'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
            'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
            'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
            'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
            'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
            'э': 'e', 'ю': 'yu', 'я': 'ya'
        }
        lowered = name.lower()
        def transliterate(match: re.Match) -> str:
            char = match.group(0)
            return cyrillic_to_latin.get(char, char)
        transliterated = re.sub(r'[а-яё]', transliterate, lowered)
        transliterated = re.sub(r'[^a-z0-9\s-]', '', transliterated)
        transliterated = re.sub(r'\s+', '-', transliterated)
        transliterated = re.sub(r'-+', '-', transliterated)
        transliterated = transliterated.strip('-')
        return transliterated[:100]

@dataclass
class Community:
    id: int
    name: str
    local: bool
    deleted: bool
    removed: bool
    hidden: bool
    slug: str = ""
    url: str = ""
    
    def __post_init__(self):
        self.slug = self.name
        self.url = f"{settings.LEMMY_URL_PREFIX}/c/{self.name}"

class LemmyClient:
    def __init__(self):
        self.api_url = settings.LEMMY_API_URL.rstrip('/')
        self.limit = 50

    def fetch_all_articles(self) -> List[Article]:
        articles = []
        page_cursor = None
        while True:
            params = {
                "limit": self.limit,
                "sort": "Old",
                "type_": "All"
            }
            if page_cursor:
                params["page_cursor"] = page_cursor
            url = f"{self.api_url}/api/v3/post/list"
            logging.debug(f"Requesting URL: {url} with params: {params}")
            resp = requests.get(url, params=params)
            logging.debug(f"Response status: {resp.status_code}. Response text: {resp.text}")
            if resp.status_code != 200:
                logging.error(f"Failed to fetch articles: {resp.status_code}")
                break
            data = resp.json()
            posts = data.get("posts", [])
            for post_view in posts:
                post = post_view.get("post", {})
                try:
                    published = datetime.fromisoformat(post.get("published"))
                except Exception:
                    published = None
                updated_str = post.get("updated")
                try:
                    updated = datetime.fromisoformat(updated_str) if updated_str else None
                except Exception:
                    updated = None
                article = Article(
                    id=post.get("id"),
                    name=post.get("name"),
                    published=published,
                    updated=updated,
                    deleted=post.get("deleted"),
                    removed=post.get("removed"),
                    local=post.get("local"),
                    hidden=post_view.get("hidden")
                )
                articles.append(article)
            page_cursor = data.get("next_page")
            if not page_cursor:
                break
        return articles

    def fetch_all_communities(self) -> List[Community]:
        url = f"{self.api_url}/api/v3/community/list"
        params = {
            "limit": 50,
            "sort": "TopAll",
            "type_": "Local"
        }
        logging.debug(f"Requesting URL: {url} with params: {params}")
        resp = requests.get(url, params=params)
        logging.debug(f"Response status: {resp.status_code}. Response text: {resp.text}")
        communities = []
        if resp.status_code != 200:
            logging.error(f"Failed to fetch communities: {resp.status_code}")
            return communities
        data = resp.json()
        comm_views = data.get("communities", [])
        for cv in comm_views:
            comm_data = cv.get("community", cv)
            if not comm_data.get("local") or comm_data.get("deleted") or comm_data.get("removed") or cv.get("hidden"):
                continue
            community = Community(
                id=comm_data.get("id"),
                name=comm_data.get("name"),
                local=comm_data.get("local"),
                deleted=comm_data.get("deleted"),
                removed=comm_data.get("removed"),
                hidden=cv.get("hidden", False)
            )
            communities.append(community)
        return communities
