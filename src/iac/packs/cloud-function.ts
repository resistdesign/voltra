import { AWS } from '@aws-cf-builder/types';
import { createResourcePack } from '@aws-cf-builder/utils';

export const PLACEHOLDER_FUNCTION_CODE: AWS.Lambda.Function.Code = {
  ZipFile:
    'module.exports = {handler: async () => ({\n            statusCode: 200,\n            headers: {\'Content-Type\': \'application/json\'},\n            body: \'"You did it!"\'\n          })};\n',
};

export type AddCloudFunctionConfig = {
  id: string;
  code?: AWS.Lambda.Function.Code;
  environment?: AWS.Lambda.Function.Environment;
  handler?: any;
  runtime?:
    | 'dotnetcore1.0'
    | 'dotnetcore2.0'
    | 'dotnetcore2.1'
    | 'dotnetcore3.1'
    | 'go1.x'
    | 'java11'
    | 'java8'
    | 'java8.al2'
    | 'nodejs'
    | 'nodejs10.x'
    | 'nodejs12.x'
    | 'nodejs14.x'
    | 'nodejs4.3'
    | 'nodejs4.3-edge'
    | 'nodejs6.10'
    | 'nodejs8.10'
    | 'provided'
    | 'provided.al2'
    | 'python2.7'
    | 'python3.6'
    | 'python3.7'
    | 'python3.8'
    | 'python3.9'
    | 'ruby2.5'
    | 'ruby2.7';
  timeout?: any;
  policies?: AWS.IAM.Role.Policy[];
};

export const addCloudFunction = createResourcePack(
  ({
     id,
     code = PLACEHOLDER_FUNCTION_CODE,
     environment = {
       Variables: {
         NODE_ENV: 'production',
       },
     },
     handler = 'index.handler',
     runtime = 'nodejs12.x',
     timeout = 30,
     policies = [
       {
         PolicyName: 'lambda-parameter-store',
         PolicyDocument: {
           Version: '2012-10-17',
           Statement: [
             {
               Effect: 'Allow',
               Action: ['*'],
               Resource: '*',
             },
           ],
         },
       },
     ],
   }: AddCloudFunctionConfig) => {
    return {
      Resources: {
        [`${id}Role`]: {
          Type: 'AWS::IAM::Role',
          Properties: {
            ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Action: ['sts:AssumeRole'],
                  Effect: 'Allow',
                  Principal: {
                    Service: ['lambda.amazonaws.com'],
                  },
                },
              ],
            },
            Policies: policies,
          },
        },
        [id]: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Timeout: timeout,
            Code: code,
            Environment: environment,
            Handler: handler,
            Role: {
              'Fn::GetAtt': [`${id}Role`, 'Arn'],
            },
            Runtime: runtime,
          },
        },
      },
    };
  },
);
