
const keyboardjs = require('keyboardjs')

export class AddRemoveBookmark {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'AddRemoveBookmark'
    this.featureTitle = 'Add / Remove bookmark for currently active/selected/edited item'

    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        shortcut: ''
      }
    })
  }

  async getSetting(settingName) {
    return await this.settingsManager.getSetting({ featureName: this.featureName, settingName: settingName })
  }

  updateSetting({ name, value }) {
    this.settingsManager.updateSetting({ featureName: this.featureName, settingName: name, value: value })
  }

  async getPopupSettingsSection() {

    const shortcutFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcut', label: 'Shortcut:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcut'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [shortcutFragment] })
  }

  async updateKeyboardBindings() {
    const shortcut = await this.getSetting('shortcut')
    keyboardjs.unbind(shortcut);
    if (shortcut.length > 0) {
      keyboardjs.bind(shortcut, e => {
        e.preventDefault();
        this.addRemoveBookmark()
      });
    }
  }

  addRemoveBookmark() {
    let bookmarks = this.dlInterface.getBookmarks();
    let node;
    if (this.dlInterface.getCurrentlyEditedNode()) {
      node = this.dlInterface.getCurrentlyEditedNode()
    } else if (this.dlInterface.getSelectedNodes().length > 0) {
      node = this.dlInterface.getSelectedNodes()[0]
    } else { return; }
    let nodeId = node.id;

    let bookmarkAlreadyExist = null
    for (let bookmark of bookmarks) {
      let doc = bookmark.data_obj.data.d
      let zoom = bookmark.data_obj.data.z
      if ((doc === nodeId || zoom === nodeId) && bookmark.index >= 0) {
        bookmarkAlreadyExist = bookmark
        break
      }
    }

    if (!bookmarkAlreadyExist) {
      let cursorPosition = this.dlInterface.getCursorPositionEnd()
      let urlState = this.dlInterface.getUrlState(node)
      this.dlInterface.createBookmark(urlState, true)
      this.dlInterface.setCursorToPositionInNode(node, cursorPosition)
    } else {
      this.dlInterface.removeBookmark(bookmarkAlreadyExist, true)
    }
  }
}