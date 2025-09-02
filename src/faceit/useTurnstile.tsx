import { defer, retry } from "../helpers";

import React, { useCallback, useEffect, useMemo, useRef } from "react";

interface TurnstileCaptcha {
  component: React.ComponentType;
  getToken(): Promise<string>;
}

export default function useTurnstile(id: string): TurnstileCaptcha {
  const widgetId = `faceit-to-leetify__turnstile__${id}`;
  const turnstileSiteKeyPromiseRef = useRef(defer<string>());
  const siteKeySearchedRef = useRef(false);

  const getToken = useCallback(async () => {
    const siteKey = await turnstileSiteKeyPromiseRef.current;
    // Wait up to 3s for Turnstile to load (reduced from 10s)
    await retry(
      () => {
        if (!window.turnstile) {
          throw new Error("Could not find Turnstile loaded");
        }
      },
      30, // 30 attempts instead of 100
      100, // 100ms interval = max 3s total
    );

    return new Promise<string>((resolve) => {
      window.turnstile!.render(`#${widgetId}`, {
        sitekey: siteKey,
        callback: (token) => {
          resolve(token);
        },
      });
    });
  }, [id]);

  // Extract site key from bundle (only once)
  useEffect(() => {
    if (siteKeySearchedRef.current) return;
    siteKeySearchedRef.current = true;
    
    (async () => {
      const faceitMainScript = [...document.querySelectorAll("script")].find(
        (script) =>
          /https:\/\/cdn-frontend\.faceit-cdn\.net\/web-next\/_next\/static\/chunks\/pages\/_app-[a-z0-9]+\.min\.js/.test(
            script.src,
          ),
      );

      // FACEIT doesn't use dedicated captcha scripts anymore, search all chunk scripts
      const faceitChunkScripts = [...document.querySelectorAll("script")].filter(
        (script) =>
          /https:\/\/cdn-frontend\.faceit-cdn\.net\/web-next\/.*\/chunks\/[0-9]+.*\.min\.js/.test(script.src),
      );


      // Search all chunk scripts in parallel for performance
      
      const searchScript = async (chunkScript) => {
        try {
          const response = await fetch(chunkScript.src);
          if (!response.ok) return null;
          
          const text = await response.text();
          
          // Look for Turnstile site key patterns
          const patterns = [
            /\("(0x[a-zA-Z0-9]+)"\)/,
            /"(0x[a-zA-Z0-9]{16,})"/,
            /sitekey:\s*"(0x[a-zA-Z0-9]+)"/,
            /'(0x[a-zA-Z0-9]{16,})'/
          ];
          
          for (const pattern of patterns) {
            const match = pattern.exec(text);
            if (match) {
              const siteKey = match[1];
              if (siteKey !== '0xffffffffffffffff' && !siteKey.match(/^0x[f]+$/)) {
                return siteKey;
              }
            }
          }
          return null;
        } catch (error) {
          return null;
        }
      };

      // Create promises for all scripts
      const searchPromises = faceitChunkScripts.map(script => searchScript(script));
      
      // Wait for first valid result from parallel search
      const results = await Promise.allSettled(searchPromises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          turnstileSiteKeyPromiseRef.current.resolve(result.value);
          return;
        }
      }

      // Fallback to main script if chunk scripts fail
      if (faceitMainScript) {
        const response = await fetch(faceitMainScript.src);
        if (!response.ok) {
          console.error("FACEIT main script response:", await response.text());
          throw new Error("Could not read FACEIT main script");
        }
        const text = await response.text();

        // Try multiple patterns for site key extraction
        let siteKey = /"TURNSTILE":{"SITEKEY":"(.*?)"}/.exec(text)?.[1];
        
        if (!siteKey) {
          // Try alternative patterns
          siteKey = /sitekey:"(0x[a-zA-Z0-9]+)"/.exec(text)?.[1];
        }
        
        if (!siteKey) {
          siteKey = /"(0x[a-zA-Z0-9]+)"/.exec(text)?.[1];
        }
        
        if (!siteKey) {
          // Try to find any Turnstile key patterns (but skip dummy keys)
          const matches = text.match(/(0x[a-zA-Z0-9]{16,})/g);
          if (matches && matches.length > 0) {
            // Filter out dummy keys like 0xffffffffffffffff
            const validKeys = matches.filter(key => key !== '0xffffffffffffffff' && !key.match(/^0x[f]+$/));
            if (validKeys.length > 0) {
              siteKey = validKeys[0];
            }
          }
        }
        
        if (!siteKey) {
          console.error("No Turnstile site key found. Script preview:", text.substring(0, 2000));
          throw new Error("Could not find Turnstile site key from main script");
        }
        turnstileSiteKeyPromiseRef.current.resolve(siteKey);
      }

      if (!faceitMainScript && !faceitCatchaScript) {
        throw new Error("Could not find FACEIT main or captcha script");
      }
    })();
  });

  const component = useCallback(() => <div id={widgetId} />, []);

  return useMemo(
    () => ({
      component,
      getToken,
    }),
    [component, getToken],
  );
}

// Turnstile types

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/* Available methods in the turnstile instance. */
interface Turnstile {
  /**
   * Method to explicit render a widget.
   * @param container -  Element ID or HTML node element.
   * @param params -  Optional. Render parameter options. See {@link https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#configurations the docs} for more info about this options.
   * @returns The rendered widget ID.
   */
  render: (
    container?: string | HTMLElement,
    params?: RenderOptions,
  ) => string | undefined;

