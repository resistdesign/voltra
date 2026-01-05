import styledBase from "styled-components";

export * from "styled-components";

const styled =
  typeof (styledBase as any).default === "function"
    ? (styledBase as any).default
    : (styledBase as any);

export default styled;
