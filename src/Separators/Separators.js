
import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class Separators {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'Separators'
    this.featureTitle = 'Separators'

    this.status = false
    this.init()

  }

  async init() {

    this.separatorStyles = ['solid', 'dotted', 'dashed', 'double']
    this.defualtValues = {
      trigger: '---',
      width: '100%',
      height: '1',
      color: '#666',
      style: this.separatorStyles[0]
    }

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        trigger: '---',
        width: '100%',
        height: '1',
        color: '#666',
        style: this.separatorStyles[0]
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

    const triggerFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'trigger', label: 'Text trigger for rendering separator', help: '<p>You can use text like for example "[sep]" or simple "---"</p>', onAfterSave: async () => { this.reactivate() }
    })
    const widthFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'width', label: 'Default width', help: '<p>You can specify this setting with pixels (e.g. 500px) or percent (e.g. 50%)</p>', onAfterSave: async () => { this.reactivate() }
    })
    const heightFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'height', label: 'Default height', help: '<p>You can specify this setting with numbers from 1 to 30</p>', onAfterSave: async () => { this.reactivate() }
    })
    const colorFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'color', label: 'Default color', help: '<p>You can specify this setting with CSS color name (e.g. white) or hex value (e.g. #d5d5d5), <a href="http://htmlcolorcodes.com/color-names/" target="_blank">here</a> you can pick your color</p>', onAfterSave: async () => { this.reactivate() }
    })
    const styleFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'style', label: 'Default style', help: '<p>Possible values: solid, dashed, dotted, double</p>', onAfterSave: async () => { this.reactivate() }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, triggerFragment, widthFragment, heightFragment, colorFragment, styleFragment] })
  }

  async activate() {
    this.status = true
    this.trigger = await this.getSetting('trigger')
    this.renderSeparatorsInAllNodes()
  }

  deactivate() {
    this.status = false
    this.dlInterface.traverseTreeDfs(this.dlInterface.getCurrentDocumentNodeCollection(), (node) => {
      onNodeStateInitialized({
        node, callback: async () => {
          if (this.isSeparatorRendered(node)) {
            this.removeSeparator(node)
          }
        }
      })
    })
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderSeparatorsInAllNodes()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderSeparatorsInAllNodes()
    }
  }

  onNodeFocus(node) {
    if (this.status && this.isSeparator(this.dlInterface.getContentFromNode(node))) {
      this.removeSeparator(node)
    }
  }

  onNodeBlur(node) {
    if (this.status && this.isSeparator(this.dlInterface.getContentFromNode(node))) {
      this.renderSeparator(node, this.dlInterface.getContentFromNode(node))
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderSeparatorsInAllNodes(node)
    }
  }

  renderSeparatorsInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.isSeparator(this.dlInterface.getContentFromNode(node))) {
        this.renderSeparator(node, this.dlInterface.getContentFromNode(node))
      }
    })
  }

  async renderSeparator(node, nodeContent) {
    onNodeStateInitialized({
      node, callback: async () => {
        const nodeState = this.dlInterface.getNodeState(node)
        if ($(nodeState.dom.content_el).find('span').length === 0) {
          $(nodeState.dom.node_outer_el).addClass('with-separator');
          $(nodeState.dom.self_el).addClass('with-separator');
          let sepEl = $('<span>', { class: 'separator' })
          let separatorInlineSettingsRegex = /\[([^)]+)\]/;
          let inlineSettingsMatches = separatorInlineSettingsRegex.exec(nodeContent);
          let inlineSettings = inlineSettingsMatches ? inlineSettingsMatches[1].split('|') : [];
          const width = await this.getSeparatorWidth(inlineSettings)
          const height = await this.getSeparatorHeight(inlineSettings)
          const color = await this.getSeparatorColor(inlineSettings)
          const style = await this.getSeparatorStyle(inlineSettings)
          sepEl.css('width', width).css('border-bottom-width', height).css('border-bottom-color', color).css('border-bottom-style', style).css('top', this.getTopPosition(inlineSettings, $(nodeState.dom.content_container_el)))
          $(nodeState.dom.content_el).addClass('with-separator').append(sepEl);
        }
      }
    })
  }

  removeSeparator(node) {
    onNodeStateInitialized({
      node, callback: async () => {
        const nodeState = this.dlInterface.getNodeState(node)
        $(nodeState.dom.node_outer_el).removeClass('with-separator');
        $(nodeState.dom.self_el).removeClass('with-separator');
        $(nodeState.dom.content_el).removeClass('with-separator').children('.separator').remove()
      }
    })
  }

  isSeparator(text) {
    return text.startsWith(this.trigger) ? true : false
  }

  isSeparatorRendered(node) {
    return $(this.dlInterface.getNodeState(node).dom.node_outer_el).hasClass('with-separator') ? true : false
  }

  async getSeparatorWidth(inlineSettings) {
    if (inlineSettings.length > 0) {
      for (let setting of inlineSettings) {
        if (setting.indexOf('px') != -1 || setting.indexOf('%') != -1) {
          return setting;
        }
      }
    }
    const width = await this.getSetting('width')
    return width.length > 0 ? width : this.defualtValues.width;
  }

  async getSeparatorHeight(inlineSettings) {
    if (inlineSettings.length > 0) {
      for (let setting of inlineSettings) {
        if ($.isNumeric(setting)) {
          if (parseInt(setting) > 0 && parseInt(setting) < 31)
            return setting + 'px';
        }
      }
    }
    const height = await this.getSetting('height')
    return height.length > 0 && parseInt(height) > 0 && parseInt(height) < 31 ? height + 'px' : this.defualtValues.height + 'px';
  }

  async getSeparatorColor(inlineSettings) {
    if (inlineSettings.length > 0) {
      for (let setting of inlineSettings) {
        if ($.inArray(setting, this.separatorStyles) < 0 && (setting.indexOf('px') === -1 && setting.indexOf('%') === -1) && !$.isNumeric(setting)) {
          return setting;
        }
      }
    }
    const color = await this.getSetting('color')
    return color.length > 0 ? color : this.defualtValues.color
  }

  async getSeparatorStyle(inlineSettings) {
    if (inlineSettings.length > 0) {
      for (let setting of inlineSettings) {
        if ($.inArray(setting, this.separatorStyles) >= 0) {
          return setting
        }
      }
    }
    const style = await this.getSetting('style')
    return style.length > 0 && $.inArray(style, this.separatorStyles) ? style : this.defualtValues.style;
  }

  getTopPosition(inlineSettings, nodeContainerEl) {
    let borderWidth = 1
    if (inlineSettings.length > 0) {
      for (let setting of inlineSettings) {
        if ($.isNumeric(setting) && parseInt(setting) > 0 && parseInt(setting) < 31) {
          borderWidth = setting
        }
      }
    }
    return `calc(46% - ${borderWidth / 2}px)`
  }

}