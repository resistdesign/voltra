import { parseSchema } from "./index.js";

export const runSchemaParsingScenario = () => {
    const result1 = parseSchema({
        name: { type: "string", label: "Name" }
    });

    const result2 = parseSchema({
        age: { type: "number", required: true }
    });

    return {
        result1,
        result2
    };
};
