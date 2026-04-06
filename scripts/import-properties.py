#!/usr/bin/env python3
import argparse
import mimetypes
import os
import sys
import uuid
import urllib.error
import urllib.request


def load_env_files() -> None:
    for candidate in (".env.local", ".env.example"):
        if not os.path.isfile(candidate):
            continue

        with open(candidate, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue

                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")

                if key and value and key not in os.environ:
                    os.environ[key] = value


def build_multipart_payload(field_name: str, file_path: str, base_boundary: str) -> bytes:
    file_name = os.path.basename(file_path)
    content_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    with open(file_path, "rb") as handle:
        file_bytes = handle.read()

    boundary_bytes = base_boundary.encode("ascii")
    lines = [
        b"--" + boundary_bytes + b"\r\n",
        f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'.encode("utf-8"),
        f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
        file_bytes,
        b"\r\n",
        b"--" + boundary_bytes + b"--\r\n",
    ]

    return b"".join(lines)


def main() -> int:
    load_env_files()

    parser = argparse.ArgumentParser(description="Send a JSON/CSV/XLS(X) file to the properties import endpoint.")
    parser.add_argument("file", help="Path to the exported property file.")
    parser.add_argument(
        "--api-base-url",
        dest="api_base_url",
        help="Override the API base URL (default: VITE_API_BASE_URL or http://localhost:3000).",
    )
    args = parser.parse_args()

    file_path = os.path.abspath(args.file)
    if not os.path.isfile(file_path):
        print(f"{file_path} does not exist.", file=sys.stderr)
        return 1

    base_url = (
        args.api_base_url
        or os.environ.get("API_BASE_URL")
        or os.environ.get("VITE_API_BASE_URL")
        or "http://localhost:3000"
    ).rstrip("/")

    target_url = f"{base_url}/api/properties/import"

    boundary = f"codex-{uuid.uuid4().hex}"
    payload = build_multipart_payload("file", file_path, boundary)

    request = urllib.request.Request(target_url, data=payload, method="POST")
    request.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    request.add_header("User-Agent", "import-properties-script")

    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
            print(body)
            return 0
    except urllib.error.HTTPError as http_err:
        print(f"Request failed ({http_err.code}): {http_err.reason}", file=sys.stderr)
        try:
            print(http_err.read().decode("utf-8"), file=sys.stderr)
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
