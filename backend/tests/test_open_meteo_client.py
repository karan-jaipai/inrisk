from datetime import date

import httpx
import pytest
import respx

from app.clients.open_meteo import fetch_historical_weather
from app.core.config import get_settings
from app.core.errors import UpstreamWeatherError

SAMPLE_RESPONSE = {
    "latitude": 51.5,
    "longitude": -0.12,
    "daily": {
        "time": ["2026-07-01", "2026-07-02"],
        "temperature_2m_max": [22.1, 23.4],
        "temperature_2m_min": [14.2, 15.1],
        "apparent_temperature_max": [21.0, 22.5],
        "apparent_temperature_min": [13.0, 14.0],
    },
}


@pytest.fixture
def base_url():
    return get_settings().open_meteo_base_url


@respx.mock
async def test_successful_fetch_returns_raw_json(base_url):
    respx.get(base_url).mock(return_value=httpx.Response(200, json=SAMPLE_RESPONSE))

    result = await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))

    assert result == SAMPLE_RESPONSE


@respx.mock
async def test_request_includes_required_daily_variables(base_url):
    route = respx.get(base_url).mock(return_value=httpx.Response(200, json=SAMPLE_RESPONSE))

    await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))

    sent_params = dict(httpx.QueryParams(route.calls[0].request.url.query))
    daily_params = sent_params["daily"]
    for variable in [
        "temperature_2m_max",
        "temperature_2m_min",
        "apparent_temperature_max",
        "apparent_temperature_min",
    ]:
        assert variable in daily_params


@respx.mock
async def test_upstream_5xx_raises_upstream_error(base_url):
    respx.get(base_url).mock(return_value=httpx.Response(500))

    with pytest.raises(UpstreamWeatherError):
        await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))


@respx.mock
async def test_upstream_4xx_raises_upstream_error(base_url):
    respx.get(base_url).mock(return_value=httpx.Response(400, json={"error": True}))

    with pytest.raises(UpstreamWeatherError):
        await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))


@respx.mock
async def test_timeout_retries_once_then_raises(base_url):
    route = respx.get(base_url).mock(side_effect=httpx.TimeoutException("timed out"))

    with pytest.raises(UpstreamWeatherError):
        await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))

    assert route.call_count == 2


@respx.mock
async def test_timeout_then_success_on_retry_succeeds(base_url):
    route = respx.get(base_url).mock(
        side_effect=[httpx.TimeoutException("timed out"), httpx.Response(200, json=SAMPLE_RESPONSE)]
    )

    result = await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))

    assert result == SAMPLE_RESPONSE
    assert route.call_count == 2


@respx.mock
async def test_malformed_json_raises_upstream_error(base_url):
    headers = {"content-type": "application/json"}
    respx.get(base_url).mock(return_value=httpx.Response(200, content=b"not-json", headers=headers))

    with pytest.raises(UpstreamWeatherError):
        await fetch_historical_weather(51.5074, -0.1278, date(2026, 7, 1), date(2026, 7, 2))
