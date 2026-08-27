#!/usr/bin/env bash
# Builds backend/dist/lambda-package.zip: app code + dependencies, built for
# Lambda's actual runtime (manylinux x86_64, Python 3.12), not the host OS.
# boto3/botocore are intentionally excluded - the Lambda Python runtime provides them.
set -euo pipefail

cd "$(dirname "$0")/.."  # backend/

rm -rf build dist
mkdir -p build/package dist

pip install \
  --platform manylinux2014_x86_64 \
  --target build/package \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  -r requirements-lambda.txt

cp -r app build/package/app

cd build/package
find . -name "__pycache__" -type d -prune -exec rm -rf {} \;
zip -rq ../../dist/lambda-package.zip .
cd ../..

rm -rf build

echo "Built dist/lambda-package.zip ($(du -h dist/lambda-package.zip | cut -f1))"
