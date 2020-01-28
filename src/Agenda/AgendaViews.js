
import { clearfix } from '../templates'

export class AgendaViews {

  constructor({ afterViewSaveOrRemove, agendaQueries, dbManager, dlInterface }) {
    this.agendaQueries = agendaQueries
    this.dbManager = dbManager
    this.afterViewSaveOrRemove = afterViewSaveOrRemove
    this.dlInterface = dlInterface

    this.initDb()
  }

  async initDb() {
    const db = await this.dbManager.getDatabase('settings')
    if (!db.getCollection('agenda-views')) {
      db.addCollection('agenda-views')
      db.saveDatabase()
    }
  }

  async getRawViews() {
    const db = await this.dbManager.getDatabase('settings')
    return db.getCollection('agenda-views').find()
  }

  async getViews() {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-views')
    const views = coll.find()
    return await Promise.all(views.map(async view => {
      const clonedView = _.cloneDeep(view)
      clonedView.queries = await Promise.all(clonedView.queries.map(async queryId => {
        return await this.agendaQueries.getQueryById({ id: queryId })
      }))
      return clonedView
    }))
  }

  async getView({ id }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-views')
    const view = coll.findOne({ id })
    const clonedView = _.cloneDeep(view)
    clonedView.queries = await Promise.all(clonedView.queries.map(async queryId => {
      return await this.agendaQueries.getQueryById({ id: queryId })
    }))
    return clonedView
  }
  async getViewByName({ name }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-views')
    const view = coll.findOne({ name })
    const clonedView = _.cloneDeep(view)
    clonedView.queries = await Promise.all(clonedView.queries.map(async queryId => {
      return await this.agendaQueries.getQueryById({ id: queryId })
    }))
    return clonedView
  }

