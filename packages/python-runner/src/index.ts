/*
 * Copyright 2018-2019 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '../style/index.css';

import {JupyterFrontEnd, JupyterFrontEndPlugin, ILayoutRestorer} from '@jupyterlab/application';
import {IEditorServices} from '@jupyterlab/codeeditor';
import {ILauncher} from '@jupyterlab/launcher';
import {IMainMenu} from '@jupyterlab/mainmenu';
import {WidgetTracker, ICommandPalette} from '@jupyterlab/apputils';

import {PythonFileEditorFactory, PythonFileEditor} from "./widget";

const PYTHON_ICON_CLASS = 'jp-PythonIcon';
const PYTHON_FACTORY = 'PyEditor';
const PYTHON = 'python';
const PYTHON_EDITOR_NAMESPACE = 'python-runner-extension';

const commandIDs = {
  createNewPython : 'pyeditor:create-new-python-file',
  openPyEditor : 'pyeditor:open',
  openDocManager : 'docmanager:open',
  newDocManager : 'docmanager:new-untitled'
};

/**
 * Initialization data for the python-editor-extension extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PYTHON_EDITOR_NAMESPACE,
  autoStart: true,
  requires: [IEditorServices, ICommandPalette, ILayoutRestorer, IMainMenu],
  optional: [ILauncher],
  activate: (
    app: JupyterFrontEnd, 
    editorServices: IEditorServices,
    palette: ICommandPalette,
    restorer: ILayoutRestorer | null,
    menu: IMainMenu | null,
    launcher: ILauncher | null
    ) => {
      console.log('AI Workspace - python-runner extension is activated!');

      const factory = new PythonFileEditorFactory({
        editorServices,
        factoryOptions: {
          name: PYTHON_FACTORY,
          fileTypes: [PYTHON],
          defaultFor: [PYTHON]
        }
      });

      /*
       * Track PythonFileEditor widget on page refresh
      **/

      const tracker = new WidgetTracker<PythonFileEditor>({
        namespace: PYTHON_EDITOR_NAMESPACE
      });

      if (restorer){
        // Handle state restoration
        void restorer.restore(tracker, 
        {
          command: commandIDs.openDocManager,
          args: widget => ({ 
            path: widget.context.path, 
            factory: PYTHON_FACTORY 
          }),
          name: widget => widget.context.path
        });
      }  

      app.docRegistry.addWidgetFactory(factory);  

      factory.widgetCreated.connect((sender, widget) => {
        void tracker.add(widget);

        // Notify the widget tracker if restore data needs to update
        widget.context.pathChanged.connect(() => {
          void tracker.save(widget);
        });
      });

      /*
       * Create new python file from launcher and file menu
      **/

      // Add a python launcher
      if (launcher) {
        launcher.add({
          command: commandIDs.createNewPython,
          category: 'Other',
          rank: 3
        });
      }

      if (menu) {
        // Add new python file creation to the file menu
        menu.fileMenu.newMenu.addGroup(
          [{ command: commandIDs.createNewPython }],
          30
        );
      }

      // Function to create a new untitled python file, given the current working directory
      const createNew = (cwd: string, ext: string = 'py') => {
        return app.commands.execute(commandIDs.newDocManager, {
            path: cwd,
            type: 'file',
            ext
          })
          .then(model => {
            return app.commands.execute(commandIDs.openDocManager, {
              path: model.path,
              factory: PYTHON_FACTORY
            });
          });
      };
  
      // Add a command to create new Python file
      app.commands.addCommand(commandIDs.createNewPython, {
        label: args => (args['isPalette'] ? 'New Python File' : 'Python File'),
        caption: 'Create a new python file',
        iconClass: args => (args['isPalette'] ? '' : PYTHON_ICON_CLASS),
        execute: args => {
          let cwd = args['cwd'] ;
          return createNew(cwd as string, 'py');
        }
      });

      palette.addItem({ 
        command: commandIDs.createNewPython,
        args: { isPalette: true },
        category: 'Python Editor' 
      });
    }
};

export default extension;