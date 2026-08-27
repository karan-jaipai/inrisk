# Weather Explorer

Full architecture, API, and design-decision documentation will be completed once the
frontend is built (see project plan). This section documents AWS setup now so it can be
executed and verified before moving on.

## AWS Setup (manual, zero-cost)

All resources below stay within AWS's always-free tier: one S3 bucket with a 7-day
object lifecycle, one Lambda function invoked only on demand via its Function URL (no
API Gateway, no idle compute), and a CloudWatch Log Group capped at 1-day retention.
Nothing here requires a paid plan or credit card commitment beyond sign-up.

Run everything below from `backend/`, with the AWS CLI installed and configured
(`aws configure`) against your account.

### 1. Choose names and region

```bash
export AWS_REGION=us-east-1                     # pick your region
export BUCKET_NAME=weather-explorer-<your-unique-suffix>   # bucket names are globally unique
export FUNCTION_NAME=weather-explorer-api
export ROLE_NAME=weather-explorer-lambda-role
```

### 2. Create the S3 bucket

```bash
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION"
# us-east-1 only: omit --create-bucket-configuration.
# Any other region, add:
#   --create-bucket-configuration LocationConstraint="$AWS_REGION"

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 3. Apply the 7-day lifecycle rule (zero-cost requirement)

```bash
sed "s/YOUR_BUCKET_NAME/$BUCKET_NAME/g" aws/s3-lifecycle-policy.json > /tmp/lifecycle.json
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration file:///tmp/lifecycle.json

# Verify:
aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_NAME"
```

Every object uploaded to this bucket is permanently deleted 7 days after creation,
regardless of usage — this bounds S3 storage cost at effectively zero.

### 4. Create the Lambda execution role (least privilege)

```bash
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file://aws/trust-policy.json

aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

sed "s/YOUR_BUCKET_NAME/$BUCKET_NAME/g" aws/s3-access-policy.json > /tmp/s3-access-policy.json
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name weather-explorer-s3-access \
  --policy-document file:///tmp/s3-access-policy.json
```

The role gets exactly `s3:ListBucket` (on the bucket), `s3:GetObject`/`s3:PutObject`
(on objects in the bucket), and AWS's managed `AWSLambdaBasicExecutionRole` (CloudWatch
log write access only). No `AmazonS3FullAccess`, no `AdministratorAccess`.

### 5. Build and deploy the Lambda function

```bash
./scripts/build_lambda_package.sh   # produces dist/lambda-package.zip

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

# IAM roles take a few seconds to propagate; retry create-function if this fails immediately.
aws lambda create-function \
  --function-name "$FUNCTION_NAME" \
  --runtime python3.12 \
  --handler app.lambda_handler.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://dist/lambda-package.zip \
  --timeout 15 \
  --memory-size 256 \
  --environment "Variables={S3_BUCKET_NAME=$BUCKET_NAME,AWS_REGION=$AWS_REGION,OPEN_METEO_BASE_URL=https://archive-api.open-meteo.com/v1/archive,CORS_ORIGINS=http://localhost:5173,ENVIRONMENT=production}"
```

### 6. Create a public Function URL (no API Gateway)

We use a Lambda Function URL instead of API Gateway: it's the simplest entry point
that satisfies the case study's "AWS Lambda" deployment option, with zero additional
AWS services, no request-based billing surface, and no extra IAM/resource policy
surface to manage.

```bash
aws lambda create-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --auth-type NONE \
  --cors '{"AllowOrigins":["http://localhost:5173"],"AllowMethods":["GET","POST"],"AllowHeaders":["content-type"]}'

# Lambda-level CORS above is a coarse allow-list at the infrastructure layer.
# The FastAPI app's own CORS middleware (CORS_ORIGINS env var) is the actual
# enforcement point and is what you'll update with your real frontend domain
# once it's deployed.

aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE

FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --query 'FunctionUrl' --output text)
echo "$FUNCTION_URL"
```

Auth type `NONE` is intentional and matches the case study: this app has no
authentication/authorization by design (§32 of the engineering brief explicitly
scopes that out). Anyone with the URL can call the three weather endpoints; there is
no admin or destructive action exposed.

### 7. Cap CloudWatch Log Group retention at 1 day (zero-cost requirement)

```bash
# First invocation creates the log group; invoke once, then set retention.
curl -s "$FUNCTION_URL"health

aws logs put-retention-policy \
  --log-group-name "/aws/lambda/$FUNCTION_NAME" \
  --retention-in-days 1
```

Without this, Lambda's default is to retain logs indefinitely, which is the one
realistic path to non-zero cost on an active function over time.

### 8. Verify the deployment

```bash
curl -s "$FUNCTION_URL"health
# expect: {"status":"ok","environment":"production"}

curl -s -X POST "$FUNCTION_URL"store-weather-data \
  -H "Content-Type: application/json" \
  -d '{"latitude":51.5074,"longitude":-0.1278,"start_date":"2026-07-01","end_date":"2026-07-03"}'
# expect: {"status":"ok","file":"weather_..."}

curl -s "$FUNCTION_URL"list-weather-files
# expect the file from above in "files"
```

### 9. Production readiness checklist

- [ ] S3 bucket created, public access blocked
- [ ] 7-day lifecycle rule applied and confirmed via `get-bucket-lifecycle-configuration`
- [ ] IAM role scoped to `ListBucket`/`GetObject`/`PutObject` on this bucket only
- [ ] Lambda deployed with `app.lambda_handler.handler`, env vars set
- [ ] Function URL created, `auth-type NONE`, CORS restricted to your real frontend origin (update after frontend deploy)
- [ ] CloudWatch Log Group retention set to 1 day
- [ ] `/health`, `/store-weather-data`, `/list-weather-files` verified against the live Function URL

### Updating CORS after the frontend is deployed

Once the frontend has a real URL, update both the Lambda's env var and its Function
URL CORS config:

```bash
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={S3_BUCKET_NAME=$BUCKET_NAME,AWS_REGION=$AWS_REGION,OPEN_METEO_BASE_URL=https://archive-api.open-meteo.com/v1/archive,CORS_ORIGINS=https://your-frontend-domain.vercel.app,ENVIRONMENT=production}"

aws lambda update-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --cors '{"AllowOrigins":["https://your-frontend-domain.vercel.app"],"AllowMethods":["GET","POST"],"AllowHeaders":["content-type"]}'
```

### Redeploying after a code change

```bash
./scripts/build_lambda_package.sh
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://dist/lambda-package.zip
```