  async renderView({ id }) {
    const view = await this.getView({ id })
    if (view) {
      const wrapper = $('<div>', { 'class': 'agenda-view', 'data-id': id })
      const title = $('<div>', { 'class': 'agenda-view-title' }).html(`<i class="far fa-calendar-check"></i> ${view.name}`)
      const buttons = $('<div>', { 'class': 'agenda-view-buttons' })
      const content = $('<div>', { 'class': 'agenda-view-content' })
      view.queries.map(async query => {
        const queryWrapper = $('<div>', { 'class': `agenda-query agenda-query-${query.id}`, 'data-id': query.id })
        const queryTitle = $('<div>', { 'class': 'agenda-query-title' }).html(query.name)
        const refreshQueryBtn = $('<i class="fas fa-sync"><div class="tooltip" data-title="Refresh query"></div></i>').on('mousedown', () => {
          this.agendaQueries.refreshQueryResult({ queryWrapper })
        })
        queryTitle.append(refreshQueryBtn)
        const querySortOptionsDropdown = $('<select>', { class: 'agenda-query-sort-options-dropdown' }).on('change', () => {
          this.agendaQueries.updateQueryOption({ id: query.id, name: 'selectedSortId', value: querySortOptionsDropdown.val() })
          this.agendaQueries.refreshQueryResult({ queryWrapper })
        })
        const sortOptions = this.agendaQueries.getSortOptions({ sortOptions: query.sortOptions })
        sortOptions.map(sortOption => {
          if (sortOption.id == 0) {
            querySortOptionsDropdown.append(`<option value="${sortOption.id}">Don't sort</option>`)
          } else {
            querySortOptionsDropdown.append(`<option value="${sortOption.id}">Sort by ${sortOption.name}</option>`)
          }
        })
        querySortOptionsDropdown.val(query.selectedSortId)
        const queryContent = $('<div>', { 'class': 'agenda-query-content' })
        content.append(queryWrapper.append(queryTitle, querySortOptionsDropdown, queryContent))
        this.agendaQueries.refreshQueryResult({ queryWrapper })
        if (query.autorefresh > 0) {
          const autorefresh = setInterval(() => {
            if (queryWrapper.parents('html').length > 0) {
              this.agendaQueries.refreshQueryResult({ queryWrapper })
            } else {
              clearInterval(autorefresh)
            }
          }, (60000 * query.autorefresh))
        }
      })
      const refreshAllQueriesBtn = $('<i class="fas fa-sync"><div class="tooltip" data-title="Refresh all queries"></div></i>').on('mousedown', () => {
        content.find('.agenda-query').map((index, queryWrapper) => {
          this.agendaQueries.refreshQueryResult({ queryWrapper })
        })
      })
      const bulkActionsWrapper = $('<div>', { 'class': 'bulk-actions-wrapper' }).hide().addClass('hidden')
      const bulkActionsSelectAllItems = $('<input type="button" class="btn btn-select-all" value="Select all">').on('mousedown', () => {
        wrapper.find('.result-item .item-checkbox').prop('checked', true)
      })
      let bulkActionsSelectNone = $('<input type="button" class="btn btn-select-none" value="Select none">').on('mousedown', () => {
        wrapper.find('.result-item .item-checkbox').prop('checked', false)
      })
      let bulkActionsDropdown = $('<select>', { class: 'bulk-actions-dropdown' })
        .append('<option value="check">Check selected items</option>')
        .append('<option value="uncheck">Uncheck selected items</option>')
        .append('<option value="archive">Move selected items to archive</option>')
        .append('<option value="remove">Remove selected items</option>')
      let bulkActionsOk = $('<input type="button" class="btn btn-run-bulk-actions" value="Ok">').on('mousedown', () => {
        this.bulkActions({ type: bulkActionsDropdown.val(), wrapper })
      })
      bulkActionsWrapper.append(bulkActionsSelectAllItems, bulkActionsSelectNone, clearfix(), bulkActionsDropdown, bulkActionsOk, clearfix())
      const bulkActionsBtn = $('<i class="fas fa-toolbox"><div class="tooltip" data-title="Bulk actions"></div></i>').on('mousedown', () => {
        bulkActionsWrapper.toggle().toggleClass('hidden')
        if (bulkActionsWrapper.hasClass('hidden')) {
          wrapper.find('.result-item').removeClass('show-checkbox')
        } else {
          wrapper.find('.result-item').addClass('show-checkbox')
        }
      })
      const exportBtn = $('<i class="fas fa-print"><div class="tooltip" data-title="Print Agenda"></div></i>').on('mousedown', () => {
        let mywindow = window.open('', 'Agenda', 'height=600,width=800')
        mywindow.document.write('<html><head><title>Agenda</title>')
        mywindow.document.write('<style>.agenda-query-buttons,.agenda-query-sort-options,.agenda-query-timeframes,.agenda-query-dates-slider,.item-checkbox-container{display:none;}.agenda-query-title{font-size:25px; font-weight:bold}</style>')
        mywindow.document.write('</head><body>')
        mywindow.document.write(content.html())
        mywindow.document.write('</body></html>')
        mywindow.print();
        mywindow.close();
      })
      const createDocBtn = $('<i class="fas fa-sign-out-alt"><div class="tooltip" data-title="Create new document with copy of current results"></div></i>').on('mousedown', async () => {
        const docName = `Agenda: ${view.name}`
        const doc = await this.createAgendaDoc({ docName })
        const existedNodes = await this.dlInterface.getFirstLevelNodesFromDocument(doc)
        existedNodes.map(node => {
          this.dlInterface.removeNodeFromDoc({ node, doc })
        })
        DYNALIST.app.userspace.view.switch_document(doc)
        const queriesWrappers = content.find('.agenda-query')
        queriesWrappers.each((i, queryWrapper) => {
          const queryNode = this.dlInterface.createNode({ content: queryWrapper.find('.agenda-query-title').text(), heading: 1, doc })
          this.dlInterface.attachNodeToDocumentOnBottom({ node: queryNode, doc })
          const queryResult = queryWrapper.find('.agenda-query-results')
          if (queryResult.hasClass('date-grouped')) {
            const dateNode = this.dlInterface.createNode({ content: queryWrapper.find('.agenda-query-dates-slider .date').text(), heading: 2, doc })
            this.dlInterface.attachLastChildNode(dateNode, queryNode, doc)
            const sections = $(queryResult).find('.result-section')
            sections.each((i, section) => {
              const resultDateNode = this.dlInterface.createNode({ content: section.find('.result-header').text(), heading: 3, doc })
              this.dlInterface.attachLastChildNode(resultDateNode, dateNode, doc)
              if (queryResult.hasClass('document-grouped')) {
                const docs = $(section).find('.result-item-doc')
                docs.each((i, docSection) => {
                  const resultDocTitleNode = this.dlInterface.createNode({ content: '**' + docSection.find('.result-item-doc-title').text() + '**', doc })
                  this.dlInterface.attachLastChildNode(resultDocTitleNode, resultDateNode, doc)
                  const items = $(docSection).find('.result-item')
                  items.each((i, item) => {
                    if ($(item).attr('google-calendar')) {
                      const calendarNode = this.dlInterface.createNode({ content: $(item).attr('google-calendar'), doc })
                      this.dlInterface.attachLastChildNode(calendarNode, resultDocTitleNode, doc)
                    } else {
                      let documentId = $(item).attr('document-id')
                      let nodeId = $(item).attr('node-id')
                      let document = DYNALIST.app.app_documents[documentId].document
                      this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
                        if (node.id === nodeId) {
                          const newNode = this.dlInterface.cloneNodeAndTree(node, node.parent, -1)
                          this.dlInterface.moveNodes([newNode], resultDocTitleNode, resultDocTitleNode.children.children.length)
                          return
                        }
                      })
                    }
                  })
                })
              } else {
                const items = $(section).find('.result-item')
                items.each((i, item) => {
                  if ($(item).attr('google-calendar')) {
                    const calendarNode = this.dlInterface.createNode({ content: $(item).attr('google-calendar'), doc })
                    this.dlInterface.attachLastChildNode(calendarNode, resultDateNode, doc)
                  } else {
                    let documentId = $(item).attr('document-id')
                    let nodeId = $(item).attr('node-id')
                    let document = DYNALIST.app.app_documents[documentId].document
                    this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
                      if (node.id === nodeId) {
                        const newNode = this.dlInterface.cloneNodeAndTree(node, node.parent, -1)
                        this.dlInterface.moveNodes([newNode], resultDateNode, resultDateNode.children.children.length)
                        return
                      }
                    })
                  }
                })
              }
            })
          } else {
            if (queryResult.hasClass('document-grouped')) {
              const docs = $(queryResult).find('.result-item-doc')
              docs.each((i, docSection) => {
                const resultDocTitleNode = this.dlInterface.createNode({ content: '**' + docSection.find('.result-item-doc-title').text() + '**', doc })
                this.dlInterface.attachLastChildNode(resultDocTitleNode, queryNode, doc)
                const items = $(docSection).find('.result-item')
                items.each((i, item) => {
                  let documentId = $(item).attr('document-id')
                  let nodeId = $(item).attr('node-id')
                  let document = DYNALIST.app.app_documents[documentId].document
                  this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
                    if (node.id === nodeId) {
                      const newNode = this.dlInterface.cloneNodeAndTree(node, node.parent, -1)
                      this.dlInterface.moveNodes([newNode], resultDocTitleNode, resultDocTitleNode.children.children.length)
                      return
                    }
                  })
                })
              })
            } else {
              const items = $(queryResult).find('.result-item')
              items.each((i, item) => {
                let documentId = $(item).attr('document-id')
                let nodeId = $(item).attr('node-id')
                let document = DYNALIST.app.app_documents[documentId].document
                this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
                  if (node.id === nodeId) {
                    const newNode = this.dlInterface.cloneNodeAndTree(node, node.parent, -1)
                    this.dlInterface.moveNodes([newNode], queryNode, queryNode.children.children.length)
                    return
                  }
                })
              })
            }
          }
        })
        this.dlInterface.displayPopup('Document created.')
      })
      buttons.append(refreshAllQueriesBtn, bulkActionsBtn, exportBtn, createDocBtn, clearfix(), bulkActionsWrapper)
      return wrapper.append(title, buttons, content)[0]
    } else {
      return $('<div>').html("No view with selected id in the database")[0]
    }
  }

  async createAgendaDoc({ docName }) {
    let doc = this.dlInterface.checkIfDocumentExistByName(docName)
    if (!doc) {
      this.dlInterface.createDocument(docName)
    }
    return new Promise(resolve => {
      let docExistInterval = setInterval(async () => {
        doc = this.dlInterface.checkIfDocumentExistByName(docName)
        if (doc) {
          clearInterval(docExistInterval)
          resolve(doc)
        }
      }, 100)
    })
  }

  async saveView({ view }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-views')
    let viewDbObj = coll.find({ id: view.id })[0]
    if (!viewDbObj) {
      viewDbObj = view
      coll.insert(viewDbObj)
    } else {
      viewDbObj.queries = view.queries
      _.defaultsDeep(view, viewDbObj)
      coll.update(view)
    }
    await db.saveDatabase()
    this.afterViewSaveOrRemove()
  }

  async removeView({ id }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-views')
    coll.findAndRemove({ id })
    this.afterViewSaveOrRemove()
  }

  bulkActions({ type, wrapper }) {
    const items = $(wrapper).find('.result-item .item-checkbox:checked').closest('.result-item')
    if (type === 'check') {
      items.each((i, itemEl) => {
        let documentId = $(itemEl).attr('document-id')
        let nodeId = $(itemEl).attr('node-id')
        let document = DYNALIST.app.app_documents[documentId].document
        this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
          if (node.id === nodeId) {
            this.dlInterface.setNodeCheckedValue(node, true)
            return
          }
        })
      })
      this.dlInterface.displayPopup('Items were checked.')
    } else if (type === 'uncheck') {
      items.each((i, itemEl) => {
        let documentId = $(itemEl).attr('document-id')
        let nodeId = $(itemEl).attr('node-id')
        let document = DYNALIST.app.app_documents[documentId].document
        this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
          if (node.id === nodeId) {
            this.dlInterface.setNodeCheckedValue(node, false)
            return
          }
        })
      })
      this.dlInterface.displayPopup('Items were unchecked.')
    } else if (type === 'archive') {
      if (confirm("Send all selected items to archive? This action can't be undone.")) {
        items.each(async (i, itemEl) => {
          let query = await this.agendaQueries.getQueryById({ id: $(itemEl).closest('.agenda-query').attr('data-id') })
          let documentId = $(itemEl).attr('document-id')
          let nodeId = $(itemEl).attr('node-id')
          let document = DYNALIST.app.app_documents[documentId].document
          let node = null
          this.dlInterface.traverseTreeBfs(document.node_collection, (nodeTree) => {
            if (nodeTree.id === nodeId) {
              node = nodeTree
              return
            }
          })
          for (let url of query.archives) {
            let archAppDoc = this.dlInterface.getAppDocumentFromUrl(url)
            let archiveRoot = await this.dlInterface.getRootNodeFromUrl(url)
            if (archiveRoot) {
              let position = DYNALIST.app.preferences.get('move_item_sent_to_position')
              let index = -1
              "bottom" === position ? index = archiveRoot.num_children() : "top" === position && (index = 0)
              archAppDoc.controller.clone_from_nodes([node], archiveRoot, index)
            }
          }
          this.dlInterface.removeNode(node)
        })
        this.dlInterface.displayPopup('Items were moved to archive.')
      } else {
        return
      }
    } else if (type === 'remove') {
      if (confirm("Remove all selected items? This action can't be undone.")) {
        items.each((i, itemEl) => {
          let documentId = $(itemEl).attr('document-id')
          let nodeId = $(itemEl).attr('node-id')
          let document = DYNALIST.app.app_documents[documentId].document
          this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
            if (node.id === nodeId) {
              this.dlInterface.removeNode(node)
              return
            }
          })
        })
        this.dlInterface.displayPopup('Items were removed.')
      } else {
        return
      }
    }
    $(wrapper).find('.agenda-query').map((index, queryWrapper) => {
      this.agendaQueries.refreshQueryResult({ queryWrapper })
    })
  }

}