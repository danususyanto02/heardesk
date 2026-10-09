(() => {
  const script = document.currentScript;
  if (!script || window.__ureportMounted) {
    return;
  }
  const key = script.dataset.site;
  if (!key || key.length > 128) {
    return;
  }
  window.__ureportMounted = true;
  const base = new URL(script.src).origin;
  const frame = document.createElement("iframe");
  const button = document.createElement("button");
  const container = document.createElement("div");
  let lastFocus;
  // Non-security: generates a DOM id for aria-controls, not a token or secret.
  const id = "ureport-" + Math.random().toString(36).slice(2);
  frame.id = id;
  frame.title = "Kirim feedback";
  frame.src =
    base +
    "/widget/" +
    encodeURIComponent(key) +
    "?parentOrigin=" +
    encodeURIComponent(location.origin);
  Object.assign(frame.style, {
    width: "100%",
    height: "100%",
    border: "0",
    borderRadius: "12px",
    background: "white",
  });
  container.hidden = true;
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-label", "Formulir feedback");
  Object.assign(container.style, {
    position: "fixed",
    bottom: "80px",
    right: "20px",
    width: "min(420px, calc(100vw - 32px))",
    height: "min(720px, calc(100dvh - 110px))",
    zIndex: "2147483646",
    boxShadow: "0 12px 48px #18223033",
    borderRadius: "12px",
    background: "white",
  });
  button.type = "button";
  button.textContent = "Beri masukan";
  button.hidden = true;
  button.setAttribute("aria-controls", id);
  button.setAttribute("aria-expanded", "false");
  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483646",
    minHeight: "44px",
    padding: "12px 18px",
    background: "#1463d6",
    color: "white",
    border: "1px solid #1463d6",
    borderRadius: "8px",
    cursor: "pointer",
    font: "600 16px system-ui,sans-serif",
  });
  function close() {
    container.hidden = true;
    button.setAttribute("aria-expanded", "false");
    (lastFocus || button).focus();
  }
  button.onclick = () => {
    lastFocus = document.activeElement;
    container.hidden = !container.hidden;
    button.setAttribute("aria-expanded", String(!container.hidden));
    if (!container.hidden) {
      frame.focus();
    }
  };
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !container.hidden) {
      close();
    }
  });
  window.addEventListener("message", (event) => {
    if (
      event.origin !== base ||
      event.source !== frame.contentWindow ||
      !event.data ||
      typeof event.data !== "object"
    ) {
      return;
    }
    if (event.data.type === "ureport:ready") {
      if (typeof event.data.label === "string" && event.data.label.length <= 40) {
        button.textContent = event.data.label;
      }
      if (event.data.position === "left") {
        button.style.right = "auto";
        button.style.left = "20px";
        container.style.right = "auto";
        container.style.left = "16px";
      }
      button.hidden = false;
      const url = new URL(location.href);
      url.search = "";
      url.hash = "";
      url.username = "";
      url.password = "";
      frame.contentWindow.postMessage({ type: "ureport:context", url: url.href }, base);
    } else if (event.data.type === "ureport:close") {
      close();
    }
  });
  container.append(frame);
  document.body.append(container, button);
})();
