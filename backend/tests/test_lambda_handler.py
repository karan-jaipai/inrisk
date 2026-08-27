import json
import os

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")

import boto3  # noqa: E402
import httpx  # noqa: E402
import respx  # noqa: E402
from moto import mock_aws  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.lambda_handler import handler  # noqa: E402


class DummyLambdaContext:
    function_name = "weather-explorer"
    memory_limit_in_mb = 128
    invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:weather-explorer"
    aws_request_id = "test-request-id"


def function_url_event(method: str, path: str, body: str | None = None) -> dict:
    """Build a synthetic AWS Lambda Function URL (payload format 2.0) event."""
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {"content-type": "application/json"} if body else {},
        "requestContext": {
            "http": {
                "method": method,
                "path": path,
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": "pytest",
            },
            "requestId": "test-request-id",
            "routeKey": "$default",
            "stage": "$default",
            "time": "19/Aug/2026:00:00:00 +0000",
            "timeEpoch": 0,
        },
        "body": body,
        "isBase64Encoded": False,
    }


def test_health_check_via_lambda_event():
    event = function_url_event("GET", "/health")

    response = handler(event, DummyLambdaContext())

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["status"] == "ok"


@respx.mock
def test_store_weather_data_via_lambda_event():
    settings = get_settings()
    respx.get(settings.open_meteo_base_url).mock(
        return_value=httpx.Response(200, json={"daily": {"time": ["2026-07-01"]}})
    )

    with mock_aws():
        boto3.client("s3", region_name=settings.aws_region).create_bucket(
            Bucket=settings.s3_bucket_name
        )

        payload = {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "start_date": "2026-07-01",
            "end_date": "2026-07-01",
        }
        event = function_url_event("POST", "/store-weather-data", body=json.dumps(payload))

        response = handler(event, DummyLambdaContext())

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["status"] == "ok"
    assert body["file"].startswith("weather_51.5074_-0.1278_2026-07-01_2026-07-01_")


def test_unknown_route_returns_404_through_lambda():
    event = function_url_event("GET", "/does-not-exist")

    response = handler(event, DummyLambdaContext())

    assert response["statusCode"] == 404


def test_invalid_payload_returns_422_through_lambda():
    event = function_url_event("POST", "/store-weather-data", body=json.dumps({"latitude": 999}))

    response = handler(event, DummyLambdaContext())

    assert response["statusCode"] == 422
