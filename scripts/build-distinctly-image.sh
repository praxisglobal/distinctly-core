#!/usr/bin/env bash
# Build the distinctly Twenty image LOCALLY, tagged and labelled so its provenance is a fact.
#
# Usage:  bash scripts/build-distinctly-image.sh [upstream-version]
#         bash scripts/build-distinctly-image.sh v2.22.0
#
# Why this exists: on 2026-08-10 the image serving dev and staging could not be tied to the commit
# that produced it. It was tagged `ghcr.io/praxisglobal/distinctly-twenty:latest` — a floating tag
# naming a registry it was not in — and carried only upstream's generic OCI labels. The fork commit
# had to be INFERRED from the fact that the image was created ten minutes after it. That is not
# provenance, it is a coincidence that happened to hold.
#
# Labels are passed with `docker build --label` rather than added to
# packages/twenty-docker/twenty/Dockerfile on purpose. That Dockerfile is upstream's, and every
# in-place edit to an upstream file is a merge conflict waiting for the next Twenty upgrade
# (docs/UPSTREAM.md records which of our patches already carry that cost). A separate script and
# build-time labels achieve the same result and rebase for free.
set -euo pipefail

UPSTREAM_VERSION="${1:-v2.22.0}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Refuse to build from a dirty tree: the whole point is that the tag identifies the source, and a
# tag that says c5135f27 while the tree has uncommitted edits is a lie that outlives the build.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "!! working tree is dirty — commit or stash first, or the revision label will be wrong" >&2
  git status --short --untracked-files=no >&2
  exit 1
fi

REV="$(git rev-parse --short HEAD)"
FULL_REV="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TAG="distinctly-twenty:${UPSTREAM_VERSION}-local-${REV}"

# Deliberately NOT a ghcr.io/... name. This image lives on this host; naming it after a registry is
# how a `docker pull` can substitute a different build for it. If the tag is missing, the stack's
# pull_policy=never makes that a loud failure instead of a silent swap.
echo "==> building ${TAG}"
echo "    fork    ${BRANCH} @ ${FULL_REV}"
echo "    upstream ${UPSTREAM_VERSION}"

docker build \
  -f packages/twenty-docker/twenty/Dockerfile \
  --target twenty \
  --build-arg "APP_VERSION=${UPSTREAM_VERSION}" \
  --label "org.opencontainers.image.revision=${FULL_REV}" \
  --label "org.opencontainers.image.version=${UPSTREAM_VERSION}" \
  --label "io.distinctly.twenty.upstream-version=${UPSTREAM_VERSION}" \
  --label "io.distinctly.twenty.fork-branch=${BRANCH}" \
  --label "io.distinctly.twenty.distribution=distinctly" \
  -t "${TAG}" \
  .

echo
echo "==> built ${TAG}"
docker image inspect "${TAG}" --format '    revision: {{index .Config.Labels "org.opencontainers.image.revision"}}'
docker image inspect "${TAG}" --format '    upstream: {{index .Config.Labels "io.distinctly.twenty.upstream-version"}}'
echo
echo "Next, in the distinctly repo — promote the SAME tag, never rebuild per environment:"
echo "    docker/.env.dev      TWENTY_IMAGE=${TAG}   -> stack.sh dev up -d      -> test"
echo "    docker/.env.staging  TWENTY_IMAGE=${TAG}   -> stack.sh staging up -d  -> acceptance"
echo "    docker/.env          TWENTY_IMAGE=${TAG}   -> only after explicit approval (production)"
echo
echo "Archive it before it becomes a release candidate, so a prune cannot destroy it:"
echo "    mkdir -p /opt/distinctly/releases/twenty-${UPSTREAM_VERSION}-${REV}"
echo "    docker save ${TAG} | gzip > /opt/distinctly/releases/twenty-${UPSTREAM_VERSION}-${REV}/image.tar.gz"