  /**
   * Method to render a widget when `execution` is set to `'execute'`. This method should be called after the `.render()` method. If `execution` is set to `'render'` this method has no effect.
   * @param container -  Element ID or HTML node element.
   * @param params -  Optional. Render parameter options. See {@link https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#configurations the docs} for more info about this options.
   */
  execute: (container?: string | HTMLElement, params?: RenderOptions) => void;

  /**
   * Method to reset a widget.
   * @param id -  Optional. ID of the widget to reset, if not provided will target the last rendered widget.
   */
  reset: (id?: string) => void;

  /**
   * Method to remove a widget.
   * @param id -  Optional. ID of the widget to remove, if not provided will target the last rendered widget.
   */
  remove: (id?: string) => void;

  /**
   * Method to get the token of a widget.
   * @param id -  Optional. ID of the widget to get the token from, if not provided will target the last rendered widget.
   * @returns The token response.
   */
  getResponse: (id?: string) => string | undefined;

  /**
   * Check if a widget is expired.
   * @param id -  Optional. ID of the widget to check, if not provided will target the last rendered widget.
   * @returns `true` if the widget is expired, `false` otherwise.
   */
  isExpired: (id?: string) => boolean;
}

interface RenderOptions {
  /**
   * The sitekey of your widget. This sitekey is created upon the widget creation.
   */
  sitekey: string;

  /**
   * A customer value that can be used to differentiate widgets under the same sitekey in analytics and which is returned upon validation. This can only contain up to 32 alphanumeric characters including _ and -.
   * @default undefined
   */
  action?: string;

  /**
   * A customer payload that can be used to attach customer data to the challenge throughout its issuance and which is returned upon validation. This can only contain up to 255 alphanumeric characters including _ and -.
   * @default undefined
   */
  cData?: string;

  /**
   * Callback invoked upon success of the challenge. The callback is passed a token that can be validated.
   * @param token - Token response.
   */
  callback?: (token: string) => void;

  /**
   * Callback invoked when there is an error (e.g. network error or the challenge failed). Refer to [Client-side errors](https://developers.cloudflare.com/turnstile/reference/client-side-errors).
   */
  "error-callback"?: () => void;

  /**
   * Execution controls when to obtain the token of the widget and can be on `'render'` (default) or on `'execute'`. See {@link https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#execution-modes the docs} for more info.
   */
  execution?: "render" | "execute";

  /**
   * Callback invoked when a challenge expires and does not reset the widget.
   */
  "expired-callback"?: () => void;

  /**
   * Callback invoked before the challenge enters interactive mode.
   */
  "before-interactive-callback"?: () => void;

  /**
   * Callback invoked when challenge has left interactive mode.
   */
  "after-interactive-callback"?: () => void;

  /**
   * Callback invoked when a given client/browser is not supported by Turnstile.
   */
  "unsupported-callback"?: () => void;

  /**
   * The widget theme. This can be forced to light or dark by setting the theme accordingly.
   *
   * @default `auto`
   */
  theme?: TurnstileTheme;

  /**
   * Language to display, must be either: `auto` (default) to use the language that the visitor has chosen, or an ISO 639-1 two-letter language code (e.g. `en`) or language and country code (e.g. `en-US`). Refer to the [list of supported languages](https://developers.cloudflare.com/turnstile/reference/supported-languages/) for more information.
   * @default `auto`
   */
  language?: "auto" | TurnstileLangCode | (string & Record<never, never>);

  /**
   * The tabindex of Turnstile’s iframe for accessibility purposes.
   * @default 0
   */
  tabindex?: number;

  /**
   * A boolean that controls if an input element with the response token is created.
   * @default true
   */
  "response-field"?: boolean;

  /**
   * Name of the input element.
   * @default `cf-turnstile-response`
   */
  "response-field-name"?: string;

  /**
   * The widget size. Can take the following values: `normal`, `compact`. The normal size is 300x65px, the compact size is 130x120px.
   * @default `normal`
   */
  size?: "normal" | "compact";

  /**
   * Controls whether the widget should automatically retry to obtain a token if it did not succeed. The default is `'auto'`, which will retry automatically. This can be set to `'never'` to disable retry upon failure.
   * @default `auto`
   */
  retry?: "auto" | "never";

  /**
   * When `retry` is set to `'auto'`, `retry-interval` controls the time between retry attempts in milliseconds. The value must be a positive integer less than `900000`. When `retry` is set to `'never'`, this parameter has no effect.
   * @default 8000
   */
  "retry-interval"?: number;

  /**
   * Automatically refreshes the token when it expires. Can take `'auto'`, `'manual'` or `'never'`.
   * @default `auto`
   */
  "refresh-expired"?: "auto" | "manual" | "never";

  /**
   * Appearance controls when the widget is visible. It can be `'always'` (default), `'execute'`, or `'interaction-only'`. See {@link https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#appearance-modes the docs} for more info.
   */
  appearance?: "always" | "execute" | "interaction-only";
}

type TurnstileLangCode =
  | "ar"
  | "ar-EG"
  | "de"
  | "en"
  | "es"
  | "fa"
  | "fr"
  | "id"
  | "it"
  | "ja"
  | "ko"
  | "nl"
  | "pl"
  | "pt"
  | "pt-BR"
  | "ru"
  | "tlh"
  | "tr"
  | "uk"
  | "uk-ua"
  | "zh"
  | "zh-CN"
  | "zh-TW";

type TurnstileTheme = "light" | "dark" | "auto";
