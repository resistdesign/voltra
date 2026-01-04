import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-github";
import { AutoForm } from "../../../../../src/app/forms/ui";
import { parseSchema } from "../../../../../src/app/forms/schema";

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
        <div className="demo-grid">
            <div className="pane">
                <div className="pane-header">
                    <div>
                        TypeScript Interface <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#666' }}>(Exported types only)</span>
                    </div>
                    <button onClick={fetchTypes} disabled={loading}>
                        {loading ? "Parsing..." : "Update / Parse"}
                    </button>
                </div>
                <div className="editor-container">
                    <AceEditor
                        mode="typescript"
                        theme="github"
                        value={code}
                        onChange={setCode}
                        name="ts-editor"
                        editorProps={{ $blockScrolling: true }}
                        width="100%"
                        height="100%"
                        fontSize={14}
                    />
                </div>
                {error && <div style={{ color: "red", fontSize: "0.9rem" }}>{error}</div>}
            </div>

            <div className="pane">
                <div className="pane-header">
                    Generated Form
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        disabled={Object.keys(types).length === 0}
                    >
                        <option value="">Select Type...</option>
                        {Object.keys(types).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="preview-container">
                    {currentSchema ? (
                        <AutoForm
                            schema={currentSchema}
                            onSubmit={(vals) => console.log("Submitted:", vals)}
                            onValuesChange={setFormData}
                        />
                    ) : (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                            Parse code and select a type to generate form.
                        </div>
                    )}
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
                    <b>Live Data JSON:</b>
                    <pre>{JSON.stringify(formData, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
};
