import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  getTagValue,
  getTagValues,
  getTypeStructureByName,
  getTypeStructureByPath,
  getTypeStructureWithFilteredContent,
  getValueLabel,
  TAG_TYPES,
  TypeStructure,
  TypeStructureMap,
} from './TypeParsing/TypeUtils';
import { Input } from './Input';
import { Form } from './Form';
import { NavigateBackHandler, NavigateToHandler } from './Navigation';
import HashMatrix from './ValueProcessing/HashMatrix';
import {
  getLayoutContainerCSS,
  getTypeStructureLayoutGridTemplate,
  LayoutBox,
  LayoutContainerProps,
  LayoutControls,
} from './Layout';
import styled, { css } from 'styled-components';
import { DataTypeMap } from './HelperTypes';

const LayoutForm = styled(Form)<LayoutContainerProps>`
  ${(p) => getLayoutContainerCSS(p)}
`;

type OpenFormButtonBaseProps = {
  $gridArea?: string;
};

const OpenFormButtonBase = styled.button<OpenFormButtonBaseProps>`
  ${(p) =>
    p.$gridArea
      ? css`
          grid-area: ${p.$gridArea};
        `
      : ''}
`;

type OpenFormButtonProps = {
  disabled?: boolean;
  name: string;
  label: string;
  onOpenForm: (name: string) => void;
};

const OpenFormButton: FC<OpenFormButtonProps> = ({ disabled = false, name, label, onOpenForm }) => {
  const onOpenFormInternal = useCallback(() => {
    onOpenForm(name);
  }, [name, onOpenForm]);

  return (
    <OpenFormButtonBase disabled={disabled} type="button" $gridArea={name} onClick={onOpenFormInternal}>
      Edit {label}
    </OpenFormButtonBase>
  );
};

export type TypeStructureComponentProps = {
  typeStructureMap: TypeStructureMap;
  typeStructure: TypeStructure;
  value: any;
  onChange: (name: string, value: any) => void;
  onNavigateToPath?: NavigateToHandler;
  onNavigateBack?: NavigateBackHandler;
  navigationPathPrefix?: string[];
  topLevel?: boolean;
  isEntryPoint?: boolean;
};

