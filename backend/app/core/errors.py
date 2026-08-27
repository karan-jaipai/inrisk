class AppError(Exception):
    """Base class for application errors that map to a specific HTTP status."""

    status_code: int = 500
    message: str = "Internal server error"

    def __init__(self, message: str | None = None) -> None:
        if message:
            self.message = message
        super().__init__(self.message)


class ValidationError(AppError):
    status_code = 400
    message = "Invalid request"


class UpstreamWeatherError(AppError):
    """Raised when Open-Meteo cannot be reached or returns a non-success response."""

    status_code = 502
    message = "Unable to fetch weather data"


class StorageWriteError(AppError):
    """Raised when the object cannot be written to S3."""

    status_code = 500
    message = "Unable to store weather data"


class StorageReadError(AppError):
    """Raised when S3 is unreachable or returns an unexpected error while reading."""

    status_code = 500
    message = "Unable to read weather data"


class FileNotFoundAppError(AppError):
    status_code = 404
    message = "not found"
