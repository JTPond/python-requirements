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

  is_import_line(line) {
    let line_ar = line.trim().split(/[ ]+/);
    return (line_ar[0] === 'from' || line_ar[0] === 'import');
  },

  is_comment_line(line) {
    return (line.trim().slice(0,1) === '#');
  },

  is_comma_sep(line) {
    let line_ar = line.trim().split(/[ ]+/);
    return (line.includes(',') && line_ar[0] === 'import');
  },

  process_rel_pack(pack) {
    if (pack.includes('.')){
      if (pack.indexOf('.') !== 0) {
        pack = pack.split('.')[0];
      } else {
        return null;
      }
    }
    return pack;
  },

  process_line(line, dir) {
    let pack_ar = [];
    let line_ar = line.trim().split(/[ ]+/);
    if (this.is_comma_sep(line)) {
      pack_ar.push(...line_ar.slice(1).map((pack) => {
        return pack.trim().replace(',','');
      }).filter((pack) => pack !== ''));
    } else {
      let pack = this.process_rel_pack(line_ar[1]);
      if (pack) {
        pack_ar.push(pack);
      }
    }
    return pack_ar.map((pa) => {
        return pa.replace(/\W/g,'');
      }).filter((pack) => {
      return (!this.topDir.getSubdirectory(pack).existsSync() &&
            !this.topDir.getFile(pack+".py").existsSync() &&
            !dir.getSubdirectory(pack).existsSync() &&
            !dir.getFile(pack+".py").existsSync() &&
                obj.pymods.indexOf(pack) < 0)
    });
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
                  if (!found) {
                    if (this.is_import_line(line)) {
                      found = true;
                      let pack_ar = this.process_line(line,dir);
            		      this.packs.push(...pack_ar);
                    }
                  } else if (found) {
                    if (this.is_import_line(line) || this.is_comment_line(line)) {
                      if (!this.is_comment_line(line)) {
                        let pack_ar = this.process_line(line,dir);
              		      this.packs.push(...pack_ar);
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
    let topDirs = atom.project.getDirectories();
    if (topDirs.length < 1) {
      atom.notifications.addError("No project folders found.");
      return;
    }
    let actEd = atom.workspace.getActiveTextEditor();
    if (actEd) {
      this.topDir = new Directory(atom.project.relativizePath(actEd.getPath())[0]);
    } else {
      if (topDirs.length > 1) atom.notifications.addWarning("No active Project, defaulting to first project in the tree.");
      this.topDir = topDirs[0];
    }
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
