import { defer } from "../helpers";

import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

interface TurnstileCaptcha {
  component: React.ComponentType;
  getToken(): Promise<string>;
}

const loadPromise = defer<void>();

// Wait until Turnstile script is added to page and
// replace it's callback to know when it's ready
export function hookTurnstile() {
  const script = document.querySelector<HTMLScriptElement>(
    "script#cf-turnstile-script__cf-turnstile",
  );
  if (!script || script.dataset.faceitToLeetifyHooked === "true") {
    return;
  }

  const queryParams = new URLSearchParams(script.src.split("?")[1]);
  const onloadName = queryParams.get("onload");
  if (!onloadName) {
    console.warn("Could not hook into Turnstile");
    return;
  }

  const originalOnload = window[onloadName];
  window[onloadName] = (...args: any) => {
    loadPromise.resolve();
    originalOnload(...args);
  };

  script.dataset.faceitToLeetifyHooked = "true";
}

export default function useTurnstile(id: string): TurnstileCaptcha {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string>();
  const turnstileSiteKeyPromiseRef = useRef(defer<void>());

  const getToken = useCallback(async () => {
    // Wait for Turnstile to load
    await turnstileSiteKeyPromiseRef.current;
    await loadPromise;
    // Force our instance to be marked as loaded
    flushSync(() => {
      window[`onloadTurnstileCallback__faceit-to-leetify-turnstile__${id}`]();
    });
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Execute the Turnstile challenge
    turnstileRef.current?.execute();
    const token = await turnstileRef.current?.getResponsePromise();
    if (!token) {
      throw new Error("Unable to complete Turnstile");
    }

    return token;
  }, [id]);

  // Extract site key from bundle
  useEffect(() => {
    (async () => {
      const faceitMainScript = [...document.querySelectorAll("script")].find(
        (script) =>
          /https:\/\/cdn-frontend\.faceit-cdn\.net\/web\/static\/js\/main\.(.+)\.js/.test(
            script.src,
          ),
      );
      if (!faceitMainScript) {
        throw new Error("Could not find FACEIT main script");
      }

      const response = await fetch(faceitMainScript.src);
      if (!response.ok) {
        console.error("FACEIT main script response:", await response.text());
        throw new Error("Could not read FACEIT main script");
      }
      const text = await response.text();

      const siteKey = /"TURNSTILE":{"SITEKEY":"(.*?)"}/.exec(text)?.[1];
      if (!siteKey) {
        throw new Error("Could not find Turnstile site key from main script");
      }

      setTurnstileSiteKey(siteKey);
    })();
  });

  // Resolve Turnstile loaded after it's been rendered
  useEffect(() => {
    if (turnstileSiteKey) {
      setTimeout(() => {
        turnstileSiteKeyPromiseRef.current.resolve();
      });
    }
  }, [turnstileSiteKey]);

  const component = useCallback(
    () =>
      turnstileSiteKey && (
        <>
          {/* Force script to be "loaded" */}
          <script id={`faceit-to-leetify__${id}__cf-turnstile-script`} />

          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            id={`faceit-to-leetify-turnstile__${id}`}
            options={{
              size: "invisible",
              action: "matchroomFinished_downloadDemos",
              execution: "execute",
            }}
            scriptOptions={{
              id: `faceit-to-leetify__${id}__cf-turnstile-script`,
            }}
            injectScript={false}
          />
        </>
      ),
    [turnstileSiteKey],
  );

  return useMemo(
    () => ({
      component,
      getToken,
    }),
    [component, getToken],
  );
}
