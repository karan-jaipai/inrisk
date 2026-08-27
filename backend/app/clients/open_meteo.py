import logging
from datetime import date

import httpx

from app.core.config import get_settings
from app.core.errors import UpstreamWeatherError

logger = logging.getLogger("weather_explorer")

DAILY_VARIABLES = [
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
]

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


async def fetch_historical_weather(
    latitude: float, longitude: float, start_date: date, end_date: date
) -> dict:
    """Call Open-Meteo's historical/archive API and return the raw parsed JSON response.

    Raises UpstreamWeatherError if the request times out, the upstream API returns a
    non-success status, or the response body is not valid JSON.
    """
    settings = get_settings()
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "daily": ",".join(DAILY_VARIABLES),
        "timezone": "UTC",
    }

    response = await _get_with_one_retry(settings.open_meteo_base_url, params)

    if response.status_code >= 400:
        logger.warning("Open-Meteo returned status %s", response.status_code)
        raise UpstreamWeatherError("Unable to fetch weather data")

    try:
        return response.json()
    except ValueError as exc:
        logger.warning("Open-Meteo returned a non-JSON response")
        raise UpstreamWeatherError("Unable to fetch weather data") from exc


async def _get_with_one_retry(url: str, params: dict) -> httpx.Response:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for attempt in (1, 2):
            try:
                return await client.get(url, params=params)
            except httpx.TimeoutException:
                logger.warning("Open-Meteo request timed out (attempt %s/2)", attempt)
                if attempt == 2:
                    raise UpstreamWeatherError("Unable to fetch weather data") from None
            except httpx.RequestError as exc:
                logger.warning("Open-Meteo request failed: %s", exc)
                raise UpstreamWeatherError("Unable to fetch weather data") from exc

    # Unreachable, but keeps type checkers happy.
    raise UpstreamWeatherError("Unable to fetch weather data")
