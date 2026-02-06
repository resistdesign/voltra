import { CSSProperties, FC, useMemo, useState } from "react";
import {
  getEasyLayoutTemplateDetails,
  getPascalCaseAreaName,
} from "../../../../src/app/utils";
import { makeNativeEasyLayout } from "../../../../src/native/utils";
import { getEasyLayout } from "../../../../src/web/utils";

const DEFAULT_TEMPLATE = `
header header, 64px
sidebar content, 1fr
footer footer, 48px
\\\\ 220px 1fr
`;

const areaBoxStyle: CSSProperties = {
  border: "1px solid var(--pico-muted-border-color)",
  borderRadius: "var(--pico-border-radius)",
  padding: "0.75rem",
  height: "100%",
};

const nativeViewport = {
  width: 720,
  height: 360,
  padding: 12,
  gap: 12,
};

export const EasyLayoutDemo: FC = () => {
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATE);
  const generated = useMemo(() => {
    try {
      const webDetails = getEasyLayoutTemplateDetails(template, {
        gap: nativeViewport.gap,
        padding: nativeViewport.padding,
      });
      const web = getEasyLayout(undefined, undefined, {
        gap: nativeViewport.gap,
        padding: nativeViewport.padding,
      })([template] as unknown as TemplateStringsArray);
      const native = makeNativeEasyLayout(template);

      return {
        webDetails,
        web,
        native,
        error: "",
      };
    } catch (error) {
      return {
        webDetails: null,
        web: null,
        native: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to parse layout template.",
      };
    }
  }, [template]);
  const nativeCoords = useMemo(() => {
    if (!generated.native) {
      return null;
    }

    try {
      return generated.native.computeNativeCoords(nativeViewport);
    } catch (error) {
      return null;
    }
  }, [generated?.native]);

  return (
    <section>
      <article>
        <h4>Template</h4>
        <textarea
          aria-label="EasyLayout template"
          name="easy-layout-template"
          rows={6}
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
        />
      </article>

      <div>
        <article>
          <h4>Web (CSS Grid)</h4>
          {generated.error || !generated.web ? (
            <pre>
              <code>{generated.error}</code>
            </pre>
          ) : (
            <generated.web.layout>
              {generated.webDetails?.areasList?.map((areaName) => {
                const areaComponentName = getPascalCaseAreaName(areaName);
                const Area = generated.web?.areas[areaComponentName];

                if (!Area) {
                  return null;
                }

                return (
                  <Area key={areaName}>
                    <div style={areaBoxStyle}>{areaName}</div>
                  </Area>
                );
              })}
            </generated.web.layout>
          )}
        </article>

        <article>
          <h4>Web (Generated CSS)</h4>
          <pre>
            <code>
              {generated.webDetails
                ? JSON.stringify(
                    {
                      areas: generated.webDetails.areasList,
                      css: generated.webDetails.css.trim(),
                    },
                    null,
                    2,
                  )
                : generated.error || "Unable to compute web details."}
            </code>
          </pre>
        </article>

        <article>
          <h4>Native (Computed Coords)</h4>
          <pre>
            <code>
              {nativeCoords
                ? JSON.stringify(nativeCoords, null, 2)
                : generated.error || "Unable to compute coordinates."}
            </code>
          </pre>
        </article>
      </div>
    </section>
  );
};
