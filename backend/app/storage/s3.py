import json
import logging
import re
from datetime import UTC, datetime
from typing import Any

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.core.errors import FileNotFoundAppError, StorageReadError, StorageWriteError

logger = logging.getLogger("weather_explorer")

# Matches: weather_<lat>_<lon>_<start_date>_<end_date>_<UTC timestamp>.json
OBJECT_KEY_PATTERN = re.compile(
    r"^weather_-?\d+(\.\d+)?_-?\d+(\.\d+)?_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}_\d{8}T\d{6}Z\.json$"
)


def is_valid_object_key(key: str) -> bool:
    """Only accept keys matching our own generated weather-file naming scheme."""
    return bool(OBJECT_KEY_PATTERN.match(key))


def _client():
    settings = get_settings()
    return boto3.client("s3", region_name=settings.aws_region)


def build_object_key(latitude: float, longitude: float, start_date: str, end_date: str) -> str:
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    return f"weather_{latitude}_{longitude}_{start_date}_{end_date}_{timestamp}.json"


def upload_json(key: str, data: dict[str, Any]) -> None:
    """Upload the raw payload to S3 as-is, without transforming it."""
    settings = get_settings()
    body = json.dumps(data).encode("utf-8")
    try:
        _client().put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=body,
            ContentType="application/json",
        )
    except ClientError as exc:
        logger.error("S3 put_object failed for key %s: %s", key, exc)
        raise StorageWriteError("Unable to store weather data") from exc


def list_objects() -> list[dict[str, Any]]:
    """List stored weather files, newest first, using a single S3 API call."""
    settings = get_settings()
    try:
        response = _client().list_objects_v2(Bucket=settings.s3_bucket_name)
    except ClientError as exc:
        logger.error("S3 list_objects_v2 failed: %s", exc)
        raise StorageReadError("Unable to read weather data") from exc

    contents = response.get("Contents", [])
    files = [
        {
            "name": obj["Key"],
            "size": obj["Size"],
            "created_at": obj["LastModified"].astimezone(UTC).isoformat(),
        }
        for obj in contents
    ]
    files.sort(key=lambda f: f["created_at"], reverse=True)
    return files


def get_object_json(key: str) -> dict[str, Any]:
    """Fetch and parse a stored weather file. Raises FileNotFoundAppError if missing."""
    settings = get_settings()
    try:
        response = _client().get_object(Bucket=settings.s3_bucket_name, Key=key)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "")
        if error_code in ("NoSuchKey", "404"):
            raise FileNotFoundAppError("not found") from exc
        logger.error("S3 get_object failed for key %s: %s", key, exc)
        raise StorageReadError("Unable to read weather data") from exc

    raw_body = response["Body"].read()
    try:
        return json.loads(raw_body)
    except json.JSONDecodeError as exc:
        logger.error("Stored object %s contains invalid JSON", key)
        raise StorageReadError("Unable to read weather data") from exc
