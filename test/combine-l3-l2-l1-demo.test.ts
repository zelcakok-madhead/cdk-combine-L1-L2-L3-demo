import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as CombineStack from '../lib/combine-l3-l2-l1-demo-stack';

describe('CombineStack', () => {
    let app: cdk.App;
    let stack: CombineStack.CombinedConstructsStack;
    let template: Template;

    // Setup
    beforeEach(() => {
        app = new cdk.App();
        stack = new CombineStack.CombinedConstructsStack(app, 'MyTestStack');
        template = Template.fromStack(stack);
    });

    // Check if resource is included in the CloudFormation
    test('Lambda Function Created', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
            Environment: {
                Variables: {
                    DYNAMODB_TABLE_NAME: {
                        Ref: Match.stringLikeRegexp('MyTable')
                    },
                    S3_BUCKET_NAME: {
                        Ref: Match.stringLikeRegexp('MyBucket')
                    }
                }
            }
        });
    });

    test('API Gateway Created', () => {
        template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    test('S3 Bucket Created', () => {
        template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    test('Dynamo DB Created', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });

    // Check the settings
    test('S3 Bucket Policy Created', () => {
        template.hasResourceProperties('AWS::S3::BucketPolicy', {
            Bucket: {
                Ref: Match.stringLikeRegexp("MyBucket")
            },
            PolicyDocument: {
                Version: Match.stringLikeRegexp('2012-10-17'),
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Effect: Match.exact('Allow'),
                        Action: Match.arrayEquals(['s3:GetObject', 's3:PutObject'])
                    })
                ])
            }
        })
    });

    test('Lambda Function Has Permission To Access The DynamoDB', () => {
        const expectedActions = [
            'dynamodb:BatchGetItem',
            'dynamodb:GetRecords',
            'dynamodb:GetShardIterator',
            'dynamodb:Query',
            'dynamodb:GetItem',
            'dynamodb:Scan',
            'dynamodb:ConditionCheckItem',
            'dynamodb:BatchWriteItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:DescribeTable'
        ];

        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Effect: Match.exact('Allow'),
                        Action: Match.arrayEquals(expectedActions),
                    })
                ])
            }
        })
    });
});