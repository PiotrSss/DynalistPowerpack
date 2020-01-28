
const keyboardjs = require('keyboardjs')

export class CopyLinkToZoomIntoClipboard {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'CopyLinkToZoomIntoClipboard'
    this.featureTitle = 'Grab the link of the currently active/selected/edited item'

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
        this.copyLinkToZoomIntoClipboard()
      });
    }
  }

  copyLinkToZoomIntoClipboard() {
    let node
    let cursorPosition = this.dlInterface.getCursorPositionEnd() || 0

    if (this.dlInterface.getCurrentlyEditedNode()) {
      node = this.dlInterface.getCurrentlyEditedNode()
    } else if (this.dlInterface.getSelectedNodes().length > 0) {
      node = this.dlInterface.getSelectedNodes()[0]
      this.dlInterface.setCursorToPositionInNode(node, cursorPosition)
    } else { return; }
    let nodeId = node.id;

    let $temp = $("<input>");
    $("body").append($temp);
    $temp.val('https://dynalist.io/d/' + this.dlInterface.getCurrentDocumentServerId() + '#z=' + nodeId).select();
    document.execCommand("copy");
    $temp.remove();

    this.dlInterface.setCursorToPositionInNode(node, cursorPosition)
    this.dlInterface.displayPopup('Link copied to your clipboard!')
  }
}