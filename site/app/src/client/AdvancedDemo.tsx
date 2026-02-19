import {
  type ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-twilight";
import { AutoFormView as SharedAutoFormView } from "../../../../src/app/forms/UI";
import {
  CustomTypeAction,
  type CustomTypeActionPayload,
  RelationAction,
  useFormEngine,
} from "../../../../src/app/forms";
import type {
  TypeInfo,
  TypeInfoMap,
} from "../../../../src/common/TypeParsing/TypeInfo";
import styled from "styled-components";
import { getTypeInfoMapFromTypeScript } from "../../../../src/build";
import { createWebFormRenderer } from "../../../../src/web/forms";
import { customComponentSuite } from "./AdvancedDemo/CustomComponentSuite";

const DEFAULT_CODE = `
/**
 * Internal
 * */
type PersistableItem = {
  /**
   * @label User ID
   * @primaryField
   * @hidden
   */
  readonly id: string;
};

/**
 * User Profile
 * @label User Profile Form
 */
export type UserProfile = PersistableItem & {
  /**
   * @label Full Name
   */
  name: string;

  /**
   * @label Email Address
   * @format email
   */
  email?: string;

  /**
   * @label Age (Years)
   * @constraints.min 1
   * @constraints.max 120
   * @constraints.step 1
   */
  age: number;

  /**
   * @label Is Active?
   */
  isActive: boolean;

  /**
    * @label Role
    */
  role: "admin" | "user" | "guest";

  /**
   * @label Department
   * @allowCustomSelection
   */
  department: "Sales" | "Engineering" | "Marketing";
  
  /**
   * @label Tags
   * @constraints.defaultValue ["news","updates"]
   */
  tags: string[];

  /**
   * @label Profile Image
   * @customType FileUpload
   */
  profileImage?: string;

  /**
   * @label Attachments
   * @customType FileAttachment
   */
  attachments?: string[];

  /**
   * @label Department Record
   */
  departmentRecord?: Department;

  /**
   * @label Team
   */
  team?: Department[];

  /**
   * @hidden
   */
  internalNotes?: string;
}

/**
 * @label Department
 */
export type Department = PersistableItem & {
  /**
   * @label Name
   */
  name: string;
}
`;

export const AdvancedDemo = () => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [types, setTypes] = useState<any>({});
  const [selectedType, setSelectedType] = useState("");
  const [editorTheme, setEditorTheme] = useState("github");
  const [useCustomSuite, setUseCustomSuite] = useState(false);
  const handleToggleCustomSuite = useCallback(() => {
    setUseCustomSuite((value) => !value);
  }, []);
  const handleSelectedTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelectedType(event.target.value);
    },
    [],
  );
  const getTypeInfo = useCallback(() => {
    try {
      const types: TypeInfoMap = getTypeInfoMapFromTypeScript(code);

      setTypes(types);

      // Auto-select first type if none selected or current valid
      const typeNames = Object.keys(types);
      if (typeNames.length > 0) {
        if (!typeNames.includes(selectedType)) {
          setSelectedType(typeNames[0]);
        }
      } else {
        setSelectedType("");
      }
    } catch (error) {
      setTypes({});
      setSelectedType("");
    }
  }, [code]);

  useEffect(() => {
    // Check system preference
    const matchDark = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setEditorTheme(e.matches ? "twilight" : "github");
    };

    updateTheme(matchDark); // Initial check

    matchDark.addEventListener("change", updateTheme);
    return () => matchDark.removeEventListener("change", updateTheme);
  }, []);

  // Initial load
  useEffect(() => {
    getTypeInfo();
  }, []);

  const currentTypeInfo =
    selectedType && types[selectedType] ? types[selectedType] : null;

  const defaultRenderer = useMemo(() => createWebFormRenderer(), []);
  const customRenderer = useMemo(
    () =>
      createWebFormRenderer({
        suite: customComponentSuite,
      }),
    [],
  );

  const FormPreview = ({
    typeInfo,
    useCustomSuite,
  }: {
    typeInfo: TypeInfo;
    useCustomSuite: boolean;
  }) => {
    const controller = useFormEngine({}, typeInfo);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [lastActionType, setLastActionType] = useState<
      CustomTypeAction | RelationAction
    >("open");
    const renderer = useCustomSuite ? customRenderer : defaultRenderer;

    const handleNoopSubmit = useCallback(() => {}, []);

    const handleRelationAction = useCallback(
      ({
        action,
        fieldKey,
      }: {
        action: RelationAction;
        fieldKey: string;
      }) => {
        setLastAction(`Relation ${action} on ${fieldKey}`);
        setLastActionType(action);
      },
      [],
    );

    const handleCustomTypeAction = useCallback(
      ({
        action,
        fieldKey,
        customType,
        value,
        index,
        field,
        onChange,
      }: CustomTypeActionPayload) => {
        setLastAction(`Custom ${customType} ${action} on ${fieldKey}`);
        setLastActionType(action);

        if (action === "add") {
          const nextItem = `${customType} item`;
          if (field.array) {
            const current = Array.isArray(value) ? value : [];
            onChange([...current, nextItem]);
          } else {
            onChange(nextItem);
          }
          return;
        }

        if (action === "remove") {
          if (field.array) {
            const next = [...(Array.isArray(value) ? value : [])];
            if (typeof index === "number") {
              next.splice(index, 1);
              onChange(next);
            }
          } else {
            onChange(null);
          }
        }
      },
      [],
    );

    const handleClearLastAction = useCallback(() => {
      setLastAction(null);
    }, []);

    return (
      <>
        <SuiteStatus>
          {useCustomSuite
            ? "Custom component suite enabled."
            : "Default component suite enabled."}
        </SuiteStatus>
        <SharedAutoFormView
          controller={controller}
          onSubmit={handleNoopSubmit}
          renderer={renderer}
          onRelationAction={handleRelationAction}
          onCustomTypeAction={handleCustomTypeAction}
        />
        {lastAction && (
          <Alert
            type={lastActionType}
            message={`Last action: ${lastAction}`}
            onClose={handleClearLastAction}
          />
        )}
        <JSONPreview>
          <b>Live Data JSON:</b>
          <pre>{JSON.stringify(controller.values, null, 2)}</pre>
        </JSONPreview>
        <ControllerExample>
          <b>Controller Usage (React):</b>
          <ControllerCode>
            {`const controller = useFormEngine(initialValues, typeInfo);

return (
  <AutoFormView controller={controller} onSubmit={handleSubmit} />
);`}
          </ControllerCode>
        </ControllerExample>
        <ControllerExample>
          <b>Relation Handler (React):</b>
          <ControllerCode>
            {`const handleRelationAction = ({ action, fieldKey }) => {
  console.log(action, fieldKey);
  // Use action to open a picker, create related items, etc.
};

return (
  <AutoFormView
    controller={controller}
    onSubmit={handleSubmit}
    onRelationAction={handleRelationAction}
  />
);`}
          </ControllerCode>
        </ControllerExample>
        <ControllerExample>
          <b>Custom Type Handler (React):</b>
          <ControllerCode>
            {`const handleCustomTypeAction = ({ action, fieldKey, customType }) => {
  console.log(customType, action, fieldKey);
  // Route to a custom editor or upload flow.
};

return (
  <AutoFormView
    controller={controller}
    onSubmit={handleSubmit}
    onCustomTypeAction={handleCustomTypeAction}
  />
);`}
          </ControllerCode>
        </ControllerExample>
      </>
    );
  };

  return (
    <DemoGrid>
      <Pane>
        <PaneHeader>
          <div>
            TypeScript Interface{" "}
            <span
              style={{ fontSize: "0.8em", fontWeight: "normal", color: "#666" }}
            >
              (Exported types only)
            </span>
          </div>
          <button onClick={getTypeInfo}>Update / Parse</button>
        </PaneHeader>
        <EditorContainer>
          <AceEditor
            mode="typescript"
            theme={editorTheme}
            value={code}
            onChange={setCode}
            name="ts-editor"
            editorProps={{ $blockScrolling: true }}
            width="100%"
            height="100%"
            fontSize={14}
          />
        </EditorContainer>
      </Pane>

      <Pane>
        <PaneHeader>
          <div>Generated Form</div>
          <PaneControls>
            <button
              type="button"
              className={useCustomSuite ? "secondary" : undefined}
              aria-pressed={useCustomSuite}
              onClick={handleToggleCustomSuite}
            >
              Custom Component Suite
            </button>
            <select
              value={selectedType}
              onChange={handleSelectedTypeChange}
              disabled={Object.keys(types).length === 0}
            >
              <option value="">Select Type...</option>
              {Object.keys(types).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </PaneControls>
        </PaneHeader>
        <PreviewContainer>
          {currentTypeInfo ? (
            <FormPreview
              typeInfo={currentTypeInfo}
              useCustomSuite={useCustomSuite}
              key={`${selectedType}-${useCustomSuite ? "custom" : "default"}`}
            />
          ) : (
            <EmptyState>
              Parse code and select a type to generate form.
            </EmptyState>
          )}
        </PreviewContainer>
      </Pane>
    </DemoGrid>
  );
};

const DemoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const Pane = styled.article`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
  min-height: 500px;
`;

const PaneHeader = styled.div`
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
`;

const PaneControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const EditorContainer = styled.div`
  flex: 1;
  overflow: hidden;
  min-height: 300px;
`;

const PreviewContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
`;

const JSONPreview = styled.div`
  margin-top: auto;
  padding-top: 1rem;

  pre {
    padding: 1rem;
    border-radius: 4px;
    font-size: 0.85rem;
    overflow-x: auto;
    margin-top: 0.5rem;
  }
`;

const ControllerExample = styled.div`
  padding-top: 1rem;
`;

const ControllerCode = styled.pre`
  padding: 1rem;
  font-size: 0.85rem;
  overflow-x: auto;
  margin-top: 0.5rem;
`;

const SuiteStatus = styled.small`
  display: block;
  margin-bottom: 0.75rem;
  color: #475569;
  font-size: 0.85rem;
`;

const ALERT_COLORS: Record<
  CustomTypeAction | RelationAction,
  { background: string; text: string }
> = {
  add: {
    background: "#10b981",
    text: "#ffffff",
  },
  remove: {
    background: "#ef4444",
    text: "#ffffff",
  },
  edit: {
    background: "#f59e0b",
    text: "#ffffff",
  },
  open: {
    background: "#3b82f6",
    text: "#ffffff",
  },
};

const StyledAlert = styled.div<{ type: keyof typeof ALERT_COLORS }>`
  position: relative;
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid transparent;
  background-color: ${(props) =>
    ALERT_COLORS[props.type]?.background || ALERT_COLORS.open.background};
  color: ${(props) => ALERT_COLORS[props.type]?.text || ALERT_COLORS.open.text};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.5em;
  line-height: 0.5em;
`;

type AlertProps = {
  type: CustomTypeAction | RelationAction;
  message: string;
  onClose: () => void;
};

const Alert: FC<AlertProps> = ({ message, type, onClose }) => {
  return (
    <StyledAlert type={type}>
      {message}
      <CloseButton onClick={onClose}>
        &times; {/* This is an 'x' character for the close button */}
      </CloseButton>
    </StyledAlert>
  );
};
