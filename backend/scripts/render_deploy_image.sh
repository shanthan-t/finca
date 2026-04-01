#!/usr/bin/env bash

set -euo pipefail

if ! command -v podman >/dev/null 2>&1; then
  echo "podman is required to build and push the deployment image." >&2
  exit 1
fi

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "Set RENDER_API_KEY before running this script." >&2
  exit 1
fi

APP_NAME="${RENDER_SERVICE_NAME:-agri-blockchain-engine}"
REGION="${RENDER_REGION:-singapore}"
PLAN="${RENDER_PLAN:-free}"
IMAGE_TTL="${IMAGE_TTL:-24h}"
IMAGE_NAME="${IMAGE_NAME:-ttl.sh/${APP_NAME}-$(date +%Y%m%d%H%M%S)-$RANDOM:${IMAGE_TTL}}"

auth_header="Authorization: Bearer ${RENDER_API_KEY}"

owner_id="${RENDER_OWNER_ID:-}"
if [[ -z "${owner_id}" ]]; then
  owners_json="$(curl -fsSL https://api.render.com/v1/owners \
    -H "${auth_header}" \
    -H "Accept: application/json")"

  owner_id="$(RENDER_OWNER_NAME="${RENDER_OWNER_NAME:-}" python -c '
import json
import os
import sys

owners = json.load(sys.stdin)
target_name = os.environ.get("RENDER_OWNER_NAME")

for entry in owners:
    owner = entry.get("owner", entry)
    if target_name and owner.get("name") != target_name:
        continue
    print(owner["id"])
    break
else:
    raise SystemExit("No matching Render workspace found. Set RENDER_OWNER_ID or RENDER_OWNER_NAME.")
' <<< "${owners_json}")"
fi

echo "Building image ${IMAGE_NAME}"
podman build -t "${IMAGE_NAME}" .

echo "Pushing image ${IMAGE_NAME}"
podman push "${IMAGE_NAME}"

create_payload="$(OWNER_ID="${owner_id}" IMAGE_NAME="${IMAGE_NAME}" APP_NAME="${APP_NAME}" REGION="${REGION}" PLAN="${PLAN}" python -c '
import json
import os

print(json.dumps({
    "type": "web_service",
    "name": os.environ["APP_NAME"],
    "ownerId": os.environ["OWNER_ID"],
    "autoDeploy": "no",
    "image": {
        "ownerId": os.environ["OWNER_ID"],
        "imagePath": os.environ["IMAGE_NAME"],
    },
    "serviceDetails": {
        "runtime": "image",
        "plan": os.environ["PLAN"],
        "region": os.environ["REGION"],
        "healthCheckPath": "/api/v1/health",
    },
}))
')"

create_response="$(curl -fsSL https://api.render.com/v1/services \
  -X POST \
  -H "${auth_header}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "${create_payload}")"

read -r service_id deploy_id dashboard_url service_url <<< "$(python -c '
import json
import sys

payload = json.load(sys.stdin)
service = payload["service"]
print(service["id"], payload["deployId"], service["dashboardUrl"], service["serviceDetails"]["url"])
' <<< "${create_response}")"

echo "Render service created:"
echo "  service_id: ${service_id}"
echo "  deploy_id: ${deploy_id}"
echo "  dashboard: ${dashboard_url}"
echo "  url: ${service_url}"

echo "Waiting for the first deploy to finish..."
for _ in $(seq 1 60); do
  deploy_response="$(curl -fsSL "https://api.render.com/v1/services/${service_id}/deploys/${deploy_id}" \
    -H "${auth_header}" \
    -H "Accept: application/json")"

  status="$(python -c '
import json
import sys

print(json.load(sys.stdin)["status"])
' <<< "${deploy_response}")"

  case "${status}" in
    live)
      echo "Deploy is live: ${service_url}"
      exit 0
      ;;
    build_failed|update_failed|canceled|pre_deploy_failed|deactivated)
      echo "Deploy failed with status: ${status}" >&2
      exit 1
      ;;
  esac

  sleep 10
done

echo "Timed out waiting for the deploy. Check ${dashboard_url} for current status." >&2
exit 1
