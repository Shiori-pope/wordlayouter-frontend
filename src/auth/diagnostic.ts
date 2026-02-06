import * as msal from "@azure/msal-browser";

// 将 msal 挂载到全局 window 对象，以便 diagnostic.html 中的内联代码可以使用它
// 这样可以避免从 CDN 加载脚本时遇到的 CSP 或网络问题
(window as any).msal = msal;

console.log("Diagnostic Bundle: MSAL loaded successfully (v" + msal.version + ")");

// 也可以在这里添加 Office.onReady 的一些处理，如果有需要的话
// 但目前 diagnostic.html 里的逻辑已经处理了大部分
