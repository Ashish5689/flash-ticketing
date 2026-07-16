# EC2 launch report — Flash Ticketing production API

Launch verified on 2026-07-16 in `ap-south-1`.

## Resource

- Instance: `i-099b32788f5e2fe17` (`t3.micro`, Amazon Linux 2023)
- Stack: `flash-ticketing-production` (`CREATE_COMPLETE`)
- Public API: `https://dro7vidljm1jc.cloudfront.net`
- Runtime: Docker container on loopback port 4000, nginx on port 80
- Administration: AWS Systems Manager; no SSH ingress or key pair
- Storage: encrypted 20 GiB gp3 root volume, retained on termination
- Protection: EC2 API termination protection enabled

## Security verification

- Both EC2 system and instance status checks are `ok`.
- IMDSv2 tokens are required; instance metadata tags and IPv6 metadata are disabled.
- The security group permits port 80 only from AWS's CloudFront origin-facing managed prefix list.
- Direct requests to the Elastic IP time out; CloudFront HTTPS `/health` returns HTTP 200.
- The instance role is restricted to Systems Manager, `movies/*` media objects, and the two
  customer-KMS-encrypted deployment secrets.
- AWS Workload Credentials Provider 3.1.0 and `asm-exec` resolve runtime secrets locally; secret
  values are stored in mode-0600 files and are not placed in CloudFormation or GitHub.
- GitHub Actions uses repository-scoped OIDC trust and an SSM-only deploy role.

## Operational status

- `aws-workload-credentials-provider-sm`: active
- `nginx`: active
- `flash-ticketing-api`: running with `restart unless-stopped`
- Drizzle migrations: successful
- Production `/health`: successful
- Production catalog: S3/CloudFront posters seeded

This deployment creates ongoing AWS charges for EC2, EBS, Elastic IP, CloudFront, Secrets Manager,
KMS, CloudTrail, CloudWatch, S3, and data transfer as applicable. Monitor the AWS Billing dashboard
and the existing project budget alerts.
