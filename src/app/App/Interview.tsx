import { FC, PropsWithChildren, useCallback, useMemo } from 'react';
import { APP_ENV_CONFIG } from '../config';
import { InterviewChatForm } from './Interview/InterviewChatForm';
import { RemoteProcedureCall, useApplicationStateLoader } from '../utils/ApplicationStateLoader';
import { INTERVIEW } from './Interview/IDs';
import { useApplicationStateValue } from '../utils/ApplicationState';

const {
  api: { domain: API_DOMAIN },
} = APP_ENV_CONFIG;

export type InterviewProps = PropsWithChildren<{
  authorization: string;
}>;

export const Interview: FC<InterviewProps> = ({ authorization }) => {
  const ADD_MESSAGE_RPC: RemoteProcedureCall = useMemo(
    () => ({
      serviceConfig: {
        protocol: 'https',
        domain: API_DOMAIN,
        basePath: '/user',
        authorization,
      },
      path: '/send-chat-message',
    }),
    [authorization]
  );
  const MESSAGES_RPC: RemoteProcedureCall = useMemo(
    () => ({
      serviceConfig: {
        protocol: 'https',
        domain: API_DOMAIN,
        basePath: '/user',
        authorization,
      },
      path: '/get-chat-history',
    }),
    [authorization]
  );
  const { value: messages = [], onChange: onMessagesChange } = useApplicationStateValue(INTERVIEW.MESSAGES);
  const { loading: addMessageLoading, makeRemoteProcedureCall: addMessage } = useApplicationStateLoader({
    identifier: INTERVIEW.ADD_MESSAGE,
    remoteProcedureCall: ADD_MESSAGE_RPC,
    manual: true,
  });
  const { loading: messagesLoading, invalidate: invalidateMessages } = useApplicationStateLoader({
    identifier: INTERVIEW.MESSAGES,
    remoteProcedureCall: MESSAGES_RPC,
  });
  const onAddMessage = useCallback(
    async (newMessage: string) => {
      onMessagesChange([
        ...messages,
        {
          role: 'user',
          content: newMessage,
        },
      ]);
      await addMessage?.(newMessage);
      invalidateMessages();
    },
    [addMessage, invalidateMessages, messages, onMessagesChange]
  );

  return (
    <InterviewChatForm
      messagesLoading={messagesLoading || addMessageLoading}
      messages={messages}
      onAddMessage={onAddMessage}
    />
  );
};
