import { onRequest as __env_js_onRequest } from "/home/tony/Projects/rc-html/functions/env.js"
import { onRequest as __proxy_js_onRequest } from "/home/tony/Projects/rc-html/functions/proxy.js"

export const routes = [
    {
      routePath: "/env",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__env_js_onRequest],
    },
  {
      routePath: "/proxy",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__proxy_js_onRequest],
    },
  ]