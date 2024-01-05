import { API_CONFIG } from '../../env/APIConfig';
import { OpenAI } from 'openai';
import { BaseUserMessage } from '../../../common/Types';
import { Run, RunSubmitToolOutputsParams } from 'openai/resources/beta/threads';
import { getUserInfo, saveUserInfo } from './DBUtils';
import AssistantToolsFunction = Run.AssistantToolsFunction;
import RequiredAction = Run.RequiredAction;
import SubmitToolOutputs = Run.RequiredAction.SubmitToolOutputs;
import ToolOutput = RunSubmitToolOutputsParams.ToolOutput;

export type FunctionMap = Record<string, (parameters: Record<string, any>) => Promise<any>>;

type RunStatus =
  | 'queued'
  | 'in_progress'
  | 'requires_action'
  | 'cancelling'
  | 'cancelled'
  | 'failed'
  | 'completed'
  | 'expired';
type RunStatusHandlerResponse = {
  done: boolean;
  message?: BaseUserMessage;
};
type RunStatusHandler = (
  threadId: string,
  runId: string,
  functionMap?: FunctionMap
) => Promise<RunStatusHandlerResponse>;

const { OPEN_AI_API_KEY, OPEN_AI_MODEL_ID } = API_CONFIG;
const OPEN_AI = new OpenAI({
  apiKey: OPEN_AI_API_KEY,
});

export const getOrCreateUserThreadId = async (userId: string) => {
  let threadId = (await getUserInfo(userId))?.threadId;

  if (!threadId) {
    const { id: newThreadId } = await OPEN_AI.beta.threads.create();

    threadId = newThreadId;

    await saveUserInfo(userId, {
      threadId,
    });
  }

  return threadId;
};

// Add a new message to the thread.
export const addMessageToThread = async (threadId: string, message: BaseUserMessage) => {
  await OPEN_AI.beta.threads.messages.create(threadId, {
    ...message,
    role: 'user',
  });
};

const onRunStatusError = async () => {
  throw new Error('Assistant Error');
};

const onRunStatusPollAgain = async () => ({
  done: false,
});

const handleRunStatus = async (
  threadId: string,
  runId: string,
  status: RunStatus,
  functionMap?: FunctionMap
): Promise<BaseUserMessage | undefined> => {
  const runStatusHandler = RUN_STATUS_HANDLER_MAP[status];
  const { done, message } = await runStatusHandler(threadId, runId, functionMap);

  if (!done) {
    return await new Promise(async (res, rej) => {
      setTimeout(async () => {
        try {
          const { status: newStatus } = await OPEN_AI.beta.threads.runs.retrieve(threadId, runId);
          const newMessage = await handleRunStatus(threadId, runId, newStatus, functionMap);

          res(newMessage);
        } catch (error) {
          rej(error);
        }
      }, 200);
    });
  } else {
    return message;
  }
};

const RUN_STATUS_HANDLER_MAP: Record<RunStatus, RunStatusHandler> = {
  queued: onRunStatusPollAgain,
  in_progress: onRunStatusPollAgain,
  requires_action: async (threadId, runId, functionMap): Promise<RunStatusHandlerResponse> => {
    if (functionMap) {
      try {
        const { required_action: requiredAction } = await OPEN_AI.beta.threads.runs.retrieve(threadId, runId);
        const { submit_tool_outputs: submitToolOutputs } = requiredAction as RequiredAction;
        const { tool_calls: toolCalls } = submitToolOutputs as SubmitToolOutputs;
        const toolCallOutputs: ToolOutput[] = [];

        if (toolCalls.length > 0) {
          for (const tC of toolCalls) {
            const { id: toolCallId, function: functionCall } = tC;
            const { name: functionName, arguments: functionArguments } = functionCall;
            const functionHandler = functionMap[functionName];
            const toolCallOutputData = await functionHandler(JSON.parse(functionArguments));

            toolCallOutputs.push({
              tool_call_id: toolCallId,
              output: toolCallOutputData,
            });
          }

          await OPEN_AI.beta.threads.runs.submitToolOutputs(threadId, runId, {
            tool_outputs: toolCallOutputs,
          });

          return {
            done: false,
          };
        } else {
          return {
            done: true,
          };
        }
      } catch (error) {
        console.log('Assistant Action Error:', error);

        throw new Error('Assistant Action Error');
      }
    } else {
      throw new Error('No Assistant Action Available');
    }
  },
  cancelling: onRunStatusError,
  cancelled: onRunStatusError,
  failed: onRunStatusError,
  completed: async (threadId): Promise<RunStatusHandlerResponse> => {
    const {
      data: [latestMessage],
    } = await OPEN_AI.beta.threads.messages.list(threadId, {
      order: 'desc',
      limit: 1,
    });
    const {
      content: [messageContent],
    } = latestMessage;
    const { type } = messageContent;

    if (type === 'text') {
      const {
        text: { value: content },
      } = messageContent;

      return {
        done: true,
        message: {
          role: 'assistant',
          content,
        },
      };
    } else {
      return {
        done: true,
      };
    }
  },
  expired: onRunStatusError,
};

export const runAssistantOnThread = async (
  threadId: string,
  functionList?: AssistantToolsFunction[],
  functionMap?: FunctionMap
): Promise<BaseUserMessage | undefined> => {
  const { id: runId, status: runStatus } = await OPEN_AI.beta.threads.runs.create(threadId, {
    assistant_id: OPEN_AI_MODEL_ID,
    tools: functionList,
  });

  return await handleRunStatus(threadId, runId, runStatus, functionMap);
};
