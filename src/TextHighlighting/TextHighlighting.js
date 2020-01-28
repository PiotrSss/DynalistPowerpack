
let keyboardjs = require('keyboardjs')

import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class TextHighlighting {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'TextHighlighting'
    this.featureTitle = 'Text highlighting'

    this.status = false
    this.init()

  }

  async init() {

    this.defualtValues = {
      background: 'yellow',
      color: 'black',
      weight: 'normal',
      style: 'initial',
      decoration: 'initial'
    }

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        background: 'yellow',
        color: 'black',
        weight: 'normal',
        style: 'initial',
        decoration: 'initial',
        shortcut: ''
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

    const backgroundFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'background', label: 'Default background', help: '<p>You can specify this setting with CSS color name (e.g. white) or hex value (e.g. #d5d5d5), <a href="http://htmlcolorcodes.com/color-names/" target="_blank">here</a> you can pick your color</p>', onAfterSave: async () => { this.reactivate() }
    })
    const colorFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'color', label: 'Default color', help: '<p>You can specify this setting with CSS color name (e.g. white) or hex value (e.g. #d5d5d5), <a href="http://htmlcolorcodes.com/color-names/" target="_blank">here</a> you can pick your color</p>', onAfterSave: async () => { this.reactivate() }
    })
    const weightFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'weight', label: 'Default weight', help: '<p>normal or bold</p>', onAfterSave: async () => { this.reactivate() }
    })
    const shortcutFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcut', label: 'Shortcut to create/remove highlight:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcut'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, backgroundFragment, colorFragment, weightFragment, shortcutFragment] })
  }

  activate() {
    this.status = true
    this.renderHighlightsInAllNodes()
  }

  deactivate() {
    this.status = false
    $('.TextHighlighting-start').show().removeClass('TextHighlighting-start')
    $('.TextHighlighting-end').show().removeClass('TextHighlighting-end')
    $('.TextHighlighting-wrapper').attr('style', '')
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async updateKeyboardBindings() {
    const shortcut = await this.getSetting('shortcut')
    keyboardjs.unbind(shortcut);
    if (shortcut.length > 0) {
      keyboardjs.bind(shortcut, e => {
        e.preventDefault();
        this.onShortcutPress()
      });
    }
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderHighlightsInAllNodes()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderHighlightsInAllNodes()
    }
  }

  onNodeBlur(node) {
    if (this.status && this.dlInterface.hasTag(node.get_content_parse_tree(), 'hl')) {
      this.renderHighlight(node)
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderHighlightsInAllNodes(node)
    }
  }

  renderHighlightsInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.dlInterface.hasTag(node.get_content_parse_tree(), 'hl')) {
        this.renderHighlight(node)
      }
    })
  }

  renderHighlight(node) {
    onNodeStateInitialized({
      node, callback: async () => {
        const closedTags = this.dlInterface.getClosedTagsWithContent(this.dlInterface.getContentFromNode(node), 'hl')
        for (let closedTag of closedTags) {
          let tag = this.dlInterface.getFullTagsFromFragment(closedTag, 'hl')[0].trim()
          let options = await this.getOptions(tag)
          let text = closedTag.replace(tag, '').replace(' ##', '').trim()
          let startTag = $($(this.dlInterface.getNodeState(node).dom.rendered_content_el).find('.node-tag:contains("' + tag + '"):not(.TextHighlighting-start)')[0]).addClass('TextHighlighting-start')
          let endTag = $($(startTag).nextAll('.node-tag:contains("##"):not(.TextHighlighting-end)')[0]).addClass('TextHighlighting-end')
          let elementsBetween = startTag.nextUntil(endTag)
          $(elementsBetween).wrapAll('<span class="TextHighlighting-wrapper" style="background: ' + options.background + '; color: ' + options.color + '; font-weight: ' + options.weight + '; font-style: ' + options.style + '; text-decoration: ' + options.decoration + '; padding: 1px 0px; border-radius: 1px;" />')
          startTag.hide()
          endTag.hide()
        }
      }
    })
  }

  async getOptions(tag) {
    let options = {
      background: await this.getSetting('background') ? await this.getSetting('background') : this.defualtValues.background,
      color: await this.getSetting('color') ? await this.getSetting('color') : this.defualtValues.color,
      weight: await this.getSetting('weight') ? await this.getSetting('weight') : this.defualtValues.weight,
      style: await this.getSetting('style') ? await this.getSetting('style') : this.defualtValues.style,
      decoration: await this.getSetting('decoration') ? await this.getSetting('decoration') : this.defualtValues.decoration,
    }
    for (let part of tag.split('|')) {
      if (part.includes('b:')) {
        options.background = part.split(':')[1]
      } else if (part.includes('c:')) {
        options.color = part.split(':')[1]
      } else if (part.includes('b')) {
        options.weight = 'bold'
      } else if (part.includes('n')) {
        options.weight = 'normal'
      } else if (part.includes('i')) {
        options.style = 'italic'
      } else if (part.includes('s')) {
        options.decoration = 'line-through'
      } else if (part.includes('u')) {
        options.decoration = 'underline'
      } else if (part.includes('o')) {
        options.decoration = 'overline'
      }
    }
    return options
  }

  onShortcutPress() {
    let currentSelection = this.dlInterface.getCurrentSelection()
    if (currentSelection.is_content_selection()) {

      let selectionStart = currentSelection.get_position_start()
      let selectionEnd = currentSelection.get_position_end()
      let node = currentSelection.node
      let text = currentSelection.get_text()

      if (selectionStart == selectionEnd) {
        let cursorIndex = selectionStart
        let tagBeforeStartIndex = text.substring(0, cursorIndex).lastIndexOf('#hl')
        let tagBeforeEndIndex = text.substring(0, cursorIndex).lastIndexOf('##')
        let tagAfterStartIndex = text.substring(cursorIndex).indexOf('#hl')
        if (tagAfterStartIndex !== -1) { tagAfterStartIndex += cursorIndex }
        let tagAfterEndIndex = text.substring(cursorIndex).indexOf('##')
        if (tagAfterEndIndex !== -1) { tagAfterEndIndex += cursorIndex }

        if (tagBeforeStartIndex !== -1 && tagBeforeEndIndex < tagBeforeStartIndex && tagAfterEndIndex !== -1 && (tagAfterStartIndex === -1 || tagAfterStartIndex > tagAfterEndIndex)) {
          text = text.substr(0, tagAfterEndIndex) + text.substr(tagAfterEndIndex + 2)
          let fullTag = this.dlInterface.getFullTagsFromFragment(text.substr(tagBeforeStartIndex, cursorIndex), 'hl')[0]
          text = text.substr(0, tagBeforeStartIndex) + text.substr(tagBeforeStartIndex).replace(fullTag, '')
        } else {
          text = this.addTagsToText(text, selectionStart, selectionEnd)
        }

      } else {
        text = this.addTagsToText(text, selectionStart, selectionEnd)
      }

      this.dlInterface.editNodeContent(node, text)
    }
  }

  addTagsToText(text, startIndex, endIndex) {
    text = text.substr(0, endIndex) + ' ##' + text.substr(endIndex)
    text = text.substr(0, startIndex) + '#hl ' + text.substr(startIndex)
    return text
  }

}