# Fix IaC Gateway Auto Deployment

Right now, `src/iac/packs/gateway.ts` has a `AWS::ApiGateway::Deployment` but I think it only runs once. (Not sure.)

It think it might need to run each time there are changes to the API Gateway configuration or something.

We need to figure out:

1. what, if anything, needs to be done here
2. maybe use a hash to have a fresh deploy run each time the stack is changed? (I don't know how that might work
   though.)
3. maybe only change the hash if the API Gateway stuff changes, like generate the hash idempotently from the resulting
   contents of what the `addGateway` pack adds to the stack template. (Might be a bit tricky.)

Figure this out and report back before any kind of implementation.
