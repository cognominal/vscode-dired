'use strict';

import * as vscode from 'vscode';
import DiredProvider from './provider';
import FileItem from './fileItem';

import * as fs from 'fs';
import * as path from 'path';

let win = vscode.window;

export interface ExtensionInternal {
    DiredProvider: DiredProvider,
}

export function activate(context: vscode.ExtensionContext): ExtensionInternal {
    let ask_dir = true;
    const configuration = vscode.workspace.getConfiguration('dired');
    if (configuration.has('ask_directory')) {
        ask_dir = configuration.ask_directory;
    }
    let fixed_window = false;
    if (configuration.has('fixed_window')) {
        fixed_window = configuration.fixed_window;
    }

    const provider = new DiredProvider(fixed_window);

    const providerRegistrations = vscode.Disposable.from(
        vscode.workspace.registerTextDocumentContentProvider(DiredProvider.scheme, provider),
    );

//    export function showQuickPick<T extends QuickPickItem>(items: readonly T[] | Thenable<readonly T[]>, options: //// QuickPickOptions & { canPickMany: true; }, token?: CancellationToken): Thenable<T[] | undefined>;


    const commandOpen = vscode.commands.registerCommand("extension.dired.open", async () => {
        const curFileName = win.activeTextEditor?.document.fileName;
        const quickPick =  vscode.window.createQuickPick( );
        const homedir = require('os').homedir();
        let items = new Array();
        items.push( { label: homedir, description: 'home folder'} );
        items.push( { label: curFileName, description: 'current documentfolder' });
        let wspFolders = vscode.workspace.workspaceFolders;
        if (wspFolders) {
            for (let wsp of wspFolders) {
                items.push({label:  wsp.uri.path, description: 'workespacefolder' });
            }
        }
        const result = await win.showQuickPick(items, {
            placeHolder: 'pick a workspace or folder',
        });
        showDir(result.label);
    });

    function showDir(path: string) {
        if (!path) {
            return;
        }
        if (fs.lstatSync(path).isDirectory()) {
            provider.openDir(path);
        } else if (fs.lstatSync(path).isFile()) {
            const f = new FileItem(path, "", false, true); // Incomplete FileItem just to get URI.
            const uri = f.uri;
            if (uri) {
                provider.showFile(uri);
            }
        }

    }

    const commandEnter = vscode.commands.registerCommand("extension.dired.enter", () => {
        provider.enter();
    });
    const commandToggleDotFiles = vscode.commands.registerCommand("extension.dired.toggleDotFiles", () => {
        provider.toggleDotFiles();
    });

    const commandCreateDir = vscode.commands.registerCommand("extension.dired.createDir", () => {
        vscode.window.showInputBox()
            .then((dirName) => {
                if (!dirName) {
                    return;
                }
                provider.createDir(dirName);
            });
    });
    const commandRename = vscode.commands.registerCommand("extension.dired.rename", () => {
        vscode.window.showInputBox()
            .then((newName: string) => {
                provider.rename(newName);
            });
    });
    const commandCopy = vscode.commands.registerCommand("extension.dired.copy", () => {
        vscode.window.showInputBox()
            .then((newName: string) => {
                provider.copy(newName);
            });
    });
    const commandGoUpDir = vscode.commands.registerCommand("extension.dired.goUpDir", () => {
        provider.goUpDir();
    });
    const commandRefresh = vscode.commands.registerCommand("extension.dired.refresh", () => {
        provider.reload();
    });
    const commandSelect = vscode.commands.registerCommand("extension.dired.select", () => {
        provider.select();
    });
    const commandUnselect = vscode.commands.registerCommand("extension.dired.unselect", () => {
        provider.unselect();
    });
    const commandClose = vscode.commands.registerCommand("extension.dired.close", () => {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    context.subscriptions.push(
        provider,
        commandOpen,
        commandEnter,
        commandToggleDotFiles,
        commandCreateDir,
        commandRename,
        commandCopy,
        commandGoUpDir,
        commandRefresh,
        commandClose,
        commandSelect,
        providerRegistrations
    );

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.uri.scheme === DiredProvider.scheme) {
            editor.options = {
                cursorStyle: vscode.TextEditorCursorStyle.Block,
            };
            vscode.commands.executeCommand('setContext', 'dired.open', true);
        } else {
            vscode.commands.executeCommand('setContext', 'dired.open', false);
        }
    });

    return {
        DiredProvider: provider,
    };
};
