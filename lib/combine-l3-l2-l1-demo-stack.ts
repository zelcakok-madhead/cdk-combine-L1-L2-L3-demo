import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from '@aws-solutions-constructs/aws-apigateway-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class CombinedConstructsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // L3 Construct: API Gateway with Lambda backend
    const apiGatewayToLambda = new apigateway.ApiGatewayToLambda(this, 'ApiGatewayToLambda', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('lambda'),
      },
      apiGatewayProps: {
        defaultCorsPreflightOptions: {
          allowOrigins: ['*'],
          allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
      },
    });

    // L2 Construct: DynamoDB Table
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Grant the Lambda function read/write permissions to the DynamoDB table
    table.grantReadWriteData(apiGatewayToLambda.lambdaFunction);

    // L1 Construct: S3 Bucket
    const bucket = new s3.CfnBucket(this, 'MyBucket', {
      bucketName: `my-unique-bucket-name-${this.account}-${this.region}`,
      versioningConfiguration: {
        status: 'Enabled',
      },
    });

    // Grant the Lambda function read/write permissions to the S3 bucket
    const bucketPolicy = new s3.CfnBucketPolicy(this, 'BucketPolicy', {
      bucket: bucket.ref,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: apiGatewayToLambda.lambdaFunction.role!.roleArn,
            },
            Action: ['s3:GetObject', 's3:PutObject'],
            Resource: `${bucket.attrArn}/*`,
          },
        ],
      },
    });

    // Add environment variables to the Lambda function
    apiGatewayToLambda.lambdaFunction.addEnvironment('DYNAMODB_TABLE_NAME', table.tableName);
    apiGatewayToLambda.lambdaFunction.addEnvironment('S3_BUCKET_NAME', bucket.ref);

    // Output the API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: apiGatewayToLambda.apiGateway.url!,
      description: 'API Gateway URL',
    });
  }
}