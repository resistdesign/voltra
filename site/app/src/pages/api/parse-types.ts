import type { APIRoute } from "astro";
import { getTypeInfoMapFromTypeScript } from "../../../../../src/common/TypeParsing/TypeParsing";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const source = body.source;

        if (!source || typeof source !== "string") {
            return new Response(JSON.stringify({ error: "Invalid source code provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Use Voltra's internal utility to parse the TypeScript code
        const typeInfoMap = getTypeInfoMapFromTypeScript(source);

        return new Response(JSON.stringify(typeInfoMap), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
