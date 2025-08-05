terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0.0"
    }
  }
}

resource "google_storage_bucket" "test_bucket" {
  name = "test-bucket"
  location = "US"
  force_destroy = true
}

