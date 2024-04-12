interface Action<Type, Payload> {
  type: Type;
  payload: Payload;
}

export enum ServiceWorkerMessageType {
  SEND_TO_LEETIFY = "SEND_TO_LEETIFY",
  LEETIFY_AUTH_TOKEN = "LEETIFY_AUTH_TOKEN",
  GET_PROCESSED_DEMO = "GET_PROCESSED_DEMO",
}

export type ServiceWorkerMessage =
  | Action<
      ServiceWorkerMessageType.SEND_TO_LEETIFY,
      { url: string; faceitId: string; isOldDemo: boolean }
    >
  | Action<ServiceWorkerMessageType.LEETIFY_AUTH_TOKEN, { authToken?: string }>
  | Action<
      ServiceWorkerMessageType.GET_PROCESSED_DEMO,
      { faceitId: string } | { leetifyId: string }
    >;

export enum FaceitErrors {
  NOT_LOGGED_IN_TO_LEETIFY = "NOT_LOGGED_IN_TO_LEETIFY",
  LEETIFY_NO_MATCH_ID = "LEETIFY_NO_MATCH_ID ",
}
