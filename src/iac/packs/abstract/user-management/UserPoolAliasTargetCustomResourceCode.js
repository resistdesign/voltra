const AWS = require("aws-sdk");
const Response = require("cfn-response");

exports.handler = async (event, context) => {
  const { RequestType } = event;

  let status = Response.FAILED,
    data = {};

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
      } = await cognito
        .describeUserPoolDomain({ Domain: UserPoolDomain })
        .promise();

      status = Response.SUCCESS;
      data = {
        AliasTarget: CloudFrontDistribution,
      };
    } catch (error) {
      data = error;
    }
  }

  return await sendResponse(event, context, status, data);
};

async function sendResponse(event, context, responseStatus, responseData) {
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
    const request = https.request(options, function (response) {
      console.log("STATUS: " + response.statusCode);
      console.log("HEADERS: " + JSON.stringify(response.headers));
      resolve(JSON.parse(responseBody));
      context.done();
    });
    request.on("error", function (error) {
      console.log("sendResponse Error:" + error);
      reject(error);
      context.done();
    });
    request.write(responseBody);
    request.end();
  });
  return await responsePromise;
}
