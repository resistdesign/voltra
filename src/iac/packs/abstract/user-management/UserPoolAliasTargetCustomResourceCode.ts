import AWS from "aws-sdk";
import { CloudFormationCustomResourceHandler } from "aws-lambda";
import Response, { ResponseStatus } from "cfn-response";

export const handler: CloudFormationCustomResourceHandler = async (
  event,
  context,
): Promise<void> => {
  const { RequestType } = event;

  let status: ResponseStatus = Response.FAILED,
    data: any = {};

  if (RequestType === "Delete") {
    status = Response.SUCCESS;
  } else {
    try {
      const {
        ResourceProperties: { UserPoolDomain },
      } = event;
      const cognito = new AWS.CognitoIdentityServiceProvider();
      const {
        DomainDescription: { CloudFrontDistribution },
      } = (await cognito
        .describeUserPoolDomain({ Domain: UserPoolDomain })
        .promise()) as any;

      status = Response.SUCCESS;
      data = {
        AliasTarget: CloudFrontDistribution,
      };
    } catch (error) {
      data = error;
    }
  }

  return (await sendResponse(event, context, status, data)) as any;
};

async function sendResponse(
  event: any,
  context: any,
  responseStatus: any,
  responseData: any,
) {
  let responsePromise = new Promise((resolve, reject) => {
    const responseBody = JSON.stringify({
      Status: responseStatus,
      Reason: "CloudWatch Log Stream: " + context.logStreamName,
      PhysicalResourceId: context.logStreamName,
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: responseData,
    });
    console.log("RESPONSE BODY:\n", responseBody);
    const https = require("https");
    const url = require("url");
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: "PUT",
      headers: {
        "content-type": "",
        "content-length": responseBody.length,
      },
    };
    console.log("SENDING RESPONSE...\n");
    const request = https.request(options, function (response: any) {
      console.log("STATUS: " + response.statusCode);
      console.log("HEADERS: " + JSON.stringify(response.headers));
      resolve(JSON.parse(responseBody));
      context.done();
    });
    request.on("error", function (error: any) {
      console.log("sendResponse Error:" + error);
      reject(error);
      context.done();
    });
    request.write(responseBody);
    request.end();
  });
  return await responsePromise;
}
