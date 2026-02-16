import type { FormEvent, ReactElement } from "react";
import styled from "styled-components";
import type { ComponentSuite, FieldRenderContext } from "../../../../../src/app/forms";
import { webSuite } from "../../../../../src/web/forms/suite";

const SUITE_LABELS = {
  string: "String",
  number: "Number",
  boolean: "Boolean",
  enum_select: "Enum Select",
  array: "Array",
  relation_single: "Relation Single",
  relation_array: "Relation Array",
  custom_single: "Custom Single",
  custom_array: "Custom Array",
} as const;

type SuiteKind = keyof typeof SUITE_LABELS;

const createCustomRenderer =
  (
    kind: SuiteKind,
  ): ((context: FieldRenderContext<ReactElement>) => ReactElement) =>
  (context) => {
    const renderer = webSuite.renderers[kind];
    if (!renderer) {
      return (
        <FieldFrame data-kind={kind}>
          <FieldKindLabel>{SUITE_LABELS[kind]}</FieldKindLabel>
          <div>Renderer unavailable.</div>
        </FieldFrame>
      );
    }

    return (
      <FieldFrame data-kind={kind}>
        <FieldKindLabel>{SUITE_LABELS[kind]}</FieldKindLabel>
        {renderer(context)}
      </FieldFrame>
    );
  };

export const customComponentSuite: ComponentSuite<ReactElement> = {
  primitives: {
    FormRoot: ({ children, onSubmit }) => {
      const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit?.();
      };

      return <CustomFormRoot onSubmit={handleSubmit}>{children}</CustomFormRoot>;
    },
    Button: ({ children, disabled, type, onClick, "data-signifier": dataSignifier }) => (
      <button
        className="secondary outline"
        type={type ?? "button"}
        disabled={disabled}
        onClick={type === "submit" ? undefined : onClick}
        data-signifier={dataSignifier}
      >
        {children}
      </button>
    ),
  },
  renderers: {
    string: createCustomRenderer("string"),
    number: createCustomRenderer("number"),
    boolean: createCustomRenderer("boolean"),
    enum_select: createCustomRenderer("enum_select"),
    array: createCustomRenderer("array"),
    relation_single: createCustomRenderer("relation_single"),
    relation_array: createCustomRenderer("relation_array"),
    custom_single: createCustomRenderer("custom_single"),
    custom_array: createCustomRenderer("custom_array"),
  },
};

const CustomFormRoot = styled.form`
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.85rem;
`;

const FieldFrame = styled.div`
  border-left: 3px solid #0891b2;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.55rem;
  transition: background-color 120ms ease, transform 120ms ease;

  &:hover {
    background-color: #f8fafc;
    transform: translateX(1px);
  }
`;

const FieldKindLabel = styled.div`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #0369a1;
  margin-bottom: 0.35rem;
`;
