import { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { BaseUserInfo, BaseUserMessage, UserInfo, UserMessage } from '../../../common/Types';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { API_CONFIG } from '../../env/APIConfig';

const { DATABASE_MESSAGE_HISTORY_TABLE_NAME, DATABASE_USER_INFO_TABLE_NAME } = API_CONFIG;
const DB_CLIENT = new DynamoDBClient({
  region: 'us-east-1',
});

export const getChatHistory = async (userId: string): Promise<UserMessage[]> => {
  const { Items: resultItems = [] } = await DB_CLIENT.send(
    new QueryCommand({
      TableName: DATABASE_MESSAGE_HISTORY_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
    })
  );
  const messageHistory: UserMessage[] = resultItems.map((item) => unmarshall(item) as UserMessage);

  return messageHistory;
};

export const saveMessage = async (userId: string, message: BaseUserMessage) => {
  const userMessage: UserMessage = {
    ...message,
    userId: userId,
    timestamp: new Date().toISOString(),
  };

  await DB_CLIENT.send(
    new PutItemCommand({
      TableName: DATABASE_MESSAGE_HISTORY_TABLE_NAME,
      Item: marshall(userMessage),
    })
  );
};

export const getUserInfo = async (userId: string): Promise<UserInfo | undefined> => {
  const { Items: resultItems = [] } = await DB_CLIENT.send(
    new QueryCommand({
      TableName: DATABASE_USER_INFO_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
    })
  );
  const userInfo: UserInfo[] = resultItems.map((item) => unmarshall(item) as UserInfo);

  return userInfo[0];
};

export const saveUserInfo = async (userId: string, info: BaseUserInfo) => {
  const existingUserInfo = await getUserInfo(userId);
  const userInfo: UserInfo = {
    ...existingUserInfo,
    ...info,
    userId,
    timestamp: new Date().toISOString(),
  };

  if (existingUserInfo) {
    const { timestamp: existingTimestamp } = existingUserInfo;
    const { threadId: newThreadId, rating: newRating } = userInfo;

    await DB_CLIENT.send(
      new UpdateItemCommand({
        TableName: DATABASE_USER_INFO_TABLE_NAME,
        Key: {
          userId: { S: userId },
          timestamp: { S: existingTimestamp },
        },
        UpdateExpression: 'set #tId = :tId, #rating = :rating',
        ExpressionAttributeNames: {
          '#tId': 'threadId',
          '#rating': 'rating',
        },
        ExpressionAttributeValues: {
          ':tId': { S: newThreadId || '' },
          ':rating': { N: newRating?.toString() || '0' },
        },
      })
    );
  } else {
    await DB_CLIENT.send(
      new PutItemCommand({
        TableName: DATABASE_USER_INFO_TABLE_NAME,
        Item: marshall(userInfo),
      })
    );
  }
};
