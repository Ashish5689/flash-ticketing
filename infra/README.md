# AWS media infrastructure

The media stack creates a private S3 bucket, a CloudFront distribution with Origin Access
Control, and a USD 5 monthly budget notification. Movie images remain private in S3 and are
served only through CloudFront.

## One-time CLI setup

Install AWS CLI v2, enable IAM Identity Center for the AWS account, assign the account to a
permission set that can deploy this stack, then create the local profile:

```bash
aws configure sso --profile movie-ticketing-dev
aws sso login --profile movie-ticketing-dev
aws sts get-caller-identity --profile movie-ticketing-dev
```

The SSO browser flow requires the IAM Identity Center start URL and SSO region shown in the AWS
access portal. Do not create root access keys.

## Validate and deploy

```bash
aws cloudformation validate-template \
  --profile movie-ticketing-dev \
  --region ap-south-1 \
  --template-body file://infra/media-stack.yaml

aws cloudformation deploy \
  --profile movie-ticketing-dev \
  --region ap-south-1 \
  --stack-name movie-ticketing-media-development \
  --template-file infra/media-stack.yaml \
  --parameter-overrides \
    EnvironmentName=development \
    BudgetAlertEmail="<AWS_ACCOUNT_EMAIL>" \
  --no-fail-on-empty-changeset
```

CloudFront can take several minutes to finish deploying. Read the values required by the API:

```bash
aws cloudformation describe-stacks \
  --profile movie-ticketing-dev \
  --region ap-south-1 \
  --stack-name movie-ticketing-media-development \
  --query 'Stacks[0].Outputs'
```

Set `AWS_PROFILE`, `AWS_REGION`, `AWS_S3_BUCKET`, and `MEDIA_PUBLIC_BASE_URL` in the gitignored
`backend/.env`. Use a separate runtime profile restricted to object operations under
`movies/*` in the deployed bucket; do not run the API with the infrastructure-deployment profile.
The deployed EC2 service will use an instance role instead of `AWS_PROFILE`.

## Production API stack

`app-stack.yaml` deploys a hardened EC2 API origin with no SSH ingress. CloudFront is the only
public HTTP client allowed by the security group and supplies the public HTTPS endpoint. Runtime
configuration and the Firebase Admin credential are read from customer-KMS-encrypted Secrets
Manager entries with AWS's `asm-exec` dynamic-reference wrapper; the EC2 instance role has access
only to those secrets, their KMS key, Systems Manager, and `movies/*` objects in the existing media
bucket.

Deploy `secrets-stack.yaml` first, then populate the two retained secrets from the gitignored local
files without printing their values. The stack also configures a multi-region management-event
CloudTrail, encrypted/versioned log storage, and CloudWatch secret-access alarms.

```bash
aws secretsmanager put-secret-value \
  --secret-id flash-ticketing/production/backend-env \
  --secret-string file://backend/.env

aws secretsmanager put-secret-value \
  --secret-id flash-ticketing/production/firebase-admin \
  --secret-string file://path/to/firebase-admin.json
```

Deploy with the default VPC, a public subnet, and the regional CloudFront origin-facing managed
prefix list. The stack uses an encrypted 20 GiB `gp3` volume, IMDSv2, an EC2 instance role, nginx,
Docker restart policies, and SSM instead of SSH. `deploy-flash-ticketing` pulls `main`, runs the
Drizzle migrations, replaces the API container, and refuses success until `/health` responds.

The GitHub deployment workflow deliberately uses OIDC variables (`AWS_DEPLOY_ROLE_ARN` and
`AWS_EC2_INSTANCE_ID`) instead of long-lived AWS keys. Configure those repository variables after
creating an AWS role trusted only by `Ashish5689/flash-ticketing`.