export const TypeStructureComponent: FC<TypeStructureComponentProps> = ({
  typeStructureMap,
  typeStructure,
  value,
  onChange,
  onNavigateToPath,
  onNavigateBack,
  navigationPathPrefix = [],
  topLevel = false,
  isEntryPoint = false,
}) => {
  const baseTypeStructure = useMemo(() => {
    const { type: typeStructureType = '' } = typeStructure;
    const topLevelTypeStructure = getTypeStructureByName(typeStructureType, typeStructureMap);

    return { ...topLevelTypeStructure, ...typeStructure };
  }, [typeStructureMap, typeStructure]);
  const isForm = useMemo(() => {
    const { content = [] } = baseTypeStructure;

    return content.length > 0;
  }, [baseTypeStructure]);
  const cleanTypeStructure = useMemo(() => {
    const { contentNames } = baseTypeStructure;

    return getTypeStructureWithFilteredContent(contentNames, baseTypeStructure);
  }, [baseTypeStructure]);
  const {
    name: typeStructureName = '',
    type: typeStructureType,
    content: typeStructureContent = [],
    readonly = false,
  } = cleanTypeStructure;
  const {
    [TAG_TYPES.label]: typeStructureLabel = undefined,
    [TAG_TYPES.layout]: typeStructureLayout = undefined,
    [TAG_TYPES.options]: typeStructureOptionsString = undefined,
    [TAG_TYPES.optionsType]: typeStructureOptionsTypeName = undefined,
    [TAG_TYPES.allowCustomValue]: typeStructureAllowCustomValue = undefined,
  } = useMemo(
    () =>
      getTagValues(
        [
          TAG_TYPES.label,
          TAG_TYPES.inline,
          TAG_TYPES.layout,
          TAG_TYPES.options,
          TAG_TYPES.optionsType,
          TAG_TYPES.allowCustomValue,
        ],
        cleanTypeStructure
      ),
    [cleanTypeStructure]
  );
  const typeStructureOptions = useMemo(() => {
    if (typeof typeStructureOptionsString === 'string') {
      return (
        typeStructureOptionsString
          .split('\n')
          .map((l) => l.split(','))
          // @ts-ignore
          .flat()
          .map((l: string) => l.trim())
      );
    } else {
      return typeStructureOptionsTypeName && typeof typeStructureOptionsTypeName === 'string'
        ? getTypeStructureByName(typeStructureOptionsTypeName, typeStructureMap)
        : undefined;
    }
  }, [typeStructureOptionsString, typeStructureOptionsTypeName, typeStructureMap]);
  const hasTypeStructureLayout = useMemo(() => typeof typeStructureLayout === 'string', [typeStructureLayout]);
  const [internalValueBase, setInternalValue] = useState(value);
  const valueLastChanged = useMemo(() => new Date().getTime(), [value]);
  const internalValueLastChanged = useMemo(() => new Date().getTime(), [internalValueBase]);
  const internalValue = useMemo(
    () => (valueLastChanged > internalValueLastChanged ? value : internalValueBase),
    [value, internalValueBase, valueLastChanged, internalValueLastChanged]
  );
  const hasChanges = useMemo(() => internalValue !== value, [internalValue, value]);
  const submissionTypeName = useMemo(() => {
    return topLevel ? '' : typeStructureName;
  }, [topLevel, typeStructureName]);
  const onFormSubmit = useCallback(() => {
    onChange(submissionTypeName, internalValue);

    if (onNavigateBack) {
      onNavigateBack();
    }
  }, [topLevel, submissionTypeName, internalValue, onNavigateBack]);
  const onResetForm = useCallback(() => {
    setInternalValue(value);
  }, [value]);
  const onCancelForm = useCallback(() => {
    if (onNavigateBack) {
      onNavigateBack();
    }
  }, [onNavigateBack]);
  const onPrimitiveChangeInternal = useCallback(
    (_n: string, v: any) => {
      setInternalValue(v);
    },
    [setInternalValue]
  );
  const onPropertyChange = useCallback(
    (n: string, v: any) => {
      const newValue = {
        ...internalValue,
        [n]: v,
      };

      setInternalValue(newValue);

      if (!topLevel || isEntryPoint) {
        onChange(submissionTypeName, newValue);
      }
    },
    [internalValue, setInternalValue, topLevel, isEntryPoint, onChange, submissionTypeName]
  );
  const onNavigateToPathInternal = useCallback(
    (path: string[] = []) => {
      if (onNavigateToPath) {
        const targetValue = new HashMatrix({ hashMatrix: internalValue }).getPath(path);
        const targetTypeStructure = getTypeStructureByPath(path, cleanTypeStructure, typeStructureMap);
        const { multiple: ttsMultiple } = targetTypeStructure;
        const targetLabel = getTagValue(TAG_TYPES.label, targetTypeStructure);
        const cleanTargetLabel = typeof targetLabel === 'string' ? targetLabel : '';

        onNavigateToPath({
          label: ttsMultiple ? cleanTargetLabel : getValueLabel(targetValue, targetTypeStructure, typeStructureMap),
          path: [...navigationPathPrefix, ...path],
        });
      }
    },
    [onNavigateToPath, navigationPathPrefix, internalValue, cleanTypeStructure, typeStructureMap]
  );
  const onOpenForm = useCallback(
    (name: string) => {
      onNavigateToPathInternal([name]);
    },
    [onNavigateToPathInternal]
  );
  const FormComp: FC = topLevel ? LayoutForm : LayoutBox;
  const formProps = useMemo(() => {
    return {
      ...(topLevel ? { onSubmit: onFormSubmit } : {}),
      $gridArea: !topLevel ? typeStructureName : undefined,
    };
  }, [topLevel, onFormSubmit, topLevel, typeStructureName]);
  const layoutBoxProps = useMemo(() => {
    return {
      $isGrid: hasTypeStructureLayout,
      $gridTemplate: getTypeStructureLayoutGridTemplate(typeStructureLayout, topLevel),
    };
  }, [hasTypeStructureLayout, typeStructureLayout, topLevel]);
  const controls = useMemo(() => {
    return (
      <>
        {topLevel && !isEntryPoint && hasChanges ? (
          <LayoutControls>
            <button
              style={{
                flex: '1 0 auto',
                width: 'auto',
              }}
              type="button"
              onClick={onCancelForm}
            >
              Cancel
            </button>
            <button
              style={{
                flex: '1 0 auto',
                width: 'auto',
              }}
              type="button"
              onClick={onResetForm}
            >
              Reset
            </button>
            <button
              style={{
                flex: '1 0 auto',
                width: 'auto',
              }}
              type="submit"
            >
              Submit
            </button>
          </LayoutControls>
        ) : undefined}
        {topLevel && !isEntryPoint && !hasChanges ? (
          <LayoutControls>
            <button
              style={{
                flex: '1 0 auto',
                width: 'auto',
              }}
              type="button"
              onClick={onCancelForm}
            >
              Done
            </button>
          </LayoutControls>
        ) : undefined}
      </>
    );
  }, [topLevel, isEntryPoint, hasChanges, onCancelForm, onResetForm, onFormSubmit]);

  if (isForm) {
    return (
      <FormComp {...(formProps as any)} $allowShrink={topLevel}>
        <LayoutBox $allowShrink={topLevel}>
          <LayoutBox {...(layoutBoxProps as any)} $allowShrink={false}>
            {typeStructureContent.map((tS) => {
              const { name: tSName, literal: tSLiteral = false, type: tSType, multiple: tSMultiple } = tS;
              const { [TAG_TYPES.inline]: tSInline, [TAG_TYPES.label]: tSLabel } = getTagValues(
                [TAG_TYPES.inline, TAG_TYPES.label],
                tS
              );
              const inputLabel = typeof tSLabel === 'string' ? tSLabel : tSName;
              const tSTypeIsTypeStructure = typeof tSType === 'string' && !!typeStructureMap[tSType];
              const useInputType = !tSTypeIsTypeStructure;
              const isHelperType = tSType in DataTypeMap;

              if (!tSMultiple && (isHelperType || tSLiteral || tSInline || useInputType)) {
                return (
                  <TypeStructureComponent
                    key={tSName}
                    typeStructureMap={typeStructureMap}
                    typeStructure={tS}
                    value={internalValue?.[tSName]}
                    onChange={onPropertyChange}
                    onNavigateToPath={onNavigateToPath}
                    navigationPathPrefix={[tSName]}
                  />
                );
              } else {
                return (
                  <OpenFormButton
                    key={tSName}
                    disabled={hasChanges}
                    name={tSName}
                    label={inputLabel}
                    onOpenForm={onOpenForm}
                  />
                );
              }
            })}
          </LayoutBox>
        </LayoutBox>
        {controls}
      </FormComp>
    );
  } else {
    const inputComp = (
      <Input
        key={typeStructureName}
        name={typeStructureName}
        label={`${typeStructureLabel ?? ''}`}
        value={topLevel ? internalValue : value}
        type={typeStructureType}
        onChange={topLevel ? onPrimitiveChangeInternal : onChange}
        options={typeStructureOptions}
        allowCustomValue={!!typeStructureAllowCustomValue}
        readonly={readonly}
      />
    );

    return topLevel ? (
      <LayoutForm $allowShrink={false} onSubmit={onFormSubmit}>
        {inputComp}
        {controls}
      </LayoutForm>
    ) : (
      inputComp
    );
  }
};
