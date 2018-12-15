'use babel';

import PythonRequirementsView from './python-requirements-view';
import { CompositeDisposable } from 'atom';
import { Directory, TextBuffer } from 'atom';


export default {

  pythonRequirementsView: null,
  modalPanel: null,
  subscriptions: null,
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

  process_entries(entries) {
    entries.forEach(
      (entry) => {
        if (entry.isFile() && entry.getBaseName().slice(-3,) == '.py'){
          TextBuffer.load(entry.getPath()).then(
            (eBuff) => {
              found = false;
              lost = false;
              i = 0;
              while (!lost){
                line = eBuff.lineForRow(i).split(' ');
                if (!found) {
                  if (line[0] == 'from' || line[0] == 'import' || line == '\n'){
                    found = true;
                    pack = (line[1] == '.')? line[3]:line[1];
                    if (!this.packs.includes(pack)){
                      if (pack.includes('.')){
                        this.packs.push(pack.split('.')[0]);
                      } else if (pack.includes(',')){
                        this.packs = this.packs.concat(pack.split(','));
                      } else {
                        this.packs.push(pack);
                      }
                    }
                  }
                }else{
                  if (line[0] == 'from' || line[0] == 'import'){
                    pack = (line[1] == '.')? line[3]:line[1];
                    if (!this.packs.includes(pack)){
                      if (pack.includes('.')){
                        this.packs.push(pack.split('.')[0]);
                      } else if (pack.includes(',')){
                        this.packs = this.packs.concat(pack.split(','));
                      } else {
                        this.packs.push(pack);
                      }
                    }
                  }else{
                    lost = true;
                  }
                }
                i++;
              }
            }
          );
        }else if (entry.isDirectory()){
          this.process_entries(entry.getEntriesSync());
        }
      }
    );
  },

  toggle() {
    this.packs = [];
    console.log('PythonRequirements was toggled!');
    topDir = new Directory(atom.project.getPaths()[0]);
    reqFile = topDir.getFile('requirements.txt');
    reqFile.create().then(
    (existed) => {
      if (existed) {
        atom.notifications.addSuccess("Created new requirements.txt");
      }
      this.process_entries(topDir.getEntriesSync());
      TextBuffer.load(reqFile.getPath()).then(
        (eBuff) => {
          eBuff.append(this.packs.join('\n'));
          eBuff.save();
        });
      });
    }
};
