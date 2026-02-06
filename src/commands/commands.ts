/* global Office, Word */
import { insertHtmlAsDocx, isHtmlFormat, sanitizeHtml } from '../utils/htmlParser';

Office.onReady(() => {
  // Commands are initialized
});

let dialog: Office.Dialog;

async function processMessage(arg: any) {
    let messageFromDialog: any;
    try {
        messageFromDialog = JSON.parse(arg.message);
    } catch (e) {
        console.error("Invalid message format");
        return;
    }

    if (messageFromDialog.type === 'INSERT') {
        const text = messageFromDialog.content;
        try {
            await Word.run(async (context) => {
                 if (isHtmlFormat(text)) {
                     const sanitized = sanitizeHtml(text);
                     await insertHtmlAsDocx(context, sanitized);
                 } else {
                     const selection = context.document.getSelection();
                     selection.insertText(text, Word.InsertLocation.after);
                     await context.sync();
                 }
            });
        } catch (error) {
            console.error("Insertion failed", error);
        }
        if (dialog) {
            dialog.close();
        }
    } else if (messageFromDialog.type === 'CLOSE') {
        if (dialog) {
            dialog.close();
        }
    }
}

function openQuickInput(event: Office.AddinCommands.Event) {
    // Determine the full URL for the popup
    const url = new URL('popup.html', window.location.href).toString();
    
    // Dialog size (percentage)
    const dialogOptions = { height: 45, width: 30, displayInIframe: true };

    Office.context.ui.displayDialogAsync(url, dialogOptions, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            console.error(asyncResult.error.message);
        } else {
            dialog = asyncResult.value;
            dialog.addEventHandler(Office.EventType.DialogMessageReceived, processMessage);
        }
        event.completed();
    });
}

// 注册命令函数
Office.actions.associate('openQuickInput', openQuickInput);

/**
 * 显示任务窗格 (保留旧函数名以兼容)
 */
function showTaskpane(event: Office.AddinCommands.Event) {
   // 如果 manifest 调用 ShowTaskpane Action，则这里不会执行。
   // 如果 manifest 调用 ExecuteFunction 并指像这里，则需要手动显示。
   event.completed();
}
Office.actions.associate('showTaskpane', showTaskpane);
