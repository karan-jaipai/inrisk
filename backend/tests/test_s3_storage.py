import os

import boto3
import pytest
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")

from app.core.config import get_settings  # noqa: E402
from app.core.errors import FileNotFoundAppError, StorageReadError  # noqa: E402
from app.storage import s3 as s3_storage  # noqa: E402


@pytest.fixture
def bucket():
    settings = get_settings()
    with mock_aws():
        client = boto3.client("s3", region_name=settings.aws_region)
        client.create_bucket(Bucket=settings.s3_bucket_name)
        yield settings.s3_bucket_name


class TestObjectKeyValidation:
    def test_valid_key_accepted(self):
        key = "weather_51.5074_-0.1278_2026-07-01_2026-07-20_20260817T123456Z.json"
        assert s3_storage.is_valid_object_key(key) is True

    def test_path_traversal_rejected(self):
        assert s3_storage.is_valid_object_key("../../etc/passwd") is False

    def test_wrong_extension_rejected(self):
        assert s3_storage.is_valid_object_key("weather_1_1_2026-01-01_2026-01-01_x.txt") is False

    def test_arbitrary_string_rejected(self):
        assert s3_storage.is_valid_object_key("not-a-weather-file.json") is False


class TestBuildObjectKey:
    def test_key_matches_expected_pattern(self):
        key = s3_storage.build_object_key(51.5074, -0.1278, "2026-07-01", "2026-07-20")
        assert s3_storage.is_valid_object_key(key)
        assert key.startswith("weather_51.5074_-0.1278_2026-07-01_2026-07-20_")


class TestUploadAndGet:
    def test_upload_then_get_round_trips_raw_json(self, bucket):
        payload = {"latitude": 51.5, "daily": {"time": ["2026-07-01"]}}
        key = "weather_51.5_-0.1_2026-07-01_2026-07-01_20260817T000000Z.json"

        s3_storage.upload_json(key, payload)
        result = s3_storage.get_object_json(key)

        assert result == payload

    def test_get_missing_object_raises_not_found(self, bucket):
        with pytest.raises(FileNotFoundAppError):
            s3_storage.get_object_json("weather_1_1_2026-01-01_2026-01-01_20260817T000000Z.json")

    def test_get_corrupted_object_raises_storage_read_error(self, bucket):
        settings = get_settings()
        client = boto3.client("s3", region_name=settings.aws_region)
        key = "weather_1_1_2026-01-01_2026-01-01_20260817T000000Z.json"
        client.put_object(Bucket=bucket, Key=key, Body=b"not-valid-json")

        with pytest.raises(StorageReadError):
            s3_storage.get_object_json(key)


class TestListObjects:
    def test_empty_bucket_returns_empty_list(self, bucket):
        assert s3_storage.list_objects() == []

    def test_list_returns_metadata_sorted_newest_first(self, bucket):
        import time

        older = "weather_1_1_2026-01-01_2026-01-01_20260101T000000Z.json"
        newer = "weather_1_1_2026-01-02_2026-01-02_20260102T000000Z.json"
        s3_storage.upload_json(older, {"a": 1})
        time.sleep(1.1)  # S3 LastModified has second-level granularity
        s3_storage.upload_json(newer, {"b": 2})

        files = s3_storage.list_objects()

        assert [f["name"] for f in files] == [newer, older]
        assert all("size" in f and "created_at" in f for f in files)
