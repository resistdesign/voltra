export type InputProps<ElementType> = ElementType & {
  value: any;
  onChange: (value: any) => void;
};
