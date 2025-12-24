from settings import settings

import logging
logging.basicConfig(level=logging.INFO)

logging.info(f"{settings.LEMMY_API_URL}")
logging.info(f"{settings.LEMMY_USERNAME}")

from lemmy_client import LemmyClient
from sitemap_generator import generate_sitemaps

def run():
    client = LemmyClient()
    articles = client.fetch_all_articles()
    logging.info(f"Fetched {len(articles)} articles")
    for art in articles:
        logging.info(art)
    communities = client.fetch_all_communities()
    logging.info(f"Fetched {len(communities)} communities")
    logging.info("Generating sitemap for posts and communities")
    for com in communities:
        logging.info(com)
    generate_sitemaps()

if __name__ == "__main__":
    run()

