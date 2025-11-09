import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// 过滤 MetaMask 和其他浏览器扩展错误
const originalError = console.error;
console.error = (...args) => {
  const errorString = args[0]?.toString() || '';
  // 忽略 MetaMask 相关错误
  if (
    errorString.includes('MetaMask') ||
    errorString.includes('chrome-extension://') ||
    errorString.includes('Failed to connect to MetaMask')
  ) {
    return;
  }
  originalError.apply(console, args);
};

// 捕获未处理的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  const errorString = event.reason?.toString() || '';
  if (
    errorString.includes('MetaMask') ||
    errorString.includes('chrome-extension://')
  ) {
    event.preventDefault();
    return;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);
