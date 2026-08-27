import pytest
from pydantic import ValidationError

from app.models.weather import WeatherRequest


def make_payload(**overrides):
    payload = {
        "latitude": 51.5074,
        "longitude": -0.1278,
        "start_date": "2026-07-01",
        "end_date": "2026-07-20",
    }
    payload.update(overrides)
    return payload


class TestValidRequests:
    def test_valid_coordinates_and_range(self):
        req = WeatherRequest(**make_payload())
        assert req.latitude == 51.5074
        assert req.longitude == -0.1278

    def test_latitude_lower_boundary(self):
        WeatherRequest(**make_payload(latitude=-90))

    def test_latitude_upper_boundary(self):
        WeatherRequest(**make_payload(latitude=90))

    def test_longitude_lower_boundary(self):
        WeatherRequest(**make_payload(longitude=-180))

    def test_longitude_upper_boundary(self):
        WeatherRequest(**make_payload(longitude=180))

    def test_same_start_and_end_date(self):
        req = WeatherRequest(**make_payload(start_date="2026-07-01", end_date="2026-07-01"))
        assert req.start_date == req.end_date

    def test_exactly_31_day_range_is_valid(self):
        # July 1 through July 31 inclusive = 31 days
        WeatherRequest(**make_payload(start_date="2026-07-01", end_date="2026-07-31"))


class TestInvalidRequests:
    def test_latitude_too_high(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(latitude=90.1))

    def test_latitude_too_low(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(latitude=-90.1))

    def test_longitude_too_high(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(longitude=180.1))

    def test_longitude_too_low(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(longitude=-180.1))

    def test_non_numeric_latitude(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(latitude="not-a-number"))

    def test_invalid_date_format(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(start_date="01-07-2026"))

    def test_start_date_after_end_date(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(start_date="2026-07-20", end_date="2026-07-01"))

    def test_range_of_32_days_is_rejected(self):
        with pytest.raises(ValidationError):
            WeatherRequest(**make_payload(start_date="2026-07-01", end_date="2026-08-01"))

    def test_missing_latitude(self):
        payload = make_payload()
        del payload["latitude"]
        with pytest.raises(ValidationError):
            WeatherRequest(**payload)

    def test_missing_date_fields(self):
        payload = make_payload()
        del payload["start_date"]
        del payload["end_date"]
        with pytest.raises(ValidationError):
            WeatherRequest(**payload)
