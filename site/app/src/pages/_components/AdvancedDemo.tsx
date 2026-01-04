import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-twilight";
import { AutoForm } from "../../../../../src/app/forms/UI";
import { parseSchema } from "../../../../../src/app/forms/Schema";

const DEFAULT_CODE = `
/**
 * User Profile
 * @label User Profile Form
 */
export type UserProfile = {
  /**
   * @label Full Name
   */
  name: string;

  /**
   * @label Email Address
   */
  email: string;

  /**
   * @label Age (Years)
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
   */
  tags: string[];
}
`;

export const AdvancedDemo = () => {
    const [code, setCode] = useState(DEFAULT_CODE);
    const [types, setTypes] = useState<any>({});
    const [selectedType, setSelectedType] = useState("");
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editorTheme, setEditorTheme] = useState("github");

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

    const fetchTypes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/parse-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ source: code }),
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setTypes(data);

            // Auto-select first type if none selected or current valid
            const typeNames = Object.keys(data);
            if (typeNames.length > 0) {
                if (!typeNames.includes(selectedType)) {
                    setSelectedType(typeNames[0]);
                }
            } else {
                setSelectedType("");
            }

        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchTypes();
    }, []);

    const currentSchema = selectedType && types[selectedType]
        ? parseSchema(types[selectedType])
        : null;

    return (
        <DemoGrid>
            <Pane>
                <PaneHeader>
                    <div>
                        TypeScript Interface <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#666' }}>(Exported types only)</span>
                    </div>
                    <Button onClick={fetchTypes} disabled={loading}>
                        {loading ? "Parsing..." : "Update / Parse"}
                    </Button>
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
                {error && <ErrorMessage>{error}</ErrorMessage>}
            </Pane>

            <Pane>
                <PaneHeader>
                    Generated Form
                    <Select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        disabled={Object.keys(types).length === 0}
                    >
                        <option value="">Select Type...</option>
                        {Object.keys(types).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </Select>
                </PaneHeader>
                <PreviewContainer>
                    {currentSchema ? (
                        <AutoForm
                            schema={currentSchema}
                            onSubmit={(vals) => console.log("Submitted:", vals)}
                            onValuesChange={setFormData}
                        />
                    ) : (
                        <EmptyState>
                            Parse code and select a type to generate form.
                        </EmptyState>
                    )}
                </PreviewContainer>
                <JSONPreview>
                    <b>Live Data JSON:</b>
                    <pre>{JSON.stringify(formData, null, 2)}</pre>
                </JSONPreview>
            </Pane>
        </DemoGrid>
    );
};

// Styled Components
import styled from "styled-components";

const DemoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 80vh;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: auto;
  }
`;

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--pico-card-background-color, #fff);
  padding: 1rem;
  border-radius: var(--pico-border-radius, 8px);
  box-shadow: var(--pico-card-box-shadow, 0 2px 8px rgba(0,0,0,0.05));
  border: 1px solid var(--pico-muted-border-color, #eee);
  overflow: hidden;
  min-height: 500px;
`;

const PaneHeader = styled.div`
  font-weight: 600;
  color: var(--pico-h1-color, #444);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EditorContainer = styled.div`
  flex: 1;
  border: 1px solid var(--pico-muted-border-color, #ddd);
  border-radius: 4px;
  overflow: hidden;
  min-height: 300px;
`;

const PreviewContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const Button = styled.button`
  /* Inherit Pico styles for buttons via class or vars, but here we keep custom structure using vars */
  background: var(--pico-primary-background);
  color: var(--pico-primary-inverse);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--pico-border-radius, 4px);
  cursor: pointer;
  font-weight: 500;
  transition: background-color var(--pico-transition);
  
  &:hover { background: var(--pico-primary-hover-background); }
  &:disabled { background: var(--pico-muted-border-color); cursor: not-allowed; }
`;

const Select = styled.select`
  padding: 0.5rem;
  border-radius: var(--pico-border-radius, 4px);
  border: 1px solid var(--pico-muted-border-color, #ccc);
  background-color: var(--pico-form-element-background-color);
  color: var(--pico-color);
  min-width: 150px;
`;

const ErrorMessage = styled.div`
  color: var(--pico-del-color, red);
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--pico-muted-color, #888);
`;

const JSONPreview = styled.div`
  margin-top: auto;
  border-top: 1px solid var(--pico-muted-border-color, #eee);
  padding-top: 1rem;
  
  pre {
    background: var(--pico-card-sectioning-background-color, #f1f3f5);
    padding: 1rem;
    border-radius: 4px;
    font-size: 0.85rem;
    overflow-x: auto;
    margin-top: 0.5rem;
    color: var(--pico-color);
  }
`;
