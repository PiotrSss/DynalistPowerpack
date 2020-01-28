
import _ from 'lodash'

export class AttachBookmarksToDocuments {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'AttachBookmarksToDocuments'
    this.featureTitle = 'Attach bookmarks as filters to corresponding documents'

    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        detach: false,
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

    const detachFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'detach', label: 'Keep bookmarks with #- in title in bookmarks pane', callbackOn: () => this.activate(), callbackOff: () => this.deactivate()
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, detachFragment] })
  }

  activate() {
    this.attachBookmarksToDocuments()
  }

  deactivate() {
    this.dlInterface.updateBookmarkStatus()
  }

  async onOpenPane(name) {
    // console.log('onOpenPane')
    // if (await this.getSetting('status') && name === 'bookmark') {
    //   this.dlInterface.closePane()
    //   this.dlInterface.openPane('file')
    // }
  }

  async onPaneBookmarkStopRenaming() {
    // console.log('onPaneBookmarkStopRenaming')
    if (await this.getSetting('status')) {
      this.attachBookmarksToDocuments()
      // this.onBookmarkStatusUpdate()
    }
  }

  async onBookmarkStatusUpdate() {
    // console.log('onBookmarkStatusUpdate')
    if (await this.getSetting('status')) {
      this.attachBookmarksToDocuments()
      let bookmarksLength = this.dlInterface.getBookmarks().filter(b => { return b.index > -1 }).length
      let bookmarksReloadInterval = setInterval(() => {
        if (DYNALIST.app.userspace.ui.bookmarks_container["0"].childNodes.length === bookmarksLength) {
          this.attachBookmarksToDocuments()
          clearInterval(bookmarksReloadInterval)
        }
      }, 50)
      setTimeout(() => { clearInterval(bookmarksReloadInterval) }, 30000)
      // }
    }
  }

  attachBookmarksToDocuments() {
    let bookmarksUnsorted = DYNALIST.app.userspace.ui.bookmarks_container["0"].childNodes;
    let bookmarks = []
    let i = bookmarksUnsorted.length;
    while (i--) {
      bookmarks.push({ title: $(bookmarksUnsorted[i]).find('.BookmarkItem-title').text().toLowerCase(), bookmark: bookmarksUnsorted[i] })
    }
    bookmarks = _.orderBy(bookmarks, ['title'], ['desc']);
    $('.FilePane-files .DocumentItem').each(async (index, documentNode) => {
      let i = bookmarks.length;
      while (i--) {
        if (this.dlInterface.getBookmarkFromBookmarkEl(bookmarks[i].bookmark).get_data_object().convert_to_url_state().document_server_id == this.dlInterface.getDocumentFromFileEl(documentNode).server_id) {
          if (bookmarks[i].title.includes('#-') && await this.getSetting('detach')) {
            $(bookmarks[i].bookmark).find('.BookmarkItem-title').html($(bookmarks[i].bookmark).find('.BookmarkItem-title').text().replace('#-', '') + '<span style="display:none">#-</span>')
          } else {
            documentNode.append(bookmarks[i].bookmark);
          }
        }
      }
    });
  }
}