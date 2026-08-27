from app.clients.open_meteo import fetch_historical_weather
from app.core.errors import FileNotFoundAppError
from app.models.weather import FileMetadata, ListFilesResponse, StoreWeatherResponse, WeatherRequest
from app.storage.s3 import (
    build_object_key,
    get_object_json,
    is_valid_object_key,
    list_objects,
    upload_json,
)


async def store_weather_data(request: WeatherRequest) -> StoreWeatherResponse:
    """Fetch weather from Open-Meteo and store the raw response in S3."""
    raw_response = await fetch_historical_weather(
        request.latitude, request.longitude, request.start_date, request.end_date
    )

    key = build_object_key(
        request.latitude,
        request.longitude,
        request.start_date.isoformat(),
        request.end_date.isoformat(),
    )
    upload_json(key, raw_response)

    return StoreWeatherResponse(status="ok", file=key)


def list_weather_files() -> ListFilesResponse:
    """Return metadata for all stored weather files, newest first."""
    files = list_objects()
    return ListFilesResponse(files=[FileMetadata(**f) for f in files])


def get_weather_file(filename: str) -> dict:
    """Return the raw stored JSON for a given file, rejecting non-matching names early."""
    if not is_valid_object_key(filename):
        raise FileNotFoundAppError("not found")
    return get_object_json(filename)
