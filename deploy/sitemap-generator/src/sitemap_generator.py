import os
from datetime import datetime, date
from xml.etree.ElementTree import Element, SubElement, ElementTree, indent
from lemmy_client import LemmyClient
from settings import settings

def generate_sitemaps() -> None:
    client = LemmyClient()
    articles = client.fetch_all_articles()

    # Фильтрация статей
    filtered = [
        art for art in articles
        if art.local and not art.deleted and not art.removed and not art.hidden
    ]
    
    # Группировка статей по YEAR-MONTH (используем published)
    groups: dict[str, list] = {}
    for art in filtered:
        # Если published отсутствует, пропускаем статью.
        if not art.published:
            continue
        group_key = art.published.strftime("%Y-%m")
        groups.setdefault(group_key, []).append(art)

    # Обеспечиваем наличие директории для sitemap
    sitemap_dir = os.path.join(settings.SITEMAP_LOCATION, "sitemap")
    os.makedirs(sitemap_dir, exist_ok=True)

    sitemap_index_entries: list[tuple[str, str, date]] = []
    
    # Генерация sitemap для каждой группы
    for group, arts in groups.items():
        urlset = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
        max_date: date | None = None
        for art in arts:
            url = SubElement(urlset, "url")
            loc = SubElement(url, "loc")
            loc.text = art.url
            # Используем updated если есть, иначе published
            article_date = art.updated if art.updated else art.published
            if article_date:
                formatted_date = article_date.strftime("%Y-%m-%d")
                lastmod = SubElement(url, "lastmod")
                lastmod.text = formatted_date
                dt = article_date.date() if isinstance(article_date, datetime) else article_date
                if max_date is None or dt > max_date:
                    max_date = dt
            changefreq = SubElement(url, "changefreq")
            changefreq.text = "weekly"
        sitemap_filename = f"{group}.xml"
        sitemap_path = os.path.join(sitemap_dir, sitemap_filename)
        indent(urlset, space="  ")
        tree = ElementTree(urlset)
        tree.write(sitemap_path, encoding="utf-8", xml_declaration=True)
        sitemap_url = f"{settings.LEMMY_URL_PREFIX}/sitemap/{sitemap_filename}"
        if max_date:
            sitemap_index_entries.append((group, sitemap_url, max_date))

    # Генерация sitemap для коммьюнити
    communities = client.fetch_all_communities()
    comm_urlset = Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for comm in communities:
        url = SubElement(comm_urlset, "url")
        loc = SubElement(url, "loc")
        loc.text = comm.url
        lastmod = SubElement(url, "lastmod")
        lastmod.text = date.today().strftime("%Y-%m-%d")
        changefreq = SubElement(url, "changefreq")
        changefreq.text = "weekly"
    comm_sitemap_filename = "communities.xml"
    comm_sitemap_path = os.path.join(sitemap_dir, comm_sitemap_filename)
    indent(comm_urlset, space="  ")
    tree = ElementTree(comm_urlset)
    tree.write(comm_sitemap_path, encoding="utf-8", xml_declaration=True)
    comm_sitemap_url = f"{settings.LEMMY_URL_PREFIX}/sitemap/{comm_sitemap_filename}"
    sitemap_index_entries.append(("communities", comm_sitemap_url, date.today()))
    
    # Генерация sitemapindex
    sitemapindex = Element("sitemapindex", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    # Добавляем static sitemap первым
    static_sitemap = SubElement(sitemapindex, "sitemap")
    static_loc = SubElement(static_sitemap, "loc")
    static_loc.text = f"{settings.LEMMY_URL_PREFIX}/sitemap/static.xml"
    static_lastmod = SubElement(static_sitemap, "lastmod")
    static_lastmod.text = date.today().strftime("%Y-%m-%d")
    # Добавляем остальные sitemap
    for group, loc_text, lastmod_date in sitemap_index_entries:
        sitemap_elem = SubElement(sitemapindex, "sitemap")
        loc = SubElement(sitemap_elem, "loc")
        loc.text = loc_text
        lastmod = SubElement(sitemap_elem, "lastmod")
        lastmod.text = lastmod_date.strftime("%Y-%m-%d")
    index_path = os.path.join(settings.SITEMAP_LOCATION, "sitemap.xml")
    indent(sitemapindex, space="  ")
    tree = ElementTree(sitemapindex)
    tree.write(index_path, encoding="utf-8", xml_declaration=True)

if __name__ == "__main__":
    generate_sitemaps()
