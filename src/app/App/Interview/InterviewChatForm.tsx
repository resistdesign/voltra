import {
  ChangeEvent as ReactChangeEvent,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getEasyLayout } from '../../utils/EasyLayout';
import styled from 'styled-components';
import { SYM } from '../../components/MaterialSymbol';
import { Form } from '../../components/Form';
import { UserMessage } from '../../../common/Types';
import marked from 'marked';

const { parse: parseMarkdown } = marked;

const LayoutBase = styled.div`
  flex: 1 0 auto;
  width: 100%;
  height: 100%;
  gap: 1em;
  overflow: hidden;
`;
const MessageItem = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: stretch;
  margin-bottom: 1em;
`;
const MessageText = styled.div`
  padding-top: 0.5em;
`;
const {
  layout: Layout,
  areas: { Chat, Reply },
} = getEasyLayout(LayoutBase)`
  chat, 12fr
  reply, 1fr
  \\ 1fr
`;
const ChatLayout = styled(Chat)`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  overflow: auto;

  & > :first-child {
    margin-top: auto;
  }
`;
const ReplyInput = styled.input.attrs((p) => ({
  className: 'reply-input',
}))`
  &.reply-input {
    flex: 1 0 auto;
    height: auto;
    margin-bottom: 0;
  }
`;

type MessageTextDisplayProps = PropsWithChildren;

const MessageTextDisplay: FC<MessageTextDisplayProps> = ({ children }: MessageTextDisplayProps) => {
  const renderedHTML = useMemo(() => (typeof children === 'string' ? parseMarkdown(children) : undefined), [children]);

  return renderedHTML ? (
    <MessageText
      dangerouslySetInnerHTML={{
        __html: renderedHTML,
      }}
    />
  ) : (
    <MessageText>{children}</MessageText>
  );
};

export type InterviewChatFormProps = PropsWithChildren<{
  messagesLoading?: boolean;
  messages: UserMessage[];
  onAddMessage: (message: string) => void;
}>;

export const InterviewChatForm: FC<InterviewChatFormProps> = ({
  messagesLoading = false,
  messages = [],
  onAddMessage,
}: InterviewChatFormProps) => {
  const chatLayoutRef = useRef<HTMLDivElement>(null);
  const [alwaysShowLatest, setAlwaysShowLatest] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const onMessageChange = useCallback(
    ({ target: { value: newMessage = '' } }: ReactChangeEvent<HTMLInputElement>) => setNewMessage(newMessage),
    [setNewMessage]
  );
  const onSubmit = useCallback(() => {
    if (newMessage) {
      onAddMessage?.(newMessage);
      setNewMessage('');
    }
  }, [onAddMessage, newMessage]);
  const toggleAlwaysShowLatest = useCallback(() => setAlwaysShowLatest((alwaysShowLatest) => !alwaysShowLatest), []);

  useEffect(() => {
    if (alwaysShowLatest && chatLayoutRef.current) {
      chatLayoutRef.current.scrollTop = chatLayoutRef.current.scrollHeight;
    }
  }, [messagesLoading, alwaysShowLatest]);

  return (
    <Layout>
      <ChatLayout
        {...({
          ref: chatLayoutRef,
        } as any)}
      >
        {messages.map((m, index) => {
          const { role = 'user', content = '' } = m;

          return (
            <MessageItem key={`MessageItem:${index}`}>
              <SYM
                style={{
                  margin: '0.5em',
                }}
              >
                {role === 'user' ? 'person' : 'memory'}
              </SYM>
              <MessageTextDisplay>{content}</MessageTextDisplay>
            </MessageItem>
          );
        })}
        {messagesLoading ? (
          <MessageItem>
            <SYM
              style={{
                margin: '0.5em',
              }}
            >
              memory
            </SYM>
            <MessageTextDisplay>
              <article aria-busy="true"></article>
            </MessageTextDisplay>
          </MessageItem>
        ) : undefined}
      </ChatLayout>
      <Reply>
        <Form role="group" onSubmit={onSubmit}>
          <button type="button" title="Always Show Latest" onClick={toggleAlwaysShowLatest}>
            <SYM
              style={{
                opacity: alwaysShowLatest ? 1 : 0.5,
              }}
            >
              vertical_align_bottom
            </SYM>
          </button>
          <ReplyInput type="text" value={newMessage} onChange={onMessageChange} />
          <button type="submit">
            <SYM>send</SYM>
          </button>
        </Form>
      </Reply>
    </Layout>
  );
};
