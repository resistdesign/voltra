import { RouteMap } from '../utils/Router/Types';
import { addRoutesToRouteMap } from '../utils/Router';
import { BaseUserMessage } from '../../common/Types';
import { getChatHistory, saveMessage, saveUserInfo } from './UserRoutes/DBUtils';
import {
  addMessageToThread,
  FunctionMap,
  getOrCreateUserThreadId,
  runAssistantOnThread,
} from './UserRoutes/OpenAIUtils';
import { ThreadCreateAndRunParams } from 'openai/resources/beta';
import AssistantToolsFunction = ThreadCreateAndRunParams.AssistantToolsFunction;

const FUNCTION_NAMES = {
  SAVE_INTERVIEW_RATING: 'save-interview-rating',
};
const FUNCTION_LIST: AssistantToolsFunction[] = [
  {
    type: 'function',
    function: {
      name: FUNCTION_NAMES.SAVE_INTERVIEW_RATING,
      description: 'Save the overall percentage rating for the interview candidate.',
      parameters: {
        type: 'object',
        properties: {
          rating: {
            type: 'number',
            description: "A percentage rating, 0 to 100, for the candidate's overall performance during the interview.",
          },
        },
        required: ['rating'],
      },
    },
  },
];

const runThread = async (userId: string, threadId: string): Promise<BaseUserMessage | undefined> => {
  const FUNCTION_MAP: FunctionMap = {
    [FUNCTION_NAMES.SAVE_INTERVIEW_RATING]: async (parameters: any) => {
      const { rating = 0 } = parameters;

      await saveUserInfo(userId, {
        rating,
      });

      return true;
    },
  };
  const newMessage = await runAssistantOnThread(threadId, FUNCTION_LIST, FUNCTION_MAP);

  return newMessage;
};

export const UserRoutes: RouteMap = addRoutesToRouteMap({}, [
  {
    path: '/get-chat-history',
    authConfig: {
      anyAuthorized: true,
    },
    handlerFactory: (eventData) => async () => {
      const { authInfo } = eventData;
      const { userId } = authInfo;

      if (userId) {
        let userMessages = await getChatHistory(userId as string);

        if (userMessages.length < 1) {
          // Get the AI to start the conversation when there are no messages.
          const threadId = await getOrCreateUserThreadId(userId as string);
          const newMessage = await runThread(userId, threadId);

          if (newMessage) {
            await saveMessage(userId, newMessage);
          } else {
            console.log('No Initial Assistant Response');
          }

          userMessages = await getChatHistory(userId as string);
        }

        return userMessages;
      } else {
        throw new Error('INVALID_USER_ID');
      }
    },
  },
  {
    path: '/send-chat-message',
    authConfig: {
      anyAuthorized: true,
    },
    handlerFactory: (eventData) => async (message: string) => {
      const { authInfo } = eventData;
      const { userId } = authInfo;

      if (userId) {
        const threadId = await getOrCreateUserThreadId(userId);
        const userMessage: BaseUserMessage = {
          role: 'user',
          content: `${message}`,
        };

        // Add the new message to the history.
        await saveMessage(userId, userMessage);
        await addMessageToThread(threadId, userMessage);

        const newAssistantMessage: BaseUserMessage | undefined = await runThread(userId, threadId);

        if (newAssistantMessage) {
          // Store the new completion message to the history.
          await saveMessage(userId, newAssistantMessage);

          return newAssistantMessage;
        } else {
          throw new Error('No Assistant Response');
        }
      } else {
        throw new Error('INVALID_USER_ID');
      }
    },
  },
]);
