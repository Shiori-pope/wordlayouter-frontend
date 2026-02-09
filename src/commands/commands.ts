/* global Office, Word */
import { insertHtmlAsDocx, isHtmlFormat, sanitizeHtml } from '../utils/htmlParser';

Office.onReady(() => {
  // Commands are initialized
});

// 注册命令函数
Office.actions.associate('showTaskpane', showTaskpane);

/**
 * 显示任务窗格 (保留旧函数名以兼容)
 */
function showTaskpane(event: Office.AddinCommands.Event) {
   // 如果 manifest 调用 ShowTaskpane Action，则这里不会执行。
   // 如果 manifest 调用 ExecuteFunction 并指像这里，则需要手动显示。
   event.completed();
}
Office.actions.associate('showTaskpane', showTaskpane);
