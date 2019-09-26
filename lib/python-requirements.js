'use babel';

import PythonRequirementsView from './python-requirements-view';
import obj from './py37mods.json';

import { CompositeDisposable } from 'atom';
import { Directory, TextBuffer } from 'atom';

export default {

  pythonRequirementsView: null,
  modalPanel: null,
  subscriptions: null,
  topDir: Directory,
  packs: [],

  activate(state) {
    this.pythonRequirementsView = new PythonRequirementsView(state.pythonRequirementsViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.pythonRequirementsView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'python-requirements:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.pythonRequirementsView.destroy();
  },

  serialize() {
    return {
      pythonRequirementsViewState: this.pythonRequirementsView.serialize()
    };
  },

  is_import_line(line_ar) {
    return (line_ar[0] === 'from' || line_ar[0] === 'import');
  },

  is_comment_line(line_ar) {
    return (line_ar[0].slice(0,1) === '#');
  },

  process_line(line_ar) {
    let pack = line_ar[1];
    if (pack.includes('.')){
      if (pack.indexOf('.') !== 0) {
        // Is not relative module
        pack = pack.split('.')[0];
      } else {
        return false;
      }
    }
    if (!this.topDir.getSubdirectory(pack).existsSync() &&
          !this.topDir.getFile(pack+".py").existsSync() &&
              obj.pymods.indexOf(pack) < 0) {
      // Is not internal, or standard module
      this.packs.push(pack);
      return true;
    } else {
      return false;
    }
  },

  process_entries(dir) {
    let entries = dir.getEntriesSync();
    entries.forEach(
      (entry) => {
        if (entry.isFile() && entry.getBaseName().slice(-3,) == '.py') {
          TextBuffer.load(entry.getPath()).then(
            (eBuff) => {
              let found = false;
              let lost = false;
              let i = 0;
              while (!lost){
                let line = eBuff.lineForRow(i);
                if (typeof line === 'undefined') {
                  break;
                }
                if (!eBuff.isRowBlank(i)) {
                  let line_ar = line.trim().split(' ');
                  if (!found) {
                    if (this.is_import_line(line_ar)) {
                      found = true;
                      this.process_line(line_ar);
                    }
                  } else if (found) {
                    if (this.is_import_line(line_ar) || this.is_comment_line(line_ar)) {
                      if (!this.is_comment_line(line_ar)) {
                        this.process_line(line_ar);
                      }
                    }else{
                      lost = true;
                    }
                  }
                }
                i++;
              }
            }
          );
        }else if (entry.isDirectory()){
          this.process_entries(entry);
        }
      }
    );
  },

  toggle() {
    this.packs = [];
    this.topDir = new Directory(atom.project.getPaths()[0]);
    let reqFile = this.topDir.getFile('requirements.txt');
    reqFile.create().then(
    (existed) => {
      if (existed) {
        atom.notifications.addSuccess("Created new requirements.txt");
      } else {
        atom.notifications.addWarning("Overwriting requirements.txt");
      }
      this.process_entries(this.topDir);
      TextBuffer.load(reqFile.getPath()).then(
        (eBuff) => {
          let packs = new Set(this.packs);
          eBuff.setText(
            [...packs].join('\n')
          );
          eBuff.save();
        });
      });
    }
};
