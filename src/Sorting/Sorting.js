
import _ from 'lodash'
let keyboardjs = require('keyboardjs')

import { SortFunctions } from '../SortFunctions'

import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class Sorting {

  constructor({ guiManager, settingsManager, dlInterface }) {
    this.guiManager = guiManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'Sorting'
    this.featureTitle = 'Sorting'

    this.status = false
    this.init()

  }

  async init() {

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        shortcutSortAll: '',
        auto: false
      }
    })

    if (await this.getSetting('status')) {
      this.sortFunctions = new SortFunctions({ dlInterface: this.dlInterface })
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

    const shortcutSortAllFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcutSortAll', label: 'Shortcut for sorting all marked items:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcutSortAll'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    const autoSortingFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'auto', label: 'Enable auto sorting', callbackOn: () => this.activate(), callbackOff: () => this.deactivate()
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, shortcutSortAllFragment, autoSortingFragment] })
  }

  async activate() {
    this.status = true
    this.auto = await this.getSetting('auto')
    this.renderAllSortButtons()

    if (this.auto) {
      this.autoSortAll()
    }
  }

  deactivate() {
    this.status = false
    this.auto = false
    $('.sort-button').remove()
    $('.SortingString-wrapper').show()
  }

  async updateKeyboardBindings() {
    const shortcutSortAll = await this.getSetting('shortcutSortAll')
    keyboardjs.unbind(shortcutSortAll);
    if (shortcutSortAll.length > 0) {
      keyboardjs.bind(shortcutSortAll, async e => {
        e.preventDefault();
        if (this.status) {
          this.sortAll()
        }
      });
    }
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderAllSortButtons()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderAllSortButtons()
    }
  }

  onNodeFocus(node) {
    if (this.status) {
      this.removeSortButtonsFromNode(node)
    }
  }

  onNodeBlur(node) {
    if (this.status && this.dlInterface.hasTag(node.get_content_parse_tree(), 'sort')) {
      this.renderSortButton(node)
    }
    if (this.status && this.auto) {
      let parent = node.parent
      while (parent) {
        if (this.dlInterface.hasTag(parent.get_content_parse_tree(), 'sort|auto')) {
          onNodeStateInitialized({
            node: parent, callback: (nodeState) => {
              let buttons = this.guiManager.getElementsFromNodeAndUnderNodePanel(nodeState, { 'class': 'sort-auto' })
              for (let btn of buttons) {
                $(btn).trigger('mousedown')
              }
            }
          })
        }
        parent = parent.parent
      }
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderAllSortButtons(node)
    }
  }

  autoSortAll() {
    setTimeout(() => {
      $('.sort-auto').trigger('mousedown')
    }, 1500)
  }

  sortAll() {
    $('.sort-button').trigger('mousedown')
  }

  renderAllSortButtons(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.dlInterface.hasTag(node.get_content_parse_tree(), 'sort')) {
        this.renderSortButton(node)
      }
    })
  }

  renderSortButton(node) {
    onNodeStateInitialized({
      node, callback: () => {
        const nodeState = this.dlInterface.getNodeState(node)
        let closedTags = this.dlInterface.getClosedTagsWithContent(this.dlInterface.getContentFromNode(node), 'sort')
        for (let closedTag of closedTags) {
          let tag = this.dlInterface.getFullTagsFromFragment(closedTag, 'sort')[0].trim()
          let options = this.getOptionsFromSortTag(tag, closedTag, node)
          let sortParamsString = closedTag.replace(tag, '').replace(' ##', '').trim()
          let startTag = $($(nodeState.dom.self_el).find('.node-tag:contains("' + tag + '"):not(.SortingTag-start)')[0]).addClass('SortingTag-start')
          let endTag = $($(startTag).nextAll('.node-tag:contains("##"):not(.SortingTag-end)')[0]).addClass('SortingTag-end')
          let elementsBetween = startTag.nextUntil(endTag)
          let wrapper = $(elementsBetween).wrapAll(`<span class="SortingString-wrapper sort-${options.id}" />`).prepend(startTag).append(endTag).parent()

          let sortParams = this.sortFunctions.parseSortParams(sortParamsString)

          let description = this.createDescription(options, sortParams)

          let btn = $(`<button class="sort-button" data-id="${options.id}" data-params="${encodeURIComponent(JSON.stringify(sortParams))}">${description}<span class="sort-info"></span></button>`)

          if (options.auto) {
            btn.addClass('sort-auto')
          }

          btn.on('mousedown', e => {
            e.stopImmediatePropagation()
            btn.children('.sort-info').text('Sorting...').fadeIn(100, () => {
              this.sort(nodeState, sortParams, options.sequence, () => { btn.children('.sort-info').text('Sorted! ✔').delay(1500).fadeOut(600) })
            }).css("display", "inline-block");
          })

          if (options.position == 'under') {
            this.guiManager.appendToUnderNodePanel(nodeState, btn)
          } else {
            $(btn).insertAfter(wrapper)
          }
        }
      }
    })
  }

  createDescription(options, sortParams) {
    let description = ''

    for (let params of sortParams) {
      description += description.length === 0 ? 'by <b>' : ' and <b>'

      if (params.fragment.length > 0) {
        description += params.fragment
      } else {
        description += params.name
      }
      description += ' (' + params.order + ')</b>'
    }

    if (options.sequence) {
      description = 'Sort sequence ' + description
    } else {
      description = 'Sort ' + description.charAt(0).toLowerCase() + description.slice(1)
    }
    if (options.auto) {
      description = '<b>Automatically</b> ' + description.charAt(0).toLowerCase() + description.slice(1)
    }
    return description.replace(/_/g, ' ')
  }

  getOptionsFromSortTag(tag, closedTag, node) {
    let options = { auto: false, position: 'inline', sequence: false, id: this.dlInterface.hashValue(node.created_ts + closedTag) }
    if (tag.includes('|auto')) {
      options.auto = true
    }
    if (tag.includes('|under')) {
      options.position = 'under'
    }
    if (tag.includes('|start')) {
      options.sequence = true
    }
    if (tag.includes('|id:')) {
      options.id = /\|id:(.+?)(\||$|\s)/.exec(tag)[0].replace('|id:', '')
    }
    return options
  }

  removeSortButtonsFromNode(node) {
    onNodeStateInitialized({
      node, callback: async () => {
        const nodeState = this.dlInterface.getNodeState(node)
        if ($(nodeState.dom.self_el).find('.Node-contentContainer').children('.Powerpack-UnderNodePanel').children('.sort-button')) {
          $(nodeState.dom.self_el).find('.Node-contentContainer').children('.Powerpack-UnderNodePanel').children('.sort-button').remove()
        }
      }
    })

  }

  sort(nodeState, sortParamsArr, isSequence, callback) {
    if (isSequence) {
      this.sortSequence(nodeState, sortParamsArr, callback)
    } else {
      this.sortChildren(nodeState, sortParamsArr, callback)
    }
  }

  sortChildren(nodeState, sortParamsArr, callback = () => { }) {
    let nodesToSort = []
    let nextNode = nodeState.node.get_child_first()
    while (nextNode) {
      if (this.dlInterface.hasTag(nextNode.get_content_parse_tree(), 'sort|end')) {
        break
      }
      nodesToSort.push(nextNode)
      nextNode = nextNode.next()
    }
    if (nodesToSort.length === 0) { callback(); return }
    let nodesToSortPrepared = this.sortFunctions.prepareNodesToSort(nodesToSort, sortParamsArr)
    let nodesToSortPreparedClone = [...nodesToSortPrepared]
    let sorted = _.orderBy(nodesToSortPrepared, sortParamsArr.map(p => p.name + p.fragment), sortParamsArr.map(p => p.order))
    if (!_.isEqual(sorted, nodesToSortPreparedClone)) {
      let length = sorted.length - 1
      sorted.forEach((obj, index) => {
        this.dlInterface.moveNodes([obj.node], nodeState.node, index);
        if (index === length && callback) {
          callback()
        }
      })
    } else {
      callback()
    }
  }

  sortSequence(nodeState, sortParamsArr, callback = () => { }) {
    let nodesToSort = []
    let nextNode = nodeState.node.next()
    while (nextNode) {
      if (this.dlInterface.hasTag(nextNode.get_content_parse_tree(), 'sort|end')) {
        break
      }
      nodesToSort.push(nextNode)
      nextNode = nextNode.next()
    }
    if (nodesToSort.length === 0) { callback(); return }
    let nodesToSortPrepared = this.sortFunctions.prepareNodesToSort(nodesToSort, sortParamsArr)
    let nodesToSortPreparedClone = [...nodesToSortPrepared]
    let sorted = _.orderBy(nodesToSortPrepared, sortParamsArr.map(p => p.name + p.fragment), sortParamsArr.map(p => p.order))
    if (!_.isEqual(sorted, nodesToSortPreparedClone)) {
      let parentNode = nodeState.node.parent
      let startNodeIndex = nodeState.node.index;
      let length = sorted.length - 1
      sorted.forEach((obj, index) => {
        this.dlInterface.moveNodes([obj.node], parentNode, startNodeIndex + index + 1);
        if (index === length && callback) {
          callback()
        }
      })
    } else {
      callback()
    }
  }

}