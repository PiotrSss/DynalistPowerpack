
import { generateId } from '../helpers'

export class FoundedNode {
  constructor({ node, dlInterface, archives }) {
    this.node = node
    this.dlInterface = dlInterface
    this.archives = archives
  }

  getContent({ renderTags, removeDates }) {
    if (renderTags && removeDates) {
      let div = $('<div>').html(DYNALIST.app.userspace.ui.node_formatter._render(DYNALIST.app.userspace.ui.node_formatter.render_options, this.node.get_content_parse_tree()))
      div.find('.node-time').remove()
      return div.html()
    } else if (renderTags && !removeDates) {
      return DYNALIST.app.userspace.ui.node_formatter._render(DYNALIST.app.userspace.ui.node_formatter.render_options, this.node.get_content_parse_tree())
    } else if (!renderTags && removeDates) {
      return this.node.get_meta_object().get_content().replace(/!\(.+?\)/gm, '')
    } else if (!renderTags && !removeDates) {
      return this.node.get_meta_object().get_content()
    }
  }

  prepareNodeJqElement({ groupByDoc = false, renderTags = false, removeDates = false, onQueryRefreshNeeded, queryWrapper } = {}) {
    let item = $('<li>', { class: 'result-item', 'node-id': this.node.id, 'document-id': this.node.document.id, 'document-server-id': this.node.document.server_id }).html(this.getContent({ renderTags, removeDates }))
    if (groupByDoc) {
      item.addClass('result-item-indent')
    }
    if (!this.node.fromGoogleCalendar) {
      if (renderTags) {
        if (this.node.get_meta_object().get_color_label() != 0) {
          item.addClass(`has-color color-${this.node.get_meta_object().get_color_label()}`)
        }
        if (this.node.get_meta_object().data.checked) {
          item.addClass('checked')
        }
      }

      this.appendItemTools({ item, onQueryRefreshNeeded, queryWrapper })
      item.on('click', () => {
        this.onAgendaItemClick()
      })
      const checboxId = generateId(5)
      let itemCheckbox = $(`<input class="item-checkbox" id="item-${checboxId}" type="checkbox">`).on('click', (ev) => { ev.stopImmediatePropagation() })
      item.prepend(itemCheckbox)
      if (!queryWrapper.closest('.agenda-view').find('.bulk-actions-wrapper').hasClass('hidden')) {
        item.addClass('show-checkbox')
      }
    } else {
      $(item).attr('google-calendar', this.node.get_meta_object().get_content())
    }
    return item
  }

  appendItemTools({ item, onQueryRefreshNeeded, queryWrapper }) {
    let itemTools = $('<span class="item-tools"></span>')
    let removeItem = $('<i class="fas fa-trash remove-item" title="Remove item"></i>').on('click', (ev) => {
      ev.stopImmediatePropagation()
      if (confirm("Remove item from document? This action can't be undone.")) {
        this.dlInterface.removeNode(this.node)
        this.dlInterface.displayPopup('Item was removed.')
        onQueryRefreshNeeded({ queryWrapper })
      }
    })
    if (item.hasClass('checked')) {
      let uncheckItem = $('<i class="fas fa-square uncheck-item" title="Uncheck item"></i>').on('click', (ev) => {
        ev.stopImmediatePropagation()
        this.dlInterface.setNodeCheckedValue(this.node, false)
        this.dlInterface.displayPopup('Item was unchecked.')
        onQueryRefreshNeeded({ queryWrapper })
      })
      itemTools.append(uncheckItem)
    } else {
      let checkItem = $('<i class="fas fa-check-square check-item" title="Check item"></i>').on('click', (ev) => {
        ev.stopImmediatePropagation()
        this.dlInterface.setNodeCheckedValue(this.node, true)
        this.dlInterface.displayPopup('Item was checked.')
        onQueryRefreshNeeded({ queryWrapper })
      })
      itemTools.append(checkItem)
    }

    let colorUp = $('<i class="fas fa-arrow-alt-circle-up color-up" title="Set higher color"></i>').on('click', (ev) => {
      ev.stopImmediatePropagation()
      if (this.node.get_meta_object().get_color_label() == 0) {
        this.dlInterface.setNodeColorValue(this.node, 6)
      } else {
        this.dlInterface.setNodeColorValue(this.node, this.node.get_meta_object().get_color_label() - 1)
      }
      this.dlInterface.displayPopup('Item color was changed.')
      onQueryRefreshNeeded({ queryWrapper })
    })
    let colorDown = $('<i class="fas fa-arrow-alt-circle-down color-down" title="Set lower color"></i>').on('click', (ev) => {
      ev.stopImmediatePropagation()
      if (this.node.get_meta_object().get_color_label() == 6) {
        this.dlInterface.setNodeColorValue(this.node, 0)
      } else {
        this.dlInterface.setNodeColorValue(this.node, this.node.get_meta_object().get_color_label() + 1)
      }
      this.dlInterface.displayPopup('Item color was changed.')
      onQueryRefreshNeeded({ queryWrapper })
    })
    if (this.node.get_meta_object().get_color_label() === 1) {
      itemTools.append(colorDown)
    } else if (this.node.get_meta_object().get_color_label() === 0) {
      itemTools.append(colorUp)
    } else {
      itemTools.append(colorDown, colorUp)
    }
    if (this.archives.length > 0 && this.archives[0] !== '') {
      console.log(this.archives)
      let archiveItem = $('<i class="fas fa-sign-out-alt archive-item" title="Archive item"></i>').on('click', async (ev) => {
        ev.stopImmediatePropagation()
        if (confirm("Send item to archive? This action can't be undone.")) {
          for (let url of this.archives) {
            let archAppDoc = this.dlInterface.getAppDocumentFromUrl(url)
            let archiveRoot = await this.dlInterface.getRootNodeFromUrl(url)
            if (archiveRoot) {
              let position = DYNALIST.app.preferences.get('move_item_sent_to_position')
              let index = -1
              "bottom" === position ? index = archiveRoot.num_children() : "top" === position && (index = 0)
              archAppDoc.controller.clone_from_nodes([this.node], archiveRoot, index)
            }
          }
          this.node.document.node_collection.remove_node(this.node)
          this.dlInterface.displayPopup('Item was moved to archive.')
          onQueryRefreshNeeded({ queryWrapper })
        }
      })
      itemTools.append(archiveItem)
    }
    itemTools.append(removeItem)
    item.append(itemTools)
  }

  onAgendaItemClick() {
    DYNALIST.app.userspace.view.switch_document(this.node.document)
    let docInterval = setInterval(() => {
      if (this.dlInterface.getCurrentDocument().id === this.node.document.id) {
        clearInterval(docInterval)
        let parentNode = this.node.parent
        DYNALIST.app.userspace.view.url_manager.zoom_node(this.node.document.node_collection.root)
        while (!this.dlInterface.getNodeState(parentNode).is_current_root()) {
          parentNode.set_collapsed(false)
          parentNode = parentNode.parent
        }
        setTimeout(() => { this.dlInterface.setCursorToPositionInNode(this.node, 0) }, 200)
      }
    }, 100)
  }

}