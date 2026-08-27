import os

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")

import boto3  # noqa: E402
import httpx  # noqa: E402
import pytest  # noqa: E402
import respx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from moto import mock_aws  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402

SAMPLE_OPEN_METEO_RESPONSE = {
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

VALID_PAYLOAD = {
    "latitude": 51.5074,
    "longitude": -0.1278,
    "start_date": "2026-07-01",
    "end_date": "2026-07-02",
}


@pytest.fixture
def bucket():
    settings = get_settings()
    with mock_aws():
        client = boto3.client("s3", region_name=settings.aws_region)
        client.create_bucket(Bucket=settings.s3_bucket_name)
        yield settings.s3_bucket_name


@pytest.fixture
def api_client():
    return TestClient(app)


@respx.mock
def test_store_weather_data_success(api_client, bucket):
    respx.get(get_settings().open_meteo_base_url).mock(
        return_value=httpx.Response(200, json=SAMPLE_OPEN_METEO_RESPONSE)
    )

    response = api_client.post("/store-weather-data", json=VALID_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["file"].startswith("weather_51.5074_-0.1278_2026-07-01_2026-07-02_")


@respx.mock
def test_stored_file_appears_in_list_and_is_retrievable(api_client, bucket):
    respx.get(get_settings().open_meteo_base_url).mock(
        return_value=httpx.Response(200, json=SAMPLE_OPEN_METEO_RESPONSE)
    )

    store_response = api_client.post("/store-weather-data", json=VALID_PAYLOAD)
    filename = store_response.json()["file"]

    list_response = api_client.get("/list-weather-files")
    assert list_response.status_code == 200
    names = [f["name"] for f in list_response.json()["files"]]
    assert filename in names

    content_response = api_client.get(f"/weather-file-content/{filename}")
    assert content_response.status_code == 200
    assert content_response.json() == SAMPLE_OPEN_METEO_RESPONSE


@respx.mock
def test_open_meteo_failure_returns_502(api_client, bucket):
    respx.get(get_settings().open_meteo_base_url).mock(return_value=httpx.Response(500))

    response = api_client.post("/store-weather-data", json=VALID_PAYLOAD)

    assert response.status_code == 502
    assert response.json() == {"status": "error", "message": "Unable to fetch weather data"}


@respx.mock
def test_storage_failure_returns_500(api_client):
    # No bucket created -> S3 put_object fails with NoSuchBucket.
    with mock_aws():
        respx.get(get_settings().open_meteo_base_url).mock(
            return_value=httpx.Response(200, json=SAMPLE_OPEN_METEO_RESPONSE)
        )

        response = api_client.post("/store-weather-data", json=VALID_PAYLOAD)

        assert response.status_code == 500
        assert response.json() == {"status": "error", "message": "Unable to store weather data"}


def test_list_files_empty_bucket(api_client, bucket):
    response = api_client.get("/list-weather-files")

    assert response.status_code == 200
    assert response.json() == {"files": []}


def test_get_missing_file_returns_404(api_client, bucket):
    filename = "weather_1_1_2026-01-01_2026-01-01_20260817T000000Z.json"

    response = api_client.get(f"/weather-file-content/{filename}")

    assert response.status_code == 404
    assert response.json() == {"status": "error", "message": "not found"}


def test_get_malformed_filename_returns_404_without_touching_s3(api_client, bucket):
    response = api_client.get("/weather-file-content/../../etc/passwd")

    assert response.status_code == 404


def test_invalid_latitude_returns_422(api_client):
    payload = {**VALID_PAYLOAD, "latitude": 200}

    response = api_client.post("/store-weather-data", json=payload)

    assert response.status_code == 422


def test_missing_field_returns_422(api_client):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "longitude"}

    response = api_client.post("/store-weather-data", json=payload)

    assert response.status_code == 422


def test_date_range_over_31_days_returns_422(api_client):
    payload = {**VALID_PAYLOAD, "start_date": "2026-01-01", "end_date": "2026-03-01"}

    response = api_client.post("/store-weather-data", json=payload)

    assert response.status_code == 422
