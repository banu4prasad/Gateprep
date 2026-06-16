import pytest
from unittest.mock import patch

from app.services.cloudinary_service import upload_image, delete_image

@pytest.fixture
def mock_settings():
    with patch("app.services.cloudinary_service.settings") as mock_settings:
        yield mock_settings

@pytest.fixture
def mock_uploader():
    with patch("app.services.cloudinary_service.cloudinary.uploader") as mock_uploader:
        yield mock_uploader

def test_upload_image_not_configured(mock_settings):
    mock_settings.CLOUDINARY_CLOUD_NAME = None
    result = upload_image(b"test_bytes")
    assert result == {"url": None, "public_id": None, "error": "Cloudinary not configured"}

def test_upload_image_success(mock_settings, mock_uploader):
    mock_settings.CLOUDINARY_CLOUD_NAME = "test_cloud"
    mock_uploader.upload.return_value = {
        "secure_url": "https://res.cloudinary.com/test_cloud/image/upload/v1/test_id.jpg",
        "public_id": "test_id"
    }

    result = upload_image(b"test_bytes")

    assert result == {
        "url": "https://res.cloudinary.com/test_cloud/image/upload/v1/test_id.jpg",
        "public_id": "test_id"
    }
    mock_uploader.upload.assert_called_once_with(
        b"test_bytes",
        folder="gate-prep/questions",
        resource_type="image",
        transformation=[
            {"quality": "auto", "fetch_format": "auto"},
            {"width": 1200, "crop": "limit"},
        ]
    )

def test_upload_image_exception(mock_settings, mock_uploader):
    mock_settings.CLOUDINARY_CLOUD_NAME = "test_cloud"
    mock_uploader.upload.side_effect = Exception("Upload failed")

    result = upload_image(b"test_bytes")

    assert result == {"url": None, "public_id": None, "error": "Upload failed"}

def test_delete_image_not_configured(mock_settings):
    mock_settings.CLOUDINARY_CLOUD_NAME = None
    result = delete_image("test_id")
    assert result is False

def test_delete_image_no_public_id(mock_settings):
    mock_settings.CLOUDINARY_CLOUD_NAME = "test_cloud"
    assert delete_image(None) is False
    assert delete_image("") is False

def test_delete_image_success(mock_settings, mock_uploader):
    mock_settings.CLOUDINARY_CLOUD_NAME = "test_cloud"
    mock_uploader.destroy.return_value = {"result": "ok"}

    result = delete_image("test_id")

    assert result is True
    mock_uploader.destroy.assert_called_once_with("test_id")

def test_delete_image_exception(mock_settings, mock_uploader):
    mock_settings.CLOUDINARY_CLOUD_NAME = "test_cloud"
    mock_uploader.destroy.side_effect = Exception("Delete failed")

    result = delete_image("test_id")

    assert result is False
