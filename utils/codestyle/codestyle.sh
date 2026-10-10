#!/usr/bin/env sh
#
# Code style check.
#
# Historically this ran JSCS. JSCS is unmaintained, does not install on modern
# Node releases and could not be executed in CI, so the project standard is now
# enforced by ESLint (see `.eslintrc.json` / `.eslintignore`).
#
# The equivalent command is:
#
#     npm run lint
#
# Both are run on every push by `.github/workflows/ci.yml`.

set -e

cd "$(dirname "$0")/../.."

npm run lint
