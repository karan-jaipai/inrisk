from datetime import date

from pydantic import BaseModel, Field, model_validator

MAX_RANGE_DAYS = 31


class WeatherRequest(BaseModel):
    """Input for POST /store-weather-data."""

    latitude: float = Field(
        ..., ge=-90, le=90, description="Latitude in decimal degrees, -90 to 90."
    )
    longitude: float = Field(
        ..., ge=-180, le=180, description="Longitude in decimal degrees, -180 to 180."
    )
    start_date: date = Field(..., description="Start of the historical range, YYYY-MM-DD.")
    end_date: date = Field(..., description="End of the historical range, YYYY-MM-DD.")

    @model_validator(mode="after")
    def validate_date_range(self) -> "WeatherRequest":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be less than or equal to end_date")

        # Inclusive day count: a request for the same start/end date is 1 day.
        range_days = (self.end_date - self.start_date).days + 1
        if range_days > MAX_RANGE_DAYS:
            raise ValueError(f"Date range cannot exceed {MAX_RANGE_DAYS} days")

        return self


class StoreWeatherResponse(BaseModel):
    status: str = "ok"
    file: str


class FileMetadata(BaseModel):
    name: str
    size: int
    created_at: str


class ListFilesResponse(BaseModel):
    files: list[FileMetadata]


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
