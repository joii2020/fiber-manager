(function () {
  const bridgeVersion = "0.1.0";

  if (window.__fiberManagerBridge) {
    return;
  }

  window.__fiberManagerBridge = {
    version: bridgeVersion,
    request(method, params) {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.postMessage(
        {
          type: "fiber-manager:page-request",
          requestId,
          method,
          params
        },
        window.location.origin
      );
      return requestId;
    }
  };

  window.postMessage(
    {
      type: "fiber-manager:bridge-ready",
      bridgeVersion
    },
    window.location.origin
  );
})();
