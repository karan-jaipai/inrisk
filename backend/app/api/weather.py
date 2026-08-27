from fastapi import APIRouter

from app.models.weather import ListFilesResponse, StoreWeatherResponse, WeatherRequest
from app.services import weather_storage

router = APIRouter()


@router.post(
    "/store-weather-data",
    response_model=StoreWeatherResponse,
    summary="Fetch historical weather and store the raw response in S3",
    description=(
        "Validates the input, calls Open-Meteo for daily historical weather, "
        "and stores the complete raw JSON response in S3 under a generated file name."
    ),
)
async def store_weather_data(payload: WeatherRequest) -> StoreWeatherResponse:
    return await weather_storage.store_weather_data(payload)


@router.get(
    "/list-weather-files",
    response_model=ListFilesResponse,
    summary="List previously stored weather files",
    description=(
        "Returns file name, size, and creation time for every stored weather file, newest first."
    ),
)
async def list_weather_files() -> ListFilesResponse:
    return weather_storage.list_weather_files()


@router.get(
    "/weather-file-content/{file}",
    summary="Retrieve the raw content of a stored weather file",
    description="Returns the raw Open-Meteo JSON previously stored under the given file name.",
)
async def weather_file_content(file: str) -> dict:
    return weather_storage.get_weather_file(file)
