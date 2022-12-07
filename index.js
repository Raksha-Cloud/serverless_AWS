console.log('Loading Lambda function');
          //const ses = new aws.SES({});

          const AWS = require("aws-sdk");
          const ses = new AWS.SES();

          //setting the env variables from env file
          const VerifyEmailDynamoDB = process.env.VerifyEmailDynamoDB;
          const dynamoDbRegion = process.env.dynamoDbRegion || "us-east-1";
          const domainEnv = process.env.domainEnv || "demo";

          //Setting AWS region for ses
          AWS.config.update({ region: dynamoDbRegion });

          //Setting DB client for dynamo db
          const dynamoClient = new AWS.DynamoDB.DocumentClient({
              region: dynamoDbRegion,
            });

          //Setting up handler
          exports.handler = async (event, context, callback) => {

            const message = event.Records[0].Sns.Message;
            console.log("Message received from SNS:", message);

          //parse the event and store the event information
            const parsedData = JSON.parse(message);
            console.log("Data from parsed data:", parsedData);
            const messageType = parsedData.message_type;
            console.log("Message type type from parsed data:", messageType);
            const username = parsedData.username;
            console.log("username from parsed data:", username);
            const first_name = parsedData.first_name;
            console.log("First name from parsed data:", first_name);
            const last_name = parsedData.last_name;
            console.log("Last name from parsed data:", last_name);
            const userToken = parsedData.userToken;
            console.log("User token from parsed data:", userToken);

          //check if the email is already sent to user
            const emailStatus = await checkEmailStatus(
              dynamoClient,
              VerifyEmailDynamoDB,
              username
            );

          //if email is not sent to user send a new verification email using SES
            if (!emailStatus) {
              console.log("Sending verification email to the user: " + username);
              const params = {
                        Destination: {
                          ToAddresses: [username],
                        },
                        Message: {
                          Body: {
                            Html: {
                              Charset: "UTF-8",
                              Data: `<h3> Hello ${first_name} ${last_name},</h3>
                                    <h4>  Welcome to ${domainEnv}.rakshakagadaluraju.me </h4><br>
                                    <p>Please click the following link (demo test one last time): <a href="https://${domainEnv}.rakshakagadaluraju.me/v1/verifyUser?email=${username}&token=${userToken}">Email verification link</a> or <br>
                                    paste the following link in the browser: https://${domainEnv}.rakshakagadaluraju.me/v1/verifyUser?email=${username}&token=${userToken} to verify your account with us.<br><br><br><br>
                                    Regards,<br>
                                    Team rakshakagadaluraju.me<br></p><br>`,
                            },
                          },
                          Subject: {
                            Charset: "UTF-8",
                            Data: `Email verification : for domain ${domainEnv}.rakshakagadaluraju.me`,
                          },
                        },
                        Source: `noreply@${domainEnv}.rakshakagadaluraju.me`,
                      };

              const data = await ses.sendEmail(params).promise();
              console.log(data);
              console.log("Verification email sent to new user through SES successfully");

              // update the email sent to user in dynamo DB
              await updateEmailStatusToDB(
                dynamoClient,
                VerifyEmailDynamoDB,
                username
              );
              console.log("Email updated to DynamoDB");
            } else {
              console.log(
                "Verification email already sent to user: " + username );
            }
            callback(null, "success");
          };

          //function to update verification email status to user
          const updateEmailStatusToDB = async (
              dynamoClient,
              VerifyEmailDynamoDB,
              username
            ) => {
              const params = {
                TableName: VerifyEmailDynamoDB,
                Item: {
                  email: username,
                },
              };
              const data = await dynamoClient.put(params).promise();
              console.log("Data:", data);
            };
            
          //function to check if verification email is sent to user
          const checkEmailStatus = async (
              dynamoClient,
              VerifyEmailDynamoDB,
              username
            ) => {
              const params = {
                TableName: VerifyEmailDynamoDB,
                Key: {
                  email: username,
                },
              };
              const data = await dynamoClient.get(params).promise();
              console.log("Data:", data);
              if (data.Item) {
                return true;
              } else {
                return false;
              }
            };
