/**
 * @packageDocumentation
 *
 * Tier 2 UI components: AutoForm, AutoField.
 */

import React, { FC, FormEvent } from "react";
import {
    FieldMetadata,
    FormMetadata,
    AutoFieldProps,
} from "../types.js";
import { useFormEngine } from "../engine/index.js";
import {
    FieldWrapper,
    Label,
    Input,
    Select,
    CheckboxWrapper,
    ErrorMessage,
    Button,
    ArrayContainer,
    ArrayItemWrapper,
} from "../primitives/index.js";

import styled from "styled-components";

// Use function syntax for better ecosystem compatibility
const FormContainer = styled("form")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 8px;
`;

const SubmitButton = styled("button")`
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  
  &:hover {
    background-color: #0056b3;
  }
`;

export const AutoField: FC<AutoFieldProps> = ({
    metadata,
    value,
    onChange,
    error,
}) => {
    const { key, label, type, required, allowedValues } = metadata;
    const id = `field-${key}`;

    return (
        <FieldWrapper>
            {type !== "boolean" && (
                <Label htmlFor={id} >
                    {label} {required && "*"}
                </Label>
            )}

            {
                type === "string" && !allowedValues && (
                    <Input
                        id={id}
                        value={value || ""
                        }
                        onChange={(e) => onChange(e.target.value)}
                    />
                )}

            {
                type === "number" && (
                    <Input
                        id={id}
                        type="number"
                        value={value || ""
                        }
                        onChange={(e) => onChange(Number(e.target.value))}
                    />
                )}

            {
                type === "boolean" && (
                    <CheckboxWrapper>
                        <Input
                            id={id}
                            type="checkbox"
                            checked={!!value
                            }
                            onChange={(e) => onChange(e.target.checked)}
                        />
                        < Label htmlFor={id} > {label} </Label>
                    </CheckboxWrapper>
                )}

            {(type === "string" || type === "number") && allowedValues && metadata.allowCustom && (
                <>
                    <Input
                        id={id}
                        list={`list-${id}`}
                        value={value || ""}
                        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder="Select or type..."
                    />
                    <datalist id={`list-${id}`}>
                        {allowedValues.map((val) => (
                            <option key={val} value={val} />
                        ))}
                    </datalist>
                </>
            )}

            {(type === "string" || type === "number") && allowedValues && !metadata.allowCustom && (
                <Select
                    id={id}
                    value={value || ""
                    }
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="" > Select...</option>
                    {
                        allowedValues.map((val) => (
                            <option key={val} value={val} >
                                {val}
                            </option>
                        ))
                    }
                </Select>
            )}

            {type === "array" && metadata.itemMetadata && (
                <ArrayContainer>
                    {(Array.isArray(value) ? value : []).map((item, index) => (
                        <ArrayItemWrapper key={index}>
                            <div style={{ flex: 1 }}>
                                <AutoField
                                    metadata={metadata.itemMetadata!}
                                    value={item}
                                    onChange={(newItem) => {
                                        const newValue = [...(value || [])];
                                        newValue[index] = newItem;
                                        onChange(newValue);
                                    }}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={() => {
                                    const newValue = [...(value || [])];
                                    newValue.splice(index, 1);
                                    onChange(newValue);
                                }}
                            >
                                Remove
                            </Button>
                        </ArrayItemWrapper>
                    ))}
                    <Button
                        type="button"
                        onClick={() => {
                            const newValue = [...(value || [])];
                            // Default value based on item type
                            const newItem = metadata.itemMetadata?.type === 'number' ? 0 :
                                metadata.itemMetadata?.type === 'boolean' ? false : "";
                            newValue.push(newItem);
                            onChange(newValue);
                        }}
                    >
                        Add Item
                    </Button>
                </ArrayContainer>
            )}

            {error && <ErrorMessage>{error} </ErrorMessage>}
        </FieldWrapper>
    );
};

export interface AutoFormProps {
    schema: FormMetadata;
    onSubmit: (values: any) => void;
    initialValues?: any;
    onValuesChange?: (values: any) => void;
}

export const AutoForm: FC<AutoFormProps> = ({
    schema,
    onSubmit,
    initialValues,
    onValuesChange,
}) => {
    const { values, errors, setFieldValue, validate } = useFormEngine(
        initialValues,
        schema
    );

    React.useEffect(() => {
        if (onValuesChange) {
            onValuesChange(values);
        }
    }, [values, onValuesChange]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(values);
        }
    };

    return (
        <FormContainer onSubmit={handleSubmit}>
            {Object.values(schema.rootFields).map((field) => (
                <AutoField
                    key={field.key}
                    metadata={field}
                    value={values[field.key]}
                    onChange={(val) => setFieldValue(field.key, val)}
                    error={errors[field.key]}
                />
            ))}
            <SubmitButton type="submit">Submit</SubmitButton>
        </FormContainer>
    );
};
