
import { createEmbeddableUrl, onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

const keyboardjs = require('keyboardjs')

export class IFrameEmbedding {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'IFrameEmbedding'
    this.featureTitle = 'Embedding IFrames (Youtube, Maps, Dynalist documents, etc.)'

    this.status = false
    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        shortcutStatus: '',
        lock: false
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

    const shortcutStatusFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcutStatus', label: 'Shortcut:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcutStatus'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    const lockFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'lock', label: 'Prevent item from rerendering by accidental clicks on blank space', help: '<p>with this setting you can edit iframe code by clicking on parent/sibling item and moving down/up your cursor with arrow keys</p>', callbackOn: () => this.lockIFrames()
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, shortcutStatusFragment, lockFragment] })
  }

  async updateKeyboardBindings() {
    const shortcutStatus = await this.getSetting('shortcutStatus')
    keyboardjs.unbind(shortcutStatus);
    if (shortcutStatus.length > 0) {
      keyboardjs.bind(shortcutStatus, e => {
        e.preventDefault();
        this.settingsManager.toggleSetting({ featureName: this.featureName, settingName: 'status', callback: () => { this.reactivate() } })
      });
    }
  }

  async activate() {
    this.status = true
    this.embedIFramesInAllNodes()
  }

  deactivate() {
    this.status = false
    this.removeIFramesFromAllNodes()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async onDocumentFullyRendered() {
    if (this.status) {
      this.embedIFramesInAllNodes()
    }
  }

  async onDocumentZoomed() {
    if (this.status) {
      this.embedIFramesInAllNodes()
    }
  }

  onNodeBlur(node) {
    if (this.status) {
      if (this.hasIFrameCode(node.get_meta_object().get_content(), node.get_content_parse_tree())) {
        this.embedIFrame(node, this.getIFrameCode(node.get_meta_object().get_content()))
      }
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.embedIFramesInAllNodes(node)
    }
  }

  removeIFramesFromAllNodes() {
    this.dlInterface.traverseTreeDfs(this.dlInterface.getCurrentDocumentNodeCollection(), (node) => {
      let nodeState = this.dlInterface.getNodeState(node)
      if (nodeState) {
        let nodeRenderedContentEl = nodeState.dom.rendered_content_el
        if ($(nodeRenderedContentEl).hasClass('with-iframes')) {
          $(nodeRenderedContentEl).text(node.get_meta_object().get_content()).removeClass('with-iframes');
        }
      }
    })
  }

  async embedIFramesInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    if (await this.getSetting('lock')) {
      this.lockIFrames()
    }
    traverseNotCollapsedNodeTree(node, node => {
      if (this.hasIFrameCode(node.get_meta_object().get_content(), node.get_content_parse_tree())) {
        this.embedIFrame(node, this.getIFrameCode(node.get_meta_object().get_content()))
      }
    })
  }

  hasIFrameCode(nodeContent, nodeContentParseTree) {
    if (this.dlInterface.hasTag(nodeContentParseTree, 'embed') || (nodeContent.includes('<iframe') && nodeContent.substring(nodeContent.indexOf('<iframe') - 1, nodeContent.indexOf('<iframe')) != '`')) {
      return true
    }
  }

  getIFrameCode(nodeContent) {
    let iframeCode = nodeContent
    let closedTags = this.dlInterface.getClosedTagsWithContent(nodeContent, 'embed')
    if (closedTags.length > 0) {
      iframeCode = ''
      for (let closedTag of closedTags) {
        let tag = this.dlInterface.getFullTagsFromFragment(closedTag, 'embed')[0].trim()
        let tagParts = tag.split('|')
        let width = '50%'
        let height = '400px'
        let url = ''
        for (let tagPart of tagParts) {
          if (tagPart.includes('width:')) {
            width = tagPart.split(':')[1]
          } else if (tagPart.includes('height:')) {
            height = tagPart.split(':')[1]
          }
        }
        url = createEmbeddableUrl(closedTag.replace(tag, '').replace(' ##', '').trim())
        let appendDynalistStyles = ''
        if (url.includes('dynalist.io/d/')) {
          appendDynalistStyles = `onload="$('iframe').contents().find('head').append($('<style> .LeftPaneSlidebarContainer, .LeftPaneSplitter, .DocumentBreadcrumb, .DocumentTools {display:none !important;} .DocumentContainer {width: 100% !important; left: 0!important; padding: 0 20px !important}  .Document {margin: 0 !important; width: 100% !important;}.Document-rootNode {padding: 0 !important;}</style>'))"`
        }
        iframeCode += `<iframe width="${width}" height="${height}" src="${url}" ${appendDynalistStyles} style="border:0"></iframe>`
      }
    }
    return iframeCode
  }

  embedIFrame(node, iframeCode) {
    onNodeStateInitialized({
      node, callback: () => {
        const nodeState = this.dlInterface.getNodeState(node)
        $(nodeState.dom.rendered_content_el).html(iframeCode).addClass('with-iframes')
        $(nodeState.dom.rendered_content_el).on('mousedown', async e => {
          if (await this.getSetting('lock')) {
            e.stopPropagation()
          }
        })
      }
    })
  }

  lockIFrames() {
    $('.with-iframes').on('mousedown', async e => {
      if (await this.getSetting('lock')) {
        e.stopPropagation();
      }
    });
  };

}