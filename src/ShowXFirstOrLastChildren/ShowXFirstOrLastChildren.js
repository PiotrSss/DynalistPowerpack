
import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class ShowXFirstOrLastChildren {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'ShowXFirstOrLastChildren'
    this.featureTitle = 'Show X first/last children for marked item'

    this.status = false
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
    this.status = true
    this.renderAllShowXItems()
  }

  deactivate() {
    this.status = false
    $('.showXItems-hide').removeClass('showXItems-hide')
    $('.showXItems-wrapper').remove()
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderAllShowXItems()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderAllShowXItems()
    }
  }

  onNodeBlur(node) {
    if (this.status && this.dlInterface.hasTag(node.get_content_parse_tree(), 'show|')) {
      this.renderShowXItems(node)
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderAllShowXItems(node)
    } else if (this.status) {
      onNodeStateInitialized({
        node, callback: () => {
          $(this.dlInterface.getNodeState(node).dom.node_el).children('.showXItems-wrapper').remove()
        }
      })
    }
  }

  renderAllShowXItems(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.dlInterface.hasTag(node.get_content_parse_tree(), 'show|')) {
        this.renderShowXItems(node)
      }
    })
  }

  renderShowXItems(node) {
    onNodeStateInitialized({
      node, callback: () => {
        const nodeState = this.dlInterface.getNodeState(node)
        let tags = this.dlInterface.getFullTagsFromFragment(this.dlInterface.getContentFromNode(node), 'show|')

        for (let tag of tags) {
          let last = false
          let tagArr = tag.split('|')
          let nr = tagArr[tagArr.length - 1] - 1
          if (tag.includes('|last|')) {
            last = true
          }

          let children = node.children.children
          let length = children.length - nr
          let hidden = 0

          children.forEach((node, i) => {
            if ((!last && i > nr) || last && i < length - 1) {
              $(this.dlInterface.getNodeState(node).dom.node_outer_el).addClass('showXItems-hide');
              hidden++;
            } else {
              $(this.dlInterface.getNodeState(node).dom.node_outer_el).removeClass('showXItems-hide');
            }
          });
          if (hidden > 0) {
            $(nodeState.dom.node_el).children('.showXItems-wrapper').remove();
            let $div = $("<div>", { class: "showXItems-wrapper" }).text(hidden + ' item(s) hidden. Click to show all.');
            $div.click(function () {
              $(this).siblings('.Node-children').children().removeClass('showXItems-hide');
              $(this).remove();
            });
            if (last) {
              $div.addClass('showXItems-last');
              $div.insertAfter($(nodeState.dom.self_el));
            } else {
              $div.insertAfter($(nodeState.dom.node_el).children('.Node-children'));
            }
          }
        }

        $(nodeState.dom.self_el).find('.node-tag:contains("show|")').hide()
      }
    })
  }

}