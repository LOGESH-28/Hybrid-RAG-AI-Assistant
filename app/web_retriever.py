# ===== web_retriever.py (Fixed Wikipedia search) =====
import time
import requests
from bs4 import BeautifulSoup

class WebRetriever:
    def __init__(self):
        self.last_search_time = 0
        self.min_interval = 2

    def search_and_summarize(self, query, num_results=3):
        elapsed = time.time() - self.last_search_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)

        # Try DuckDuckGo first (official library)
        ddg_result = self._try_duckduckgo(query, num_results)
        if ddg_result:
            self.last_search_time = time.time()
            return ddg_result

        # Try DuckDuckGo HTML scraper as secondary
        ddg_html_result = self._try_duckduckgo_html(query, num_results)
        if ddg_html_result:
            self.last_search_time = time.time()
            return ddg_html_result

        # Fallback: Wikipedia
        wiki_result = self._try_wikipedia(query)
        if wiki_result:
            return wiki_result

        return ""

    def _try_duckduckgo(self, query, num_results=3, retries=2):
        for attempt in range(retries):
            try:
                from duckduckgo_search import DDGS
                results = []
                with DDGS() as ddgs:
                    for r in ddgs.text(query, max_results=num_results):
                        try:
                            response = requests.get(r['href'], timeout=5, headers={'User-Agent': 'Mozilla/5.0'})
                            soup = BeautifulSoup(response.text, 'html.parser')
                            for tag in soup(['script', 'style', 'nav', 'footer']):
                                tag.decompose()
                            text = ' '.join(soup.get_text(separator=' ', strip=True).split())
                            summary = text[:600] + "..." if len(text) > 600 else text
                            results.append(f"Source: {r['href']}\n{summary}")
                        except Exception:
                            if r.get('body'):
                                results.append(f"Source: {r['href']}\n{r['body']}")
                if results:
                    return "\n\n---\n\n".join(results)
            except Exception as e:
                if "Ratelimit" in str(e):
                    print(f"[Warning] DuckDuckGo rate limit - waiting {3*(attempt+1)}s...")
                    time.sleep(3 * (attempt + 1))
                else:
                    print(f"[Warning] DuckDuckGo error: {e}")
                    break
        return None

    def _try_duckduckgo_html(self, query, num_results=3):
        try:
            print(f"[Web] Scraping DDG HTML for: {query[:50]}...")
            url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                print(f"[Warning] DDG HTML status: {response.status_code}")
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            snippets_elements = soup.find_all('a', class_='result__snippet')
            urls_elements = soup.find_all('a', class_='result__url')
            
            results = []
            from urllib.parse import urlparse, parse_qs
            for idx, (url_elem, snip_elem) in enumerate(zip(urls_elements, snippets_elements)):
                if idx >= num_results:
                    break
                href = url_elem.get('href', '')
                if href.startswith('//'):
                    href = 'https:' + href
                parsed = urlparse(href)
                qs = parse_qs(parsed.query)
                real_url = qs.get('uddg', [href])[0]
                
                snippet = snip_elem.text.strip()
                try:
                    page_resp = requests.get(real_url, headers=headers, timeout=5)
                    page_soup = BeautifulSoup(page_resp.text, 'html.parser')
                    for tag in page_soup(['script', 'style', 'nav', 'footer']):
                        tag.decompose()
                    text = ' '.join(page_soup.get_text(separator=' ', strip=True).split())
                    summary = text[:800] + "..." if len(text) > 800 else text
                    results.append(f"Source: {real_url}\n{summary}")
                except Exception:
                    results.append(f"Source: {real_url}\n{snippet}")
            
            if results:
                return "\n\n---\n\n".join(results)
        except Exception as e:
            print(f"[Warning] DDG HTML error: {e}")
        return None

    def _try_wikipedia(self, query):
        """Wikipedia search API — works for any topic"""
        try:
            print(f"[Wiki] Wikipedia search: {query[:50]}...")

            # Step 1: Search Wikipedia
            search_url = "https://en.wikipedia.org/w/api.php"
            search_params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": 3,
                "utf8": 1
            }
            search_resp = requests.get(search_url, params=search_params, timeout=8, headers={'User-Agent': 'LokiAI/1.0'})
            search_data = search_resp.json()
            search_results = search_data.get("query", {}).get("search", [])

            if not search_results:
                print("[Warning] No Wikipedia results found")
                return None

            # Step 2: Get summary of top result
            top_title = search_results[0]["title"]
            summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(top_title)}"
            summary_resp = requests.get(summary_url, timeout=8, headers={'User-Agent': 'LokiAI/1.0'})

            if summary_resp.status_code == 200:
                data = summary_resp.json()
                extract = data.get("extract", "")
                if extract and len(extract) > 100:
                    print(f"[Wiki] Wikipedia found: {top_title}")
                    # Also add snippets from other results
                    extra = []
                    for r in search_results[1:]:
                        snippet = BeautifulSoup(r.get("snippet",""), "html.parser").get_text()
                        if snippet:
                            extra.append(f"{r['title']}: {snippet}")
                    full = f"Source: Wikipedia\nTitle: {top_title}\n\n{extract}"
                    if extra:
                        full += "\n\nRelated:\n" + "\n".join(extra)
                    return full

            # Step 3: Use search snippets if summary fails
            print("[Wiki] Using Wikipedia snippets...")
            snippets = []
            for r in search_results:
                snippet = BeautifulSoup(r.get("snippet",""), "html.parser").get_text()
                snippets.append(f"• {r['title']}: {snippet}")
            if snippets:
                return "Source: Wikipedia\n" + "\n".join(snippets)

        except Exception as e:
            print(f"[Warning] Wikipedia error: {e}")
        return None