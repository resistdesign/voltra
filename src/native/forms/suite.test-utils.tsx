/**
 * @packageDocumentation
 *
 * Test utilities for the default native form suite.
 */

import { createElement, type ReactElement, type ReactNode } from "react";
import { Platform } from "react-native";
import type { FieldKind, FieldRenderContext } from "../../app/forms/core";
import { nativeSuite } from "./suite";

const fieldKinds: FieldKind[] = [
  "string",
  "number",
  "boolean",
  "enum_select",
  "array",
  "relation_single",
  "relation_array",
  "custom_single",
  "custom_array",
];

type AnyProps = {
  children?: ReactNode;
  onClick?: () => void;
};

type AnyReactElement = ReactElement<AnyProps, any>;

const isElement = (node: ReactNode): node is AnyReactElement =>
  !!node && typeof node === "object" && "props" in node;

const resolveNode = (node: ReactNode): ReactNode => {
  if (!isElement(node)) {
    return node;
  }

  if (typeof node.type === "function") {
    const rendered = (node.type as any)(node.props);
    return resolveNode(rendered);
  }

  return node;
};

const getTextContent = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => getTextContent(resolveNode(child))).join("");
  }
  const resolvedNode = resolveNode(node);
  if (isElement(resolvedNode)) {
    return getTextContent(resolvedNode.props?.children);
  }
  return "";
};

const collectElements = (
  node: ReactNode,
  predicate: (element: AnyReactElement) => boolean,
  results: AnyReactElement[] = [],
) => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return results;
  }
  if (Array.isArray(node)) {
    node.forEach((child) =>
      collectElements(resolveNode(child), predicate, results),
    );
    return results;
  }
  const resolvedNode = resolveNode(node);
  if (!isElement(resolvedNode)) {
    return results;
  }
  const element = resolvedNode as AnyReactElement;
  if (predicate(element)) {
    results.push(element);
  }
  const children = element.props?.children;
  if (children !== undefined) {
    collectElements(children, predicate, results);
  }
  return results;
};

const findClickableByText = (node: ReactNode, text: string) => {
  const matches = collectElements(
    node,
    (element) =>
      typeof element.props?.onClick === "function" &&
      getTextContent(element).includes(text),
  );
  return matches[0];
};

/**
 * Ensure the native suite provides a renderer for every field kind.
 */
export const runNativeSuiteCompletenessScenario = () => {
  const missingKinds = fieldKinds.filter((kind) => !nativeSuite.renderers[kind]);
  return { missingKinds };
};

/**
 * Validate relation/custom button callbacks are wired through native suite renderers.
 */
export const runNativeSuiteActionWiringScenario = () => {
  let relationAction: string | null = null;
  let relationFullPaging: boolean | null = null;
  let customAction: string | null = null;
  let customType: string | null = null;

  const relationContext: FieldRenderContext<ReactElement> = {
    field: {
      type: "string",
      typeReference: "Car",
      array: false,
      readonly: false,
      optional: false,
      tags: { fullPaging: true },
    },
    fieldKey: "car",
    label: "Car",
    required: true,
    disabled: false,
    translateValidationErrorCode: (error) => String(error.code),
    value: undefined,
    onChange: () => undefined,
    onRelationAction: (payload) => {
      relationAction = payload.action;
      relationFullPaging = !!payload.fullPaging;
    },
    renderField: () => createElement("div"),
  };

  const relationElement = createElement(
    nativeSuite.renderers.relation_single as any,
    relationContext,
  );
  findClickableByText(relationElement, "Manage")?.props?.onClick?.();

  const customContext: FieldRenderContext<ReactElement> = {
    field: {
      type: "string",
      array: true,
      readonly: false,
      optional: false,
      tags: { customType: "Special" },
    },
    fieldKey: "attachments",
    label: "Attachments",
    required: false,
    disabled: false,
    translateValidationErrorCode: (error) => String(error.code),
    value: ["a"],
    onChange: () => undefined,
    onCustomTypeAction: (payload) => {
      customAction = payload.action;
      customType = payload.customType;
    },
    renderField: () => createElement("div"),
  };

  const customElement = createElement(
    nativeSuite.renderers.custom_array as any,
    customContext,
  );
  findClickableByText(customElement, "Add Item")?.props?.onClick?.();

  return {
    relationAction,
    relationFullPaging,
    customAction,
    customType,
  };
};

/**
 * Validate FormRoot web submit semantics in native suite primitives.
 */
export const runNativeSuiteFormRootWebSubmitScenario = () => {
  const originalOS = Platform.OS;
  (Platform as { OS: string }).OS = "web";

  let preventDefaultCalls = 0;
  let submitCalls = 0;

  const formRoot = nativeSuite.primitives?.FormRoot?.({
    children: createElement("div", undefined, "child"),
    onSubmit: () => {
      submitCalls += 1;
    },
  }) as any;

  formRoot.props.onSubmit({
    preventDefault: () => {
      preventDefaultCalls += 1;
    },
  });

  (Platform as { OS: string }).OS = originalOS;

  return {
    formTag: formRoot.type,
    preventDefaultCalls,
    submitCalls,
  };
};

