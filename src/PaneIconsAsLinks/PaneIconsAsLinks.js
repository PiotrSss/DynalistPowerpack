let css = require('./style.css').toString()

export class PaneIconsAsLinks {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'PaneIconsAsLinks'
    this.featureTitle = 'Icons as links in files and bookmarks'

    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false
      }
    })

    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async getSetting(settingName) {
    return await this.settingsManager.getSetting({ featureName: this.featureName, settingName: settingName })
  }

  updateSetting({ name, value }) {
    this.settingsManager.updateSetting({ featureName: this.featureName, settingName: name, value: value })
  }

  async getPopupSettingsSection() {

    const statusFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'status', callbackOn: () => this.activate(), callbackOff: () => this.deactivate()
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment] })
  }

  activate() {
    const $style = $("<style>", { id: "dynalist-powerpack3-PaneIconsAsLinks", "type": "text/css" }).append(css)
    $('head').append($style)
    this.changeAllPaneElementsIconsToLinks()
  }

  deactivate() {
    $('style#dynalist-powerpack3-PaneIconsAsLinks').remove()
    $('.DocumentItem .DocumentItem-icon a').remove()
    $('.BookmarkItem .BookmarkItem-icon a').remove()
  }

  async changeAllPaneElementsIconsToLinks() {
    if (await this.getSetting('status')) {
      const documents = this.dlInterface.getDocuments()
      for (let document of documents) {
        let itemState = this.dlInterface.getItemState(document)
        const url = this.dlInterface.createAbsoluteUrlFromState({ document_server_id: document.get_server_id() })
        this.changeIconToLinks($(itemState.icon_el), url)
      }
      const bookmarks = this.dlInterface.getBookmarks()
      for (let bookmark of bookmarks) {
        let itemState = this.dlInterface.getItemState(bookmark)
        const url = this.dlInterface.createUrlFromState(bookmark.get_data_object().convert_to_url_state())
        this.changeIconToLinks($(itemState.icon_el), url)
      }
    }
  }

  async onPaneDocumentStopRenaming(itemState) {
    if (await this.getSetting('status')) {
      const url = this.dlInterface.createAbsoluteUrlFromState({ document_server_id: itemState.get_file().get_server_id() })
      this.changeIconToLinks($(itemState.icon_el), url)
    }
  }

  async onPaneBookmarkStopRenaming(itemState) {
    if (await this.getSetting('status')) {
      const url = this.dlInterface.createUrlFromState(itemState.get_file().get_data_object().convert_to_url_state())
      this.changeIconToLinks($(itemState.icon_el), url)
    }
  }

  changeIconToLinks(iconEl, url) {
    iconEl.children('a').remove()
    iconEl.append('<a href="' + url + '" target="_blank"></a>').on('click', e => e.stopPropagation())
  }

}