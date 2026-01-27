import json
import time
from dataclasses import asdict, dataclass

from playwright.sync_api import sync_playwright


@dataclass
class PageMetrics:
    name: str
    url: str
    goto_ms: int
    nav_dom_content_loaded_ms: int | None
    nav_load_event_ms: int | None
    resources: int
    transfer_bytes: int


@dataclass
class TopResource:
    url: str
    initiator_type: str
    transfer_size: int
    encoded_body_size: int
    decoded_body_size: int
    duration_ms: int


def _ms(x: float) -> int:
    return int(round(x * 1000))


def main() -> None:
    base_url = "http://127.0.0.1:4173"
    targets = [
        ("itinerary", f"{base_url}/itinerary"),
        ("transport", f"{base_url}/transport"),
        ("stays", f"{base_url}/stays"),
        ("attractions", f"{base_url}/attractions"),
    ]

    results: list[PageMetrics] = []
    top_resources: dict[str, list[TopResource]] = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Make results stable across runs.
        page.add_init_script("localStorage.setItem('tripPlanner.onboarding.v1', JSON.stringify({seen:true}))")

        for name, url in targets:
            t0 = time.perf_counter()
            page.goto(url, wait_until="networkidle")
            goto_ms = _ms(time.perf_counter() - t0)

            nav = page.evaluate(
                """() => {
                  const nav = performance.getEntriesByType('navigation')[0];
                  if (!nav) return null;
                  return {
                    domContentLoaded: nav.domContentLoadedEventEnd,
                    loadEventEnd: nav.loadEventEnd,
                  };
                }"""
            )

            res = page.evaluate(
                """() => {
                  const resources = performance.getEntriesByType('resource');
                  const transfer = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0);
                  return { count: resources.length, transfer };
                }"""
            )

            top = page.evaluate(
                """() => {
                  const resources = performance.getEntriesByType('resource').map(r => ({
                    url: r.name,
                    initiatorType: r.initiatorType || 'other',
                    transferSize: r.transferSize || 0,
                    encodedBodySize: r.encodedBodySize || 0,
                    decodedBodySize: r.decodedBodySize || 0,
                    duration: r.duration || 0,
                  }));
                  resources.sort((a, b) => (b.transferSize - a.transferSize) || (b.decodedBodySize - a.decodedBodySize));
                  return resources.slice(0, 12);
                }"""
            )

            top_resources[name] = [
                TopResource(
                    url=str(r["url"]),
                    initiator_type=str(r["initiatorType"]),
                    transfer_size=int(r["transferSize"]),
                    encoded_body_size=int(r["encodedBodySize"]),
                    decoded_body_size=int(r["decodedBodySize"]),
                    duration_ms=int(r["duration"]),
                )
                for r in top
            ]

            results.append(
                PageMetrics(
                    name=name,
                    url=url,
                    goto_ms=goto_ms,
                    nav_dom_content_loaded_ms=int(nav["domContentLoaded"]) if nav and nav["domContentLoaded"] else None,
                    nav_load_event_ms=int(nav["loadEventEnd"]) if nav and nav["loadEventEnd"] else None,
                    resources=int(res["count"]),
                    transfer_bytes=int(res["transfer"]),
                )
            )

        browser.close()

    payload = {
        "pages": [asdict(r) for r in results],
        "top_resources": {k: [asdict(r) for r in v] for k, v in top_resources.items()},
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

