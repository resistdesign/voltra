import { CSSProperties, FC, useMemo, useState } from "react";
import {
  ComponentMap,
  getEasyLayoutTemplateDetails,
  getPascalCaseAreaName,
} from "../../../../src/app/utils";
import { makeNativeEasyLayout } from "../../../../src/native/utils/EasyLayout";
import { getEasyLayout } from "../../../../src/web/utils";

const DEFAULT_TEMPLATE = `
header header header, 64px
sidebar content right, 1fr
footer footer right, 48px
\\\\ 320px 4fr 1fr
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
  const {
    web: { layout: WebLayout, areas = {} as ComponentMap } = {},
    native,
    error,
    webDetails,
  } = useMemo(() => {
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
        web: {
          layout: undefined,
          areas: undefined,
        },
        native: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to parse layout template.",
      };
    }
  }, [template]);
  const nativeCoords = useMemo(() => {
    if (!native) {
      return null;
    }

    try {
      return native.computeNativeCoords(nativeViewport);
    } catch (error) {
      return null;
    }
  }, [native]);

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
          {error || !WebLayout ? (
            <pre>
              <code>{error}</code>
            </pre>
          ) : (
            <WebLayout>
              {webDetails?.areasList?.map((areaName) => {
                const areaComponentName = getPascalCaseAreaName(areaName);
                const Area = areas[areaComponentName];

                if (!Area) {
                  return null;
                }

                return (
                  <Area key={areaName}>
                    <div style={areaBoxStyle}>{areaName}</div>
                  </Area>
                );
              })}
            </WebLayout>
          )}
        </article>

        <article>
          <h4>Web (Generated CSS)</h4>
          <pre>
            <code>
              {webDetails
                ? JSON.stringify(
                    {
                      areas: webDetails.areasList,
                      css: webDetails.css.trim(),
                    },
                    null,
                    2,
                  )
                : error || "Unable to compute web details."}
            </code>
          </pre>
        </article>

        <article>
          <h4>Native (Computed Coords)</h4>
          <pre>
            <code>
              {nativeCoords
                ? JSON.stringify(nativeCoords, null, 2)
                : error || "Unable to compute coordinates."}
            </code>
          </pre>
        </article>
      </div>
    </section>
  );
};
