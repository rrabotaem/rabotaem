from apscheduler.schedulers.blocking import BlockingScheduler
from sitemap_generator import generate_sitemaps
import logging

logging.basicConfig(level=logging.INFO)

scheduler = BlockingScheduler()

@scheduler.scheduled_job('cron', minute=10) # hour=3, 
def scheduled_sitemap():
    logging.info("Scheduled sitemap generation started")
    generate_sitemaps()

if __name__ == "__main__":
    logging.info("Starting scheduler")
    scheduler.start()
