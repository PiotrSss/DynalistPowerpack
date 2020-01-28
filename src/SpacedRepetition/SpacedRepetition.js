import _ from 'lodash'
import $ from 'jquery'
require('jquery-ui')
require('jquery-ui/ui/widgets/sortable')

const moment = require('moment')
moment.locale(window.navigator.language)

let keyboardjs = require('keyboardjs')

import { generateId, onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'
import { clearfix } from '../templates'

export class SpacedRepetition {

  constructor({ attributesManager, settingsManager, dbManager, dlInterface, guiManager }) {
    this.attributesManager = attributesManager
    this.settingsManager = settingsManager
    this.dbManager = dbManager
    this.dlInterface = dlInterface
    this.guiManager = guiManager

    this.featureName = 'SpacedRepetition'
    this.featureTitle = 'Spaced Repetition'

    this.status = false
    this.init()
  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        categories: [],
        showItemSettingsShortcut: '',
        templates: [],
        lastUsedTemplateId: 'default',
        copy: false
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

    const showItemSettingsShortcutFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'showItemSettingsShortcut', label: 'Shortcut to show currently selected node SR settings:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('showItemSettingsShortcut'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, showItemSettingsShortcutFragment] })
  }

  async restorePanel({ position }) {
    if (await this.getSetting('status')) {
      const content = await this.getReviewDashboard()
      this.guiManager.openInPanel({ position, content, featureName: this.featureName })
    }
  }

  activate() {
    this.status = true
    this.allItemsNodesIds = this.attributesManager.getItemsNodesIdsByAttributeId({ attributeId: this.attributesManager.SR_ATTRIBUTE_ID })
    this.guiManager.addMenuItemToContextMenu({
      type: 'node', name: 'Spaced Repetition', icon: '<i class="far fa-lightbulb"></i>', classNames: 'powerpack3-spaced-repetition', callback: async () => {
        const node = DYNALIST.app.app_document.ui.get_context_menu_node()
        const doc = this.dlInterface.getCurrentDocument()
        this.openItemEditPopup({ node, doc })
      }
    })
    this.showSRButtonForDocumentTools()
    this.renderSRButtonInAllNodes()
    let counter = 0
    let interval = setInterval(() => {
      counter++
      if (typeof CKEDITOR === "object") {
        CKEDITOR.disableAutoInline = true
        Object.keys(CKEDITOR.instances).map(name => CKEDITOR.instances[name].destroy())
        clearInterval(interval)
      } else if (counter >= 500) {
        clearInterval(interval)
      }
    }, 10)
    $('head').append('<script src="https://cdn.ckeditor.com/4.9.2/full-all/ckeditor.js" id="ckeditor-script"></script>')
  }

  deactivate() {
    this.status = false
    $('.powerpack3-spaced-repetition').remove()
    $('.sr-icon').remove()
    $('.spaced-repetition-node-icon').remove()
    $('#ckeditor-script').remove()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async updateKeyboardBindings() {
    const showItemSettingsShortcut = await this.getSetting('showItemSettingsShortcut')
    keyboardjs.unbind(showItemSettingsShortcut);
    if (showItemSettingsShortcut.length > 0) {
      keyboardjs.bind(showItemSettingsShortcut, e => {
        e.preventDefault();
        let currentSelection = this.dlInterface.getCurrentSelection()
        if (currentSelection && currentSelection.node) {
          this.openItemEditPopup({ node: currentSelection.node, doc: this.dlInterface.getCurrentDocument() })
        }
      });
    }
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderSRButtonInAllNodes()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderSRButtonInAllNodes()
    }
  }

  async onNodeBlur(node) {
    if (this.status && this.allItemsNodesIds.includes(node.id) && await this.attributesManager.getItem({ nodeId: node.id })) {
      this.renderSRButtonInNode(node)
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderSRButtonInAllNodes(node)
    }
  }

  renderSRButtonInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, async node => {
      if (this.allItemsNodesIds.includes(node.id) && await this.attributesManager.getItem({ nodeId: node.id })) {
        this.renderSRButtonInNode(node)
      }
    })
  }

  renderSRButtonInNode(node) {
    onNodeStateInitialized({
      node, callback: () => {
        if ($(this.dlInterface.getNodeState(node).dom.self_el).children('.spaced-repetition-node-icon').length === 0) {
          const spacedRepetitionIcon = $('<i class="far fa-lightbulb spaced-repetition-node-icon"></i>').attr('data-id', node.id).on('mousedown', () => {
            const doc = this.dlInterface.getCurrentDocument()
            this.openItemEditPopup({ node, doc })
          })
          $(this.dlInterface.getNodeState(node).dom.self_el).append(spacedRepetitionIcon)
        }
      }
    })
  }

  async showSRButtonForDocumentTools() {
    if ($('.powerpack3-document-tools-icons').length === 0) {
      $('.DocumentTools').append($('<div class="powerpack3-document-tools-icons"></div>'))
    }
    const spacedRepetitionIcon = $('<i class="far fa-lightbulb sr-icon"></i>')
    spacedRepetitionIcon.on('mousedown', async (e) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      switch (e.which) {
        case 1:
          const content = await this.getReviewDashboard()
          $(content).find('.spaced-repetition-view-title').remove()
          this.guiManager.showPopup({ content, header: 'Spaced Repetition', featureName: this.featureName, size: '50% 80%', status: '', savePopup: false })
          break
        case 3:
          const menu = await this.getSRIconMenu()
          this.guiManager.showTooltip({ id: 'spaced-repetition-icon-menu', target: spacedRepetitionIcon[0], content: menu, connector: false, position: { my: 'right-top', at: 'left-top' }, mode: 'semisticky' })
          break
      }
    }).on('contextmenu', () => {
      return false
    })
    $('.powerpack3-document-tools-icons').append(spacedRepetitionIcon)
  }



  async openItemEditPopup({ node, doc }) {

    const questionTypeLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-question-type-label' }).text('Question:')
    const questionTextarea = $('<textarea>', { 'class': 'spaced-repetition-add-question-textarea', 'name': 'question-textarea' })
    const questionTypeDropdown = $(`<select class="powerpack3-spaced-repetition-question-type"></select>`).append(
      $('<option value="text">Custom text</option>'),
      $('<option value="node">This node</option>'),
      $('<option value="none">None</option>'),
      $('<option value="childNode">First child node</option>'),
      $('<option value="parentNode">Parent node</option>'),
      $('<option value="note">Note</option>'),
      $('<option value="tag">Tag in this node</option>'),
      $('<option value="siblings">Composition of this node and it\'s siblings</option>'),
    ).val('text')

    const answerTypeLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-answer-type-label' }).text('Answer:')
    const answerTextarea = $('<textarea>', { 'class': 'spaced-repetition-add-answer-textarea', 'name': 'answer-textarea' })
    const answerTypeDropdown = $(`<select class="powerpack3-spaced-repetition-answer-type"></select>`).append(
      $('<option value="childNode">First child node</option>'),
      $('<option value="childNodes">Composition of children</option>'),
      $('<option value="tree">Composition of tree below</option>'),
      $('<option value="text">Custom text</option>'),
      $('<option value="node">This node</option>'),
      $('<option value="parentNode">Parent node</option>'),
      $('<option value="note">Note</option>'),
      $('<option value="tag">Tag in this node</option>'),
      $('<option value="siblings">Composition of this node and it\'s siblings</option>'),
    ).val('node')

    questionTypeDropdown.on('change', () => {
      if (CKEDITOR.instances['question-textarea']) {
        CKEDITOR.instances['question-textarea'].destroy()
      }
      if (questionTypeDropdown.val() === 'text') {
        questionTextarea.show()
        if (!CKEDITOR.instances['question-textarea']) {
          CKEDITOR.replace('question-textarea', {
            extraPlugins: 'mathjax,codesnippet'
          })
        }
      } else {
        questionTextarea.hide()
      }
    })
    answerTypeDropdown.on('change', () => {
      if (answerTypeDropdown.val() === 'text') {
        answerTextarea.show()
        if (!CKEDITOR.instances['answer-textarea']) {
          CKEDITOR.replace('answer-textarea', {
            extraPlugins: 'mathjax,codesnippet'
          })
        }
      } else {
        if (CKEDITOR.instances['answer-textarea']) {
          CKEDITOR.instances['answer-textarea'].destroy()
        }
        answerTextarea.hide()
      }
    })

    const answerByLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-answer-by-label' }).text('Answer by:')
    const answerByRadioButtons = $('<div>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-buttons' })
    const answerByRadioButtonGuess = $('<input>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-button-guess', 'type': 'radio', 'name': 'answer_by', 'value': 'guess' }).prop('checked', true)
    const answerByRadioButtonGuessLabel = $('<label>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-buttons-guess-label' }).text('Guess').prepend(answerByRadioButtonGuess)
    const answerByRadioButtonInput = $('<input>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-button-input', 'type': 'radio', 'name': 'answer_by', 'value': 'input' })
    const answerByRadioButtonInputLabel = $('<label>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-buttons-input-label' }).text('Input').prepend(answerByRadioButtonInput)
    // const answerByRadioButtonInputMultiple = $('<input>', {'class':'powerpack3-spaced-repetition-answer-by-radio-button-input-multiple', 'type':'radio', 'name':'answer_by', 'value': 'inputMultiple'})
    // const answerByRadioButtonInputMultipleLabel = $('<label>', {'class':'powerpack3-spaced-repetition-answer-by-radio-buttons-input-multiple-label'}).text('Input, siblings of answer item are considered good').prepend(answerByRadioButtonInputMultiple)
    answerByRadioButtons.append(answerByRadioButtonGuessLabel, answerByRadioButtonInputLabel)

    const content = $('<div>', { 'class': 'spaced-repetition-add-wrapper' })
    content.append(questionTypeLabel, questionTypeDropdown, questionTextarea, clearfix(), answerTypeLabel, answerTypeDropdown, answerTextarea, clearfix(), answerByLabel, answerByRadioButtons, clearfix())

    const categories = await this.getSetting('categories')
    const categoriesLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-categories-label' }).text('Categories:')
    const checkboxesWrapper = $('<div>', { 'class': 'powerpack3-spaced-repetition-categories-checkboxes-wrapper' })
    categories.map(category => {
      const checkbox = $(`<input type="checkbox" class="powerpack3-spaced-repetition-categories-checkbox" id="cat-${category.id}" data-id=${category.id}>`)
      const checkboxLabel = $(`<label class="powerpack3-spaced-repetition-categories-checkbox-label" for="cat-${category.id}">${category.name}</label>`)
      const checkboxWrapper = $('<div>', { 'class': 'powerpack3-spaced-repetition-categories-checkbox-wrapper' }).append(checkbox, checkboxLabel)
      checkboxesWrapper.append(checkboxWrapper)
    })
    if (categories.length > 0) {
      content.append(categoriesLabel, checkboxesWrapper)
    }

    const saveBtn = $('<button>', { 'class': 'spaced-repetition-add-save-btn' }).text('Save').on('mousedown', () => {
      const categories = []
      $('.powerpack3-spaced-repetition-categories-checkbox').map((index, checkbox) => {
        if ($(checkbox).prop('checked')) {
          categories.push($(checkbox).attr('data-id'))
        }
      })
      let questionTextVal = ''
      if (questionTypeDropdown.val() === 'text') {
        questionTextVal = CKEDITOR.instances["question-textarea"].getData()
      }
      let answerTextVal = ''
      if (answerTypeDropdown.val() === 'text') {
        answerTextVal = CKEDITOR.instances["answer-textarea"].getData()
      }
      let copy = false
      if ($('.powerpack3-spaced-repetition-copy-node-checkbox').length > 0 && $('.powerpack3-spaced-repetition-copy-node-checkbox').prop('checked')) {
        copy = true
      }
      this.saveItem({ copy, nodeId: node.id, documentId: doc.id, documentServerId: doc.server_id, categories, questionType: questionTypeDropdown.val(), questionText: questionTextVal, answerType: answerTypeDropdown.val(), answerText: answerTextVal, answerBy: $(answerByRadioButtons).find('input:checked').val() })
      $('#powerpack3-spaced-repetition-add-question-popup')[0].close()
      if (!item) {
        // this.dlInterface.getNodeState(node).dom.$content_el.blur()
        this.renderSRButtonInNode(node)
        // const nodeState = this.dlInterface.getNodeState(node)
        // if (nodeState) {
        //   this.onRenderedNodeUnfocus(nodeState)
        // }
      }
      if (this.dlInterface.getNodeState(node)) {
        setTimeout(() => {
          this.dlInterface.setCursorToPositionInNode(node, 0)
        }, 300)
      }
      // this.dlInterface.getNodeState(node).dom.$content_el.blur()
    })
    content.append(saveBtn)

    const item = await this.attributesManager.getItem({ nodeId: node.id })
    if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
      questionTypeDropdown.val(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type)
      questionTextarea.text(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_text)
      answerTypeDropdown.val(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type)
      answerTextarea.text(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_text)
      $(answerByRadioButtons).find(`input[value="${item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_by}"]`).prop('checked', true)
      item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories.map(categoryId => {
        $(checkboxesWrapper).find(`.powerpack3-spaced-repetition-categories-checkbox#cat-${categoryId}`).prop('checked', true)
      })
      const removeBtn = $('<button>', { 'class': 'spaced-repetition-add-remove-btn' }).text('Remove').on('mousedown', () => {
        if (confirm("Remove item from Spaced Repetition? This action can't be undone.")) {
          this.attributesManager.removeAttribute({ attrId: this.attributesManager.SR_ATTRIBUTE_ID, nodeId: node.id })
          $(`.spaced-repetition-node-icon[data-id="${node.id}"]`).remove()
          $('#powerpack3-spaced-repetition-add-question-popup')[0].close()
          if (this.allItemsNodesIds.includes(node.id)) {
            delete this.allItemsNodesIds[node.id]
          }
        }
      })
      content.append(removeBtn)
    }

    const closeBtn = $('<button>', { 'class': 'spaced-repetition-add-close-btn' }).text('Close popup').on('mousedown', () => {
      $('#powerpack3-spaced-repetition-add-question-popup')[0].close()
    })
    content.append(closeBtn)
    this.guiManager.showPopup({
      id: 'powerpack3-spaced-repetition-add-question-popup', content: $(content)[0], header: 'Spaced Repetition', size: 'auto', position: 'center', savePopup: false,
      callback: async () => {
        CKEDITOR.disableAutoInline = true
        CKEDITOR.config.height = 45
        CKEDITOR.config.width = '500px'
        CKEDITOR.config.removeButtons = 'About,ShowBlocks,Maximize,PageBreak,Flash,Anchor,Form,TextField,Textarea,Select,Button,ImageButton,HiddenField,Templates,Print,Preview,DocProps,NewPage,Save'
        CKEDITOR.config.mathJaxClass = 'my-math';
        CKEDITOR.config.mathJaxLib = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=TeX-MML-AM_CHTML'
        CKEDITOR.addCss('body {margin: 3px 10px;}')
        if (questionTypeDropdown.val() === 'text') {
          questionTextarea.show()
          CKEDITOR.replace('question-textarea', {
            extraPlugins: 'mathjax,codesnippet'
          })
        } else {
          questionTextarea.hide()
        }
        if (answerTypeDropdown.val() === 'text') {
          answerTextarea.show()
          CKEDITOR.replace('answer-textarea', {
            extraPlugins: 'mathjax,codesnippet'
          })
        } else {
          answerTextarea.hide()
        }
        if (!item) {
          const templatesTypeLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-template-dropdown-label' }).text('Template:')
          const templatesTypeDropdown = $(`<select class="powerpack3-spaced-repetition-template-dropdown"></select>`).append($('<option value="default">Default</option>')).val('default')
          const templates = await this.getSetting('templates')
          const lastUsedTemplateId = await this.getSetting('lastUsedTemplateId')
          templatesTypeDropdown.on('change', () => {
            this.updateSetting({ name: 'lastUsedTemplateId', value: templatesTypeDropdown.val() })
            questionTypeDropdown.val('text').change()
            answerTypeDropdown.val('node').change()
            $(answerByRadioButtons).find(`input[value="guess"]`).prop('checked', true)
            $(checkboxesWrapper).find(`.powerpack3-spaced-repetition-categories-checkbox`).prop('checked', false)
            templates.map(template => {
              if (template.id === templatesTypeDropdown.val()) {
                templatesTypeDropdown.val(template.id)
                questionTypeDropdown.val(template.question_type).change()
                if (questionTypeDropdown.val() === 'text') {
                  questionTextarea.val(template.question_text)
                }
                answerTypeDropdown.val(template.answer_type).change()
                $(answerByRadioButtons).find(`input[value="${template.answer_by}"]`).prop('checked', true)
                template.categories.map(categoryId => {
                  $(checkboxesWrapper).find(`.powerpack3-spaced-repetition-categories-checkbox#cat-${categoryId}`).prop('checked', true)
                })
              }
            })
          })
          templates.map(template => {
            templatesTypeDropdown.append($(`<option value="${template.id}">${template.name}</option>`))
            if (template.id === lastUsedTemplateId) {
              templatesTypeDropdown.val(template.id).change()
            }
          })
          content.prepend(templatesTypeLabel, templatesTypeDropdown)
          content.addClass('new-item')
          const copyCheckbox = $(`<input type="checkbox" class="powerpack3-spaced-repetition-copy-node-checkbox" id="copy-node">`)
          const copyCheckboxLabel = $(`<label class="powerpack3-spaced-repetition-copy-node-checkbox-label" for="copy-node">Copy node to database</label>`)
          const copyWrapper = $('<div>', { 'class': 'powerpack3-spaced-repetition-copy-node-wrapper' }).append(copyCheckbox, copyCheckboxLabel)
          content.prepend(copyWrapper)
          if (await this.getSetting('copy')) {
            copyCheckbox.prop('checked', true)
          }
        }
      },
      onBeforeClose: () => {
        CKEDITOR.disableAutoInline = true
        Object.keys(CKEDITOR.instances).map(name => CKEDITOR.instances[name].destroy())
      }
    })
  }

  async getSRIconMenu() {
    const menuWrapper = $('<div>', { 'class': 'spaced-repetition-icon-menu' })
    const title = $('<div>', { 'class': 'spaced-repetition-icon-menu-element-title' }).text('Spaced Repetition Dashboard')
    const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>').on('mousedown', async () => {
      const content = await this.getReviewDashboard()
      this.guiManager.openInPanel({ position: 'top', content, featureName: this.featureName })
    })
    const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>').on('mousedown', async () => {
      const content = await this.getReviewDashboard()
      this.guiManager.openInPanel({ position: 'bottom', content, featureName: this.featureName })
    })
    const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>').on('mousedown', async () => {
      const content = await this.getReviewDashboard()
      this.guiManager.openInPanel({ position: 'left', content, featureName: this.featureName })
    })
    const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>').on('mousedown', async () => {
      const content = await this.getReviewDashboard()
      this.guiManager.openInPanel({ position: 'right', content, featureName: this.featureName })
    })
    const popupButton = $('<i class="far fa-window-restore"></i>').on('mousedown', async () => {
      const content = await this.getReviewDashboard()
      $(content).find('.spaced-repetition-view-title').remove()
      this.guiManager.showPopup({ content, header: 'Spaced Repetition', featureName: this.featureName, size: '50% 80%', status: '', savePopup: false })
    })
    const buttons = $('<div>', { 'class': 'spaced-repetition-icon-menu-element-buttons' }).append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton, popupButton)
    const wrapper = $('<div>', { 'class': 'spaced-repetition-icon-menu-element' }).append(title, buttons, clearfix())
    menuWrapper.append(wrapper)
    return menuWrapper[0]
  }

  async getReviewDashboard() {

    const items = await this.attributesManager.getItemsByAttributeId({ attributeId: this.attributesManager.SR_ATTRIBUTE_ID })
    const categories = await this.getSetting('categories')

    const dashboardWrapper = $('<div>', { 'class': 'spaced-repetition-dashboard' })

    const categoriesManagerBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button spaced-repetition-dashboard-categories-manager-button' }).text('Categories').on('mousedown', async () => {
      $(dashboardWrapper).parent().html(await this.getCategoriesManager())
    })
    const templatesManagerBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button spaced-repetition-dashboard-templates-manager-button' }).text('Templates').on('mousedown', async () => {
      $(dashboardWrapper).parent().html(await this.getTemplatesManager())
    })
    const browseItemsBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button spaced-repetition-dashboard-browse-items-button' }).text('Browse items').on('mousedown', async () => {
      $(dashboardWrapper).parent().html(await this.getItemsBrowser())
    })
    const refreshBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button spaced-repetition-dashboard-refresh-button' }).text('Refresh dashboard').on('mousedown', async () => {
      this.dlInterface.displayPopup('Dashboard refreshed')
      $(dashboardWrapper).parent().html(await this.getReviewDashboard())
    })
    const cleanupBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button spaced-repetition-dashboard-clean-up-database-button' }).text('Clean up database').on('mousedown', () => {
      this.attributesManager.cleanup({ forced: true })
      this.dlInterface.displayPopup('Database cleaned')
      setTimeout(async () => $(dashboardWrapper).parent().html(await this.getReviewDashboard()), 2000)
    })

    const topButtons = $('<div>', { 'class': 'spaced-repetition-dashboard-top-buttons' }).append(categoriesManagerBtn, templatesManagerBtn, browseItemsBtn, refreshBtn, cleanupBtn)

    dashboardWrapper.append(topButtons)

    const now = moment()

    const allCount = items.length
    const allToReviewItems = items.filter(item => {
      if (moment(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].next_review).isBefore(now)) {
        return item
      }
    })
    const allToReviewCount = allToReviewItems.length
    const allItemsWrapper = $('<div>', { 'class': 'spaced-repetition-dashboard-category-row' }).append(`<span class="category-name">All items</span>`)
    if (allToReviewCount > 0) {
      const reviewBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button category-review-btn' }).text('Review').on('mousedown', async () => {
        $(dashboardWrapper).parent().html('<div class="loader" style="display:block"></div>').html(await this.getReviewBrowser({ categoryName: 'All items', items: _.orderBy(allToReviewItems, [(item) => { return item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].next_review }], ['asc']) }))
      })
      allItemsWrapper.append(reviewBtn)
    }
    if (allToReviewCount > 0) {
      allItemsWrapper.append(`<span class="category-count"><span class="category-count-review">${allToReviewCount}</span> / <span class="category-count-all">${allCount}</span></span>`, clearfix())
    } else {
      allItemsWrapper.append(`<span class="category-count"><span class="category-count-all">${allCount}</span></span>`, clearfix())
    }
    dashboardWrapper.append(allItemsWrapper)

    categories.map(category => {
      const categoryItems = items.filter(item => {
        if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories.includes(category.id)) {
          return item
        }
      })
      const categoryCount = categoryItems.length
      const categoryToReviewItems = categoryItems.filter(item => {
        if (moment(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].next_review).isBefore(now)) {
          return item
        }
      })
      const categoryToReviewCount = categoryToReviewItems.length
      const categoryItemsWrapper = $('<div>', { 'class': 'spaced-repetition-dashboard-category-row' }).append(`<span class="category-name">${category.name}</span>`)
      if (categoryToReviewCount > 0) {
        const reviewBtn = $('<button>', { 'class': 'spaced-repetition-dashboard-utility-button category-review-btn' }).text('Review').on('mousedown', async () => {
          $(dashboardWrapper).parent().html('<div class="loader" style="display:block"></div>').html(await this.getReviewBrowser({ categoryName: category.name, items: _.orderBy(categoryToReviewItems, [(item) => { return item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].next_review }], ['asc']) }))
        })
        categoryItemsWrapper.append(reviewBtn)
      }
      if (categoryToReviewCount > 0) {
        categoryItemsWrapper.append(`<span class="category-count"><span class="category-count-review">${categoryToReviewCount}</span> / <span class="category-count-all">${categoryCount}</span></span>`, clearfix())
      } else {
        categoryItemsWrapper.append(`<span class="category-count"><span class="category-count-all">${categoryCount}</span></span>`, clearfix())
      }
      dashboardWrapper.append(categoryItemsWrapper)
    })

    return dashboardWrapper[0]
  }



  async getCategoriesManager() {

    const categories = await this.getSetting('categories')

    const categoriesManagerWrapper = $('<div>', { 'class': 'spaced-repetition-categories-manager' })

    const backToDashboardBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-categories-manager-back-to-dashboard-button' }).text('← back to dashboard').on('mousedown', async () => {
      $(categoriesManagerWrapper).parent().html(await this.getReviewDashboard())
    })
    categoriesManagerWrapper.append(backToDashboardBtn, clearfix())

    const categoriesRows = $('<ul>', { 'class': 'spaced-repetition-dashboard-manage-categories-rows' }).sortable({
      handle: ".handle", stop: async (event, ui) => {
        await this.saveCategories()
      }
    })
    const addCategoryBtn = $('<button>').text('Add category').on('mousedown', () => {
      categoriesRows.append(this.createCategory({ id: generateId(), name: '' }))
    })
    const saveCategoriesBtn = $('<button>', { 'class': '' }).text('Save categories').on('mousedown', async () => {
      await this.saveCategories()
    })
    categories.map(category => {
      categoriesRows.append(this.createCategory({ id: category.id, name: category.name }))
    })

    return categoriesManagerWrapper.append(categoriesRows, clearfix(), addCategoryBtn, saveCategoriesBtn)
  }



  async getTemplatesManager() {

    const templates = await this.getSetting('templates')

    const templatesManagerWrapper = $('<div>', { 'class': 'spaced-repetition-templates-manager' })

    const backToDashboardBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-templates-manager-back-to-dashboard-button' }).text('← back to dashboard').on('mousedown', async () => {
      $(templatesManagerWrapper).parent().html(await this.getReviewDashboard())
    })
    templatesManagerWrapper.append(backToDashboardBtn, clearfix())

    const templatesRows = $('<ul>', { 'class': 'spaced-repetition-templates-manager-templates-rows' }).sortable({
      handle: ".handle", stop: async (event, ui) => {
        await this.saveTemplates()
      }
    })
    const addTemplateBtn = $('<button>').text('Add template').on('mousedown', async () => {
      templatesRows.append(await this.createTemplate({ id: generateId(), name: '' }))
    })
    const saveTemplatesBtn = $('<button>', { 'class': '' }).text('Save templates').on('mousedown', async () => {
      await this.saveTemplates()
    })
    templates.map(async template => {
      templatesRows.append(await this.createTemplate({ id: template.id, name: template.name, question_type: template.question_type, question_text: template.question_text, answer_type: template.answer_type, answer_by: template.answer_by, selectedCategories: template.categories }))
    })

    return templatesManagerWrapper.append(templatesRows, clearfix(), addTemplateBtn, saveTemplatesBtn)
  }



  async getReviewBrowser({ categoryName, items }) {

    const reviewBrowserWrapper = $('<div>', { 'class': 'spaced-repetition-review-browser' })

    const backToDashboardBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-back-to-dashboard-button' }).text('← back to dashboard').on('mousedown', async () => {
      $(reviewBrowserWrapper).parent().html(await this.getReviewDashboard())
    })
    reviewBrowserWrapper.append(backToDashboardBtn, clearfix())

    if (items.length === 0) {
      return reviewBrowserWrapper.append($('<h4>').text('There are no items to review :)'))
    }

    let item = items.shift()
    let node = await this.getNode({ item })
    while (!node || node.index === -1) {
      if (items.length === 0) {
        return reviewBrowserWrapper.append($('<h4>').text('There are no items to review :)'))
      }
      item = items.shift()
      node = await this.getNode({ item })
    }
    const categories = await this.getSetting('categories')
    const itemCategoriesNames = categories.filter(category => {
      if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories.includes(category.id)) {
        return true
      }
    }).map(category => category.name)

    const question = $('<div>', { 'class': 'spaced-repetition-review-browser-question' }).html(await this.getQuestion({ item, node }))
    $(question).find('code').addClass('node-inline-code')
    if ($(question).find('.node-inline-code').length > 0) {
      const codeHighlightingFeature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === 'CodeHighlighting')[0]
      $(question).find('.node-inline-code').each((i, block) => {
        codeHighlightingFeature.highlightCode(block)
      })
    }
    this.addAudioPlayer({ element: question })
    this.addTTSPlayer({ element: question })

    const answerWrapper = $('<div>', { 'class': 'spaced-repetition-review-browser-answer-wrapper' }).hide()

    let answer = $('<div>', { 'class': 'spaced-repetition-review-browser-answer' }).html(await this.getAnswer({ item, node }))
    $(answer).find('code').addClass('node-inline-code')
    if ($(answer).find('.node-inline-code').length > 0) {
      const codeHighlightingFeature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === 'CodeHighlighting')[0]
      $(answer).find('.node-inline-code').each((i, block) => {
        codeHighlightingFeature.highlightCode(block)
      });
    }
    this.addAudioPlayer({ element: answer })
    this.addTTSPlayer({ element: answer })
    answerWrapper.append(answer)

    const ratingWrapper = $('<div>', { 'class': 'spaced-repetition-review-browser-answer-ratings-wrapper' })
    const ratingLabel = $('<h4>', { 'class': 'spaced-repetition-review-browser-answer-ratings-header' }).text('How familiar are you with the answer?')
    const ratings = $('<div>', { 'class': 'spaced-repetition-review-browser-answer-ratings' })
    for (let index = 0; index <= 10; index++) {
      const simInterval = this.getItemDataAfterReview({
        difficulty: item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].difficulty,
        lastReview: moment(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].last_review),
        interval: item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].interval,
        performanceRating: index / 10
      }).interval
      const ratingBtn = $('<button>').html(`${index} <span>${simInterval}d</span>`).on('mousedown', async () => {
        const performanceRating = index / 10
        const calculated = this.getItemDataAfterReview({
          difficulty: item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].difficulty,
          lastReview: moment(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].last_review),
          interval: item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].interval,
          performanceRating
        })
        console.log(calculated)
        this.saveItem({
          nodeId: item.node_id, documentId: item.document_id, documentServerId: item.document_server_id,
          history: item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].history.concat({ date: moment(), result: index }), lastReview: moment(), nextReview: calculated.nextReview, difficulty: calculated.difficulty, interval: calculated.interval
        })
        if (performanceRating === 0) {
          item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].difficulty = calculated.difficulty
          item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].interval = calculated.interval
          item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].lastReview = moment()
          items.push(item)
        }
        $(reviewBrowserWrapper).parent().html('<div class="loader" style="display:block"></div>').html(await this.getReviewBrowser({ categoryName, items }))
      })
      ratings.append(ratingBtn)
    }

    ratingWrapper.append(ratingLabel, ratings)

    answerWrapper.append(ratingWrapper)

    const questionWrapper = $('<div>', { 'class': 'spaced-repetition-review-browser-question-wrapper' }).append(question)

    const answerByInputInput = $('<input>', { 'class': 'spaced-repetition-review-browser-answer-by-input-input' })
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_by === 'input') {
      const answerByInputWrapper = $('<div>', { 'class': 'spaced-repetition-review-browser-answer-by-input-wrapper' })
      questionWrapper.append(answerByInputWrapper.append(answerByInputInput))
    }

    const checkAnswerBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-check-button' }).text('Check')
    checkAnswerBtn.on('mousedown', async () => {
      answerWrapper.show()
      $('.spaced-repetition-review-browser a[title="Filter #sr"]').nextUntil('.spaced-repetition-review-browser a[title="Filter ##"]').addBack().add('.spaced-repetition-review-browser a[title="Filter ##"]').remove()
      checkAnswerBtn.remove()
      if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_by === 'input') {
        if (await this.isInputAnswerCorrect({ item, node, inputAnswer: answerByInputInput.val() })) {
          answerByInputInput.addClass('correct')
        } else {
          answerByInputInput.addClass('wrong')
        }
      }
    })
    answerByInputInput.keypress((e) => {
      if (e.which == 13) {
        checkAnswerBtn.mousedown()
      }
    })
    const skipBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-skip-button' }).text('Skip').on('mousedown', async () => {
      $(reviewBrowserWrapper).parent().html('<div class="loader" style="display:block"></div>').html(await this.getReviewBrowser({ categoryName, items }))
    })
    const goToNextBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-go-to-next-button' }).text('Go to next').on('mousedown', async () => {
      items.push(item)
      $(reviewBrowserWrapper).parent().html('<div class="loader" style="display:block"></div>').html(await this.getReviewBrowser({ categoryName, items }))
    })
    const editBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-edit-button' }).text('Edit item').on('mousedown', () => {
      const document = this.dlInterface.getDocuments().filter(document => document.server_id === item.document_server_id)[0]
      this.openItemEditPopup({ node, doc: document })
    })
    const goToItemBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-go-to-item-button' }).text('Go to item').on('mousedown', () => {
      const document = this.dlInterface.getDocuments().filter(document => document.server_id === item.document_server_id)[0]
      DYNALIST.app.userspace.view.switch_document(document)
      let docInterval = setInterval(() => {
        if (this.dlInterface.getCurrentDocument().id === document.id) {
          clearInterval(docInterval)
          let parentNode = node.parent
          DYNALIST.app.userspace.view.url_manager.zoom_node(document.node_collection.root)
          while (!this.dlInterface.getNodeState(parentNode).is_current_root()) {
            parentNode.set_collapsed(false)
            parentNode = parentNode.parent
          }
          setTimeout(() => { this.dlInterface.setCursorToPositionInNode(node, 0) }, 200)
        }
      }, 100)
    })

    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'none') {
      checkAnswerBtn.hide()
      questionWrapper.hide()
      answerWrapper.show()
      answer.addClass('without-border-top')
    }

    reviewBrowserWrapper.append(questionWrapper)
    if (itemCategoriesNames.length > 0) {
      const itemCategoriesWrapper = $('<div>', { 'class': 'spaced-repetition-review-browser-item-categories-wrapper' }).text(`Categories: ${itemCategoriesNames.join(', ')}`)
      reviewBrowserWrapper.append(itemCategoriesWrapper)
    }
    reviewBrowserWrapper.append(answerWrapper, checkAnswerBtn, skipBtn, goToNextBtn, editBtn, goToItemBtn)

    return reviewBrowserWrapper
  }

  addAudioPlayer({ element }) {
    if ($(element).find('a[title*="#play|"]').length > 0) {
      const audioPlayersFeature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === 'AudioPlayers')[0]
      $(element).find('a[title*="#play|"]').map((i, tag) => {
        $(audioPlayersFeature.createAudioPlayer({ url: $(tag).text().replace('#play|', '') })).insertBefore(tag)
        $(tag).remove()
      })
    }
    if ($(element).find(':contains("#play|")').length > 0) {
      const audioPlayersFeature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === 'AudioPlayers')[0]
      $(element).find(':contains("#play|")').map((i, tag) => {
        if ($(tag).children().length > 0) { return }
        this.dlInterface.getFullTagsFromFragment($(tag).text(), 'play|').map(fragment => {
          $(tag).text($(tag).text().replace(fragment, ''))
          $(tag).append(audioPlayersFeature.createAudioPlayer({ url: fragment.replace('#play|', '').trim() }))
        })
      })
    }
  }
  addTTSPlayer({ element }) {
    if ($(element).find('a[title*="#speak"]').length > 0) {
      const audioPlayersFeature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === 'AudioPlayers')[0]
      $(element).find('a[title*="#speak"]').map(async (i, tag) => {
        const text = $(tag).parent().text().replace($(tag).text(), '')
        const options = $(tag).text().split('|')
        let lang = await audioPlayersFeature.getSetting('tts_lang')
        let rate = 1
        options.map(opt => {
          if (opt.includes('-')) { lang = opt }
          if (opt.includes('rate:')) { rate = parseFloat(opt.replace('rate:', '')) }
        })
        const player = audioPlayersFeature.createTTSPlayer({ text, lang, rate })
        $(player).insertBefore(tag)
        $(tag).remove()
      })
    }
    if ($(element).find(':contains("#speak")').length > 0) {
      const audioPlayersFeature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === 'AudioPlayers')[0]
      $(element).find(':contains("#speak")').map((i, tag) => {
        if ($(tag).children().length > 0) { return }
        this.dlInterface.getFullTagsFromFragment($(tag).text(), 'speak').map(async fragment => {
          $(tag).text($(tag).text().replace(fragment, ''))
          const text = $(tag).text()
          const options = fragment.split('|')
          let lang = await audioPlayersFeature.getSetting('tts_lang')
          let rate = 1
          options.map(opt => {
            if (opt.includes('-')) { lang = opt }
            if (opt.includes('rate:')) { rate = parseFloat(opt.replace('rate:', '')) }
          })
          const player = audioPlayersFeature.createTTSPlayer({ text, lang, rate })
          $(tag).append(player)
        })
      })
    }
  }

  async getItemsBrowser() {
    const categories = await this.getSetting('categories')

    const itemsBrowserWrapper = $('<div>', { 'class': 'spaced-repetition-items-browser' })

    const backToDashboardBtn = $('<button>', { 'class': 'spaced-repetition-items-browser-utility-button spaced-repetition-items-browser-back-to-dashboard-button' }).text('← back to dashboard').on('mousedown', async () => {
      $(itemsBrowserWrapper).parent().html(await this.getReviewDashboard())
    })

    itemsBrowserWrapper.append(backToDashboardBtn)

    const itemsListWrapper = $('<div>', { 'class': 'spaced-repetition-items-list-wrapper' })

    this.renderItems({ itemsListWrapper })

    const categoriesDropdown = $(`<select class="spaced-repetition-items-browser-categories-dropdown"></select>`).append(
      $('<option value="all">All</option>')
    ).val('all').on('change', () => {
      if (categoriesDropdown.val() === 'all') {
        this.renderItems({ itemsListWrapper })
      } else {
        this.renderItems({ categoryId: categoriesDropdown.val(), itemsListWrapper })
      }
    })

    categories.map(category => {
      categoriesDropdown.append($(`<option value="${category.id}">${category.name}</option>`))
    })

    itemsBrowserWrapper.append(categoriesDropdown, clearfix(), itemsListWrapper)

    return itemsBrowserWrapper
  }

  async renderItems({ categoryId, itemsListWrapper, selectedPage = 1 }) {

    itemsListWrapper.html('<div class="loader" style="display:block"></div>')

    let items = await this.attributesManager.getItemsByAttributeId({ attributeId: this.attributesManager.SR_ATTRIBUTE_ID })

    if (categoryId) {
      items = items.filter(item => {
        if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories.includes(categoryId)) {
          return item
        }
      })
    }

    let page = 1
    let count = 0
    const itemsPaginated = { 1: [] }
    items.map((item, index) => {
      if (!itemsPaginated[page]) {
        itemsPaginated[page] = []
      }
      itemsPaginated[page].push(item)
      count++
      if (count >= 30) {
        page++
        count = 0
      }
    })

    const paginationSlider = $('<div>', { 'class': 'spaced-repetition-items-list-pagination-slider' })
    if (Object.keys(itemsPaginated).length > 1) {
      for (let index = 1; index <= Object.keys(itemsPaginated).length; index++) {
        const paginationItem = $('<span>', { 'class': 'spaced-repetition-items-list-pagination-slider-item' }).text(index).on('mousedown', () => {
          this.renderItems({ categoryId, itemsListWrapper, selectedPage: index })
        })
        if (index === selectedPage) {
          paginationItem.addClass('selected-page')
        }
        paginationSlider.append(paginationItem)
      }
    }

    const itemsList = $('<ul>', { 'class': 'spaced-repetition-items-list' })
    itemsPaginated[selectedPage].map(async (item, index) => {
      const node = await this.getNode({ item })
      if (node && node.index !== -1) {
        // console.log(item)
        // console.log(node)
        const itemElBody = $('<div>', { 'class': 'spaced-repetition-items-list-item-body' }).hide()
        const openIcon = $('<i class="spaced-repetition-items-list-open-icon fas fa-caret-down fa-caret-right"></i>')
        openIcon.on('mousedown', () => {
          openIcon.toggleClass('fa-caret-right')
          itemElBody.toggle()
        })

        const document = _.find(this.dlInterface.getDocuments(), document => document.server_id === item.document_server_id)

        const goToItemBtn = $('<button>').text('Go to item').on('mousedown', () => {
          DYNALIST.app.userspace.view.switch_document(document)
          let docInterval = setInterval(() => {
            if (this.dlInterface.getCurrentDocument().id === document.id) {
              clearInterval(docInterval)
              DYNALIST.app.userspace.view.url_manager.zoom_node(node)
              // let parentNode = node.parent
              // DYNALIST.app.userspace.view.url_manager.zoom_node(document.node_collection.root)
              // while (!this.dlInterface.getNodeState(parentNode).is_current_root()) {
              //   parentNode.set_collapsed(false)
              //   parentNode = parentNode.parent
              // }
              // setTimeout(() => { this.dlInterface.setCursorToPositionInNode(node, 0) }, 200)
            }
          }, 100)
        })
        const editBtn = $('<button>').text('Edit').on('mousedown', () => {
          this.openItemEditPopup({ node, doc: document })
        })
        const removeBtn = $('<button>').text('Remove')

        const doc = $('<div>').text(`Document: ${this.dlInterface.getDocuments().filter(document => document.server_id === item.document_server_id)[0].title}`)
        const lastReview = $('<div>').text(`Last review: ${moment(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].last_review).format('DD-MM-YYYY HH:mm')}`)
        const nextReview = $('<div>').text(`Next review: ${moment(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].next_review).format('DD-MM-YYYY HH:mm')}`)
        const allCategories = await this.getSetting('categories')
        const categoriesList = allCategories.filter(category => {
          if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories.includes(category.id)) { return true }
        }).map(category => category.name).join()
        const categories = $('<div>').text(`Categories: ${categoriesList}`)
        const question = await this.getQuestion({ item, node })
        const questionBody = $('<div>', { 'class': 'question-body' }).html(question)
        $(questionBody).find('code').addClass('node-inline-code')
        if ($(questionBody).find('.node-inline-code').length > 0) {
          const codeHighlightingFeature = _.find(DYNALIST.Powerpack3.features, feature => feature.featureName === 'CodeHighlighting')
          $(questionBody).find('.node-inline-code').each((i, block) => {
            codeHighlightingFeature.highlightCode(block)
          })
        }
        this.addAudioPlayer({ element: questionBody })
        this.addTTSPlayer({ element: questionBody })
        const questionLabel = $('<div>').text(`Question (${item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type}): `)
        const questionWrapper = $('<div>').append(questionLabel, questionBody)
        const difficultyWrapper = $('<div>').append(`Current difficulty level: ${item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].difficulty}`)
        const historyWrapper = $('<ul>', { 'class': 'history-wrapper' }).text('History of reviews:')
        item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].history.map(occurence => {
          historyWrapper.append(`<li>Date: ${moment(occurence.date).format('DD-MM-YYYY HH:mm')}, Result: ${(occurence.result)}</li>`)
        })

        const answer = await this.getAnswer({ item, node })
        const answerBody = $('<div>', { 'class': 'answer-body' }).html(answer)
        $(answerBody).find('code').addClass('node-inline-code')
        if ($(answerBody).find('.node-inline-code').length > 0) {
          const codeHighlightingFeature = _.find(DYNALIST.Powerpack3.features, feature => feature.featureName === 'CodeHighlighting')
          $(answerBody).find('.node-inline-code').each((i, block) => {
            codeHighlightingFeature.highlightCode(block)
          })
        }
        this.addAudioPlayer({ element: answerBody })
        this.addTTSPlayer({ element: answerBody })

        const buttonsWrapper = $('<div>', { 'class': 'buttons-wrapper' }).append(clearfix(), goToItemBtn, editBtn, removeBtn)
        const utilitiesWrapper = $('<div>', { 'class': 'utilities-wrapper' }).append(buttonsWrapper, clearfix(), goToItemBtn, editBtn, removeBtn, clearfix(), doc, lastReview, nextReview, categories, difficultyWrapper, historyWrapper)

        itemElBody.append(answerBody, utilitiesWrapper)

        if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'none') {
          questionBody.html($(answer))
          answerBody.remove()
        }

        const titleEl = $(`<span class="spaced-repetition-items-list-item-question"></span>`).append(questionBody).on('mousedown', () => {
          openIcon.toggleClass('fa-caret-right')
          itemElBody.slideToggle()
        })
        const itemEl = $('<li>', { 'class': 'spaced-repetition-items-list-item' }).append(openIcon, titleEl, clearfix(), itemElBody, clearfix())

        removeBtn.on('mousedown', () => {
          if (confirm("Remove item from Spaced Repetition? This action can't be undone.")) {
            this.attributesManager.removeAttribute({ attrId: this.attributesManager.SR_ATTRIBUTE_ID, nodeId: node.id })
            $(`.spaced-repetition-node-icon[data-id="${node.id}"]`).remove()
            itemEl.remove()
            if (this.allItemsNodesIds.includes(node.id)) {
              delete this.allItemsNodesIds[node.id]
            }
          }
        })

        itemsList.append(itemEl)
      }
    })

    itemsListWrapper.html('').append(itemsList, paginationSlider)
  }

  getNode({ item }) {
    const doc = this.dlInterface.getDocuments().filter(document => document.server_id === item.document_server_id)
    if (doc.length > 0) {
      return new Promise(resolve => {
        const interval = setInterval(() => {
          if (doc[0].node_collection.available) {
            clearInterval(interval)
            resolve(doc[0].node_collection.nodes[item.node_id])
          } else {
            DYNALIST.app.find_or_add_app_document(doc[0])
          }
        }, 100)
      })
    }
  }


  async getQuestion({ item, node }) {
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'text') {
      const text = $('<div>', { 'class': 'text-from-ckeditor' }).html(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_text)
      if ($(text).find('.my-math').length > 0) {
        $('head').append('<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=TeX-MML-AM_CHTML" async></script>')
      }
      return text
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'childNode') {
      const childNode = this.dlInterface.getFirstChildNodeFromNode(node)
      if (childNode) {
        return this.dlInterface.getRenderedNodeContent(childNode)
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'parentNode') {
      return this.dlInterface.getRenderedNodeContent(node.parent)
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'node') {
      return this.dlInterface.getRenderedNodeContent(node)
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'note') {
      return this.dlInterface.getRenderedNoteContent(node)
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'tag') {
      let closedTags = this.dlInterface.getClosedTagsWithContent(this.dlInterface.getContentFromNode(node), 'sr')
      if (closedTags.length > 0) {
        return closedTags[0].replace('#sr', '').replace('##', '').trim()
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type === 'siblings') {
      const nodes = node.parent.children.children
      const composition = $('<div>')
      nodes.map(node => {
        composition.append($('<div>').append(this.dlInterface.getRenderedNodeContent(node)))
      })
      return composition
    }
  }

  async getAnswer({ item, node }) {
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'text') {
      const text = $('<div>', { 'class': 'text-from-ckeditor' }).html(item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_text)
      if ($(text).find('.my-math').length > 0) {
        $('head').append('<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=TeX-MML-AM_CHTML" async></script>')
      }
      return text
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'childNode') {
      const childNode = this.dlInterface.getFirstChildNodeFromNode(node)
      if (childNode) {
        return this.dlInterface.getRenderedNodeContent(childNode)
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'childNodes') {
      const nodes = node.children.children
      const composition = $('<div>', { 'class': 'spaced-repetition-answer-children' })
      nodes.map(node => {
        composition.append($('<div>').append(this.dlInterface.getRenderedNodeContent(node)))
      })
      return composition
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'node') {
      return this.dlInterface.getRenderedNodeContent(node)
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'parentNode') {
      return this.dlInterface.getRenderedNodeContent(node.parent)
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'note') {
      return this.dlInterface.getRenderedNoteContent(node)
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'tag') {
      let closedTags = this.dlInterface.getClosedTagsWithContent(this.dlInterface.getContentFromNode(node), 'sra')
      if (closedTags.length > 0) {
        return closedTags[0].replace('#sra', '').replace('##', '').trim()
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'siblings') {
      const nodes = node.parent.children.children
      const composition = $('<div>')
      nodes.map(node => {
        composition.append($('<div>').append(this.dlInterface.getRenderedNodeContent(node)))
      })
      return composition
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'tree') {
      return this.getTree(node, node.id)
    }
  }

  async isInputAnswerCorrect({ item, node, inputAnswer }) {
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'text' && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_text.includes(inputAnswer)) {
      return true
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'childNode') {
      const childNode = this.dlInterface.getFirstChildNodeFromNode(node)
      if (childNode && this.dlInterface.getContentFromNode(node).trim() === inputAnswer) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'childNodes') {
      const correctNodes = node.children.children.filter(node => {
        if (this.dlInterface.getContentFromNode(node).trim() === inputAnswer) {
          return true
        }
      })
      if (correctNodes.length > 0) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'node') {
      if (this.dlInterface.getContentFromNode(node).trim() === inputAnswer) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'parentNode') {
      if (this.dlInterface.getContentFromNode(node.parent).trim() === inputAnswer) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'note') {
      if (node.meta_obj.data.n.includes(inputAnswer)) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'tag') {
      let closedTags = this.dlInterface.getClosedTagsWithContent(this.dlInterface.getContentFromNode(node), 'sra')
      if (closedTags.length > 0 && closedTags[0].trim() === inputAnswer) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'siblings') {
      const correctNodes = node.parent.children.children.filter(node => {
        if (this.dlInterface.getContentFromNode(node).trim() === inputAnswer) {
          return true
        }
      })
      if (correctNodes.length > 0) {
        return true
      }
    }
    if (item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type === 'tree') {
      const tree = this.getTree(node, node.id)
      const correctNodes = $(tree).find(`:contains("${inputAnswer}")`).filter((i, element) => {
        return $(element).text().trim() === inputAnswer
      })
      if (correctNodes.length > 0) {
        return true
      }
    }

    return false
  }

  getTree(node, itemNodeId) {

    if (node.index === -1) {
      return
    }
    const div = $('<ul>')
    if (node.id !== itemNodeId) {
      div.addClass('spaced-repetition-answer-tree-item').append($('<li>').append(this.dlInterface.getRenderedNodeContent(node)))
    } else {
      div.addClass('spaced-repetition-answer-tree')
    }
    if (node.has_children()) {
      for (let child of node.get_children().children) {
        div.append($('<li>').append(this.getTree(child)))
      }
    }
    return div
  }

  createCategory({ id, name }) {
    const rowJqNode = $('<li>', { 'class': 'spaced-repetition-dashboard-manage-categories-row', 'data-id': id })
    const handle = $('<i class="fas fa-arrows-alt handle"></i>')
    const inputNameJqNode = $('<input>', { 'class': 'spaced-repetition-dashboard-manage-categories-row-input', type: 'input', val: name })
    const removeBtnJqNode = $('<button>', { 'class': '' }).text('Remove').on('mousedown', async () => {
      rowJqNode.remove()
      this.saveCategories()
      const items = await this.attributesManager.getItemsByAttributeId({ attributeId: this.attributesManager.SR_ATTRIBUTE_ID })
      items.map(item => {
        const categories = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories.filter(categoryId => {
          return categoryId !== id
        })
        this.saveItem({ nodeId: item.node_id, documentId: item.document_id, documentServerId: item.document_server_id, categories })
      })
    })
    return rowJqNode.append(handle, inputNameJqNode, removeBtnJqNode, clearfix())
  }

  async saveCategories() {
    const categories = []
    await Promise.all($('.spaced-repetition-dashboard-manage-categories-rows').find('li').map(async (index, categoryRow) => {
      const name = $(categoryRow).find('.spaced-repetition-dashboard-manage-categories-row-input').val()
      if (name.length > 0) {
        categories.push({ id: $(categoryRow).attr('data-id'), name })
      }
    }))
    this.updateSetting({ name: 'categories', value: categories })
  }

  async createTemplate({ id, name, question_type, question_text, answer_type, answer_by, selectedCategories = [] }) {
    const rowJqNode = $('<li>', { 'class': 'spaced-repetition-templates-manager-template-row', 'data-id': id })
    const handle = $('<i class="fas fa-arrows-alt handle"></i>')
    const inputNameJqNode = $('<input>', { 'class': 'spaced-repetition-templates-manager-template-row-input', type: 'input', placeholder: 'name', val: name ? name : '' })
    const questionText = $('<input>', { 'class': 'powerpack3-spaced-repetition-question-text', type: 'input', placeholder: 'question text', val: question_text ? question_text : '' }).hide()
    const questionTypeDropdownLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-question-type-label' }).text('Question type:')
    const questionTypeDropdown = $(`<select class="powerpack3-spaced-repetition-question-type"></select>`).append(
      $('<option value="text">Custom text</option>'),
      $('<option value="node">This node</option>'),
      $('<option value="none">None</option>'),
      $('<option value="childNode">First child node</option>'),
      $('<option value="parentNode">Parent node</option>'),
      $('<option value="note">Note</option>'),
      $('<option value="tag">Tag in this node</option>'),
      $('<option value="siblings">Composition of this node and it\'s siblings</option>'),
    ).val('text').on('change', () => {
      if (questionTypeDropdown.val() === 'text') {
        questionText.show()
      } else {
        questionText.hide()
      }
    })
    if (question_type) {
      questionTypeDropdown.val(question_type)
    }
    if (questionTypeDropdown.val() === 'text') {
      questionText.show()
    }
    const answerTypeDropdownLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-answer-type-label' }).text('Answer type:')
    const answerTypeDropdown = $(`<select class="powerpack3-spaced-repetition-answer-type"></select>`).append(
      $('<option value="childNode">First child node</option>'),
      $('<option value="childNodes">Composition of children</option>'),
      $('<option value="tree">Composition of tree below</option>'),
      $('<option value="text">Custom text</option>'),
      $('<option value="node">This node</option>'),
      $('<option value="parentNode">Parent node</option>'),
      $('<option value="note">Note</option>'),
      $('<option value="tag">Tag in this node</option>'),
      $('<option value="siblings">Composition of this node and it\'s siblings</option>'),
    ).val('node')
    if (answer_type) {
      answerTypeDropdown.val(answer_type)
    }
    const answerByLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-answer-by-label' }).text('Answer by:')
    const answerByRadioButtons = $('<div>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-buttons' })
    const answerByRadioButtonGuess = $('<input>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-button-guess', 'type': 'radio', 'name': `answer_by-${id}`, 'value': 'guess' }).prop('checked', true)
    const answerByRadioButtonGuessLabel = $('<label>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-buttons-guess-label' }).text('Guess').prepend(answerByRadioButtonGuess)
    const answerByRadioButtonInput = $('<input>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-button-input', 'type': 'radio', 'name': `answer_by-${id}`, 'value': 'input' })
    const answerByRadioButtonInputLabel = $('<label>', { 'class': 'powerpack3-spaced-repetition-answer-by-radio-buttons-input-label' }).text('Input').prepend(answerByRadioButtonInput)
    answerByRadioButtons.append(answerByRadioButtonGuessLabel, answerByRadioButtonInputLabel)
    if (answer_by) {
      $(answerByRadioButtons).find(`input[value="${answer_by}"]`).prop('checked', true)
    }
    const categories = await this.getSetting('categories')
    const categoriesLabel = $('<div>', { 'class': 'powerpack3-spaced-repetition-categories-label' }).text('Categories:')
    const checkboxesWrapper = $('<div>', { 'class': 'powerpack3-spaced-repetition-categories-checkboxes-wrapper' })
    categories.map(category => {
      const checkbox = $(`<input type="checkbox" class="powerpack3-spaced-repetition-categories-checkbox" id="cat-${category.id}-${id}" data-id=${category.id}>`)
      const checkboxLabel = $(`<label class="powerpack3-spaced-repetition-categories-checkbox-label" for="cat-${category.id}-${id}">${category.name}</label>`)
      const checkboxWrapper = $('<div>', { 'class': 'powerpack3-spaced-repetition-categories-checkbox-wrapper' }).append(checkbox, checkboxLabel)
      checkboxesWrapper.append(checkboxWrapper)
    })
    selectedCategories.map(categoryId => {
      $(checkboxesWrapper).find(`.powerpack3-spaced-repetition-categories-checkbox#cat-${categoryId}-${id}`).prop('checked', true)
    })
    const saveBtnJqNode = $('<button>', { 'class': '' }).text('Save').on('mousedown', async () => {
      const categoriesToSave = []
      $(checkboxesWrapper).find('.powerpack3-spaced-repetition-categories-checkbox').map((index, checkbox) => {
        if ($(checkbox).prop('checked')) {
          categoriesToSave.push($(checkbox).attr('data-id'))
        }
      })
      this.saveTemplate({ id: $(rowJqNode).attr('data-id'), name: $(inputNameJqNode).val(), question_type: $(questionTypeDropdown).val(), question_text: $(questionText).val(), answer_type: $(answerTypeDropdown).val(), answer_by: $(answerByRadioButtons).find('input:checked').val(), categories: categoriesToSave })
    })
    const removeBtnJqNode = $('<button>', { 'class': '' }).text('Remove').on('mousedown', async () => {
      rowJqNode.remove()
      this.saveTemplates()
    })
    return rowJqNode.append(handle, inputNameJqNode, clearfix(), questionTypeDropdownLabel, questionTypeDropdown, questionText, answerTypeDropdownLabel, answerTypeDropdown, answerByLabel, answerByRadioButtons, categoriesLabel, checkboxesWrapper, clearfix(), saveBtnJqNode, removeBtnJqNode, clearfix())
  }

  async saveTemplate({ id, name, question_type, question_text, answer_type, answer_by, categories }) {
    let templates = await this.getSetting('templates')
    let fresh = true
    templates = templates.map(templateDb => {
      if (templateDb.id === id) {
        templateDb.name = name
        templateDb.question_type = question_type
        templateDb.question_text = question_text
        templateDb.answer_type = answer_type
        templateDb.answer_by = answer_by
        templateDb.categories = categories
        fresh = false
      }
      return templateDb
    })
    if (fresh) {
      templates.push({ id, name, question_type, question_text, answer_type, answer_by, categories })
    }
    this.updateSetting({ name: 'templates', value: templates })
  }

  async saveTemplates() {
    const templates = []
    await Promise.all($('.spaced-repetition-templates-manager-templates-rows').find('li').map(async (index, templateRow) => {
      const name = $(templateRow).find('.spaced-repetition-templates-manager-template-row-input').val()
      if (name.length > 0) {
        const categories = []
        $(templateRow).find('.powerpack3-spaced-repetition-categories-checkbox').map((index, checkbox) => {
          if ($(checkbox).prop('checked')) {
            categories.push($(checkbox).attr('data-id'))
          }
        })
        templates.push({
          id: $(templateRow).attr('data-id'),
          name,
          question_type: $(templateRow).find('.powerpack3-spaced-repetition-question-type').val(),
          question_text: $(templateRow).find('.powerpack3-spaced-repetition-question-text').val(),
          answer_type: $(templateRow).find('.powerpack3-spaced-repetition-answer-type').val(),
          answer_by: $(templateRow).find('.powerpack3-spaced-repetition-answer-by-radio-buttons').find('input:checked').val(),
          categories
        })
      }
    }))
    this.updateSetting({ name: 'templates', value: templates })
  }

  async saveItem({ copy, nodeId, documentId, documentServerId, questionType, questionText, answerType, answerText, answerBy, history, categories, lastReview, nextReview, difficulty, interval }) {
    if (copy) {
      const node = await this.attributesManager.copyNodeToDatabase({ nodeId, documentId, documentServerId, under: 'Spaced repetition' })
      nodeId = node.node_id
      documentId = node.document_id
      documentServerId = node.document_server_id
    }
    const item = await this.attributesManager.getItem({ nodeId })
    if (!lastReview) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        lastReview = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].last_review
      } else {
        lastReview = moment().subtract(1, 'd').startOf('day')
      }
    }
    if (!nextReview) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        nextReview = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].next_review
      } else {
        nextReview = moment().subtract(1, 'd').startOf('day')
      }
    }
    if (!difficulty) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        difficulty = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].difficulty
      } else {
        difficulty = 0.3
      }
    }
    if (!interval) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        interval = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].interval
      } else {
        interval = 1
      }
    }
    if (!categories) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        categories = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].categories
      } else {
        categories = []
      }
    }
    if (!history) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        history = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].history
      } else {
        history = []
      }
    }
    if (!questionType) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        questionType = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_type
      } else {
        questionType = 'none'
      }
    }
    if (!questionText) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        questionText = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].question_text
      } else {
        questionText = ''
      }
    }
    if (!answerType) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        answerType = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_type
      } else {
        answerType = 'node'
      }
    }
    if (!answerText) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        answerText = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_text
      } else {
        answerText = ''
      }
    }
    if (!answerBy) {
      if (item && item.attributes[this.attributesManager.SR_ATTRIBUTE_ID]) {
        answerBy = item.attributes[this.attributesManager.SR_ATTRIBUTE_ID].answer_by
      } else {
        answerBy = 'guess'
      }
    }
    this.attributesManager.saveItem({
      nodeId, documentId, documentServerId, attrId: this.attributesManager.SR_ATTRIBUTE_ID, attrValue: {
        question_type: questionType,
        question_text: questionText,
        answer_type: answerType,
        answer_text: answerText,
        answer_by: answerBy,
        history,
        categories,
        last_review: lastReview,
        next_review: nextReview,
        difficulty,
        interval
      }
    })
    if (!this.allItemsNodesIds.includes(nodeId)) {
      this.allItemsNodesIds.push(nodeId)
    }
  }

  /* http://www.blueraja.com/blog/477/a-better-spaced-repetition-learning-algorithm-sm2
  https://npm.runkit.com/sm2-algorithm/src/sm2.js?t=1531386926367 */
  getItemDataAfterReview({ difficulty, lastReview, interval, performanceRating, today = moment().startOf('day') }) {

    const correct = 0.6

    let percentOverdue = 1
    if (performanceRating >= correct) {
      const diff = today.diff(lastReview.startOf('day'), 'days') / interval
      percentOverdue = diff > 2 ? 2 : diff
    }

    difficulty = _.clamp(difficulty + (percentOverdue * (8 - 9 * performanceRating) / 17), 0, 1)

    const difficultyWeight = 3 - 1.7 * difficulty

    if (performanceRating >= correct) {
      interval = _.clamp(interval * (1 + Math.round((difficultyWeight - 1) * percentOverdue)), 1, 730)
    } else if (performanceRating === 0) {
      interval = 0
    } else {
      interval = _.clamp(Math.round((interval * difficultyWeight) / 3), 1, 730)
    }

    const nextReview = today.clone().add(interval, 'd')

    return { difficulty, nextReview, interval }
  }

  simulate(difficulty, lastReview, interval, performanceRating, today) {
    lastReview = moment(lastReview)
    today = moment(today)
    console.log(this.getItemDataAfterReview({ difficulty, lastReview, interval, performanceRating, today }))
  }

  addForTest() {
    for (let index = 0; index < 1000; index++) {
      this.saveItem({ nodeId: generateId(), documentId: generateId(), documentServerId: generateId() })
    }
  }

}