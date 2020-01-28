import _ from 'lodash'

export class DynalistInterface {

  constructor(features) {
    this.features = features
    this.lastDoc = null
    this.documentsLoadedBefore = []
  }

  setGuiManager(guiManager) {
    this.guiManager = guiManager
  }
  setAttributesManager(attributesManager) {
    this.attributesManager = attributesManager
  }

  documentRendered(features) {
    const loadEvents = this.loadEvents.bind(this)
    const domEvents = this.domEvents.bind(this)
    const updateDynalistFunctions = this.updateDynalistFunctions.bind(this)
    DYNALIST.app.switch_app_document = (function () {
      var cached_function = DYNALIST.app.switch_app_document
      return function () {
        if (arguments[0] === DYNALIST.app.get_current_app_document() && DYNALIST.app.get_current_app_document().document.server_id !== this.lastDoc) {
          this.lastDoc = DYNALIST.app.get_current_app_document().document.server_id
          // loadEvents()
          // domEvents()
          updateDynalistFunctions(features)
          for (let feature of features) {
            if (feature['onDocumentFullyRendered']) {
              feature.onDocumentFullyRendered()
            }
            if (feature['updateKeyboardBindings']) {
              feature.updateKeyboardBindings()
            }
          }
        }
        return cached_function.apply(this, arguments)
      }
    })()
  }

  closeContextMenu() {
    DYNALIST.app.userspace.ui.hide_context_menu()
  }

  // areAllDocumentsReady() {
  //   return DYNALIST.app.userspace.userspace.are_all_documents_ready()
  // }


  createDocument(name = 'New document') {
    let doc = DYNALIST.app.userspace.controller.create_document(DYNALIST.app.userspace.get_userspace().get_root_file(), 0)
    DYNALIST.app.userspace.view.stop_renaming()
    DYNALIST.app.userspace.view.start_renaming(doc)
    DYNALIST.app.userspace.view.file_item_view.get_renaming_file_item_state().title_el.innerHTML = name
    DYNALIST.app.userspace.view.stop_renaming()
    return doc
  }

  checkIfDocumentExistByName(name) {
    return _.find(DYNALIST.app.userspace.userspace.files, (file) => { return file.get_type() === 'document' && file.title === name && file.index !== -1 })
  }

  getDocuments() {
    let files = DYNALIST.app.userspace.userspace.get_files()
    let documents = []
    for (let file of Object.values(files)) {
      if (file.get_type() === 'document') {
        documents.push(file)
      }
    }
    return documents
  }

  getAppDocumentByName(name) {
    return _.find(DYNALIST.app.app_documents, (docObj) => { return docObj.document.title === name })
  }

  getAppDocumentById(id) {
    return DYNALIST.app.app_documents[id]
  }

  getDocumentById(id) {
    let appDoc = this.getAppDocumentById(id)
    if (appDoc) {
      return appDoc.document
    }
  }

  getDocumentByName(name) {
    let appDoc = this.getAppDocumentByName(name)
    if (appDoc) {
      return appDoc.document
    }
  }

  getCurrentDocument() {
    return DYNALIST.app.get_current_app_document().document
  }

  getAppDocumentFromUrl(url) {
    let documentId = null
    if (url.includes('#z=')) {
      documentId = url.split('#z=')[0].split('/d/')[1]
    } else {
      documentId = url.split('/d/')[1]
    }
    return _.find(DYNALIST.app.app_documents, (docObj) => { return docObj.document.server_id === documentId })
  }

  getRootNodeFromUrl(url) {
    let nodeId = null
    let documentId = null
    let root = null

    if (url.includes('#z=')) {
      nodeId = url.split('#z=')[1]
      documentId = url.split('#z=')[0].split('/d/')[1]
    } else {
      documentId = url.split('/d/')[1]
    }

    let docObj = _.find(DYNALIST.app.app_documents, (docObj) => { return docObj.document.server_id === documentId })

    if (docObj) {
      let document = docObj.document
      return new Promise(resolve => {
        let interval = setInterval(() => {
          if (document.node_collection.is_available()) {
            clearInterval(interval)
            if (nodeId) {
              let root = null
              traverseTreeBfs(document.node_collection, (node) => {
                if (node.id === nodeId) {
                  resolve(root = node)
                }
              })
            } else {
              resolve(document.node_collection.root)
            }
            resolve(root)
          } else {
            DYNALIST.app.find_or_add_app_document(document)
          }
        }, 100)
      })
    }
  }

  getCurrentDocumentServerId() {
    return DYNALIST.app.get_current_app_document().document.server_id
  }

  getDocumentFromFileEl(domNode) {
    return DYNALIST.app.userspace.ui.get_file_from_el(domNode)
  }

  traverseTreeDfs(nodeCollection, callback) {
    nodeCollection.traverse_tree_dfs(null, callback)
  }

  traverseTreeBfs(nodeCollection, callback) {
    nodeCollection.traverse_tree_bfs(null, callback)
  }

  getCurrentDocumentNodeCollection() {
    return DYNALIST.app.app_document.document.get_node_collection()
  }

  getRootNodeFromDocument(doc) {
    return doc.get_node_collection().get_root()
  }

  createNode({ content = '', heading = null, doc }) {
    const app_doc = DYNALIST.app.app_documents[doc.id]
    const node = app_doc.controller.create_node()
    let metaObj = node.get_meta_object().clone().set_content(content).write()
    node.set_meta(metaObj)
    if (heading) {
      metaObj = node.get_meta_object().clone().set_heading(heading).write()
      node.set_meta(metaObj)
    }
    return node
  }

  attachNode(node, index, parent, doc = null) {
    let app_doc = DYNALIST.app.app_document
    if (doc) {
      app_doc = DYNALIST.app.app_documents[doc.id]
    }
    app_doc.controller.attach_node(node, parent, parent.generate_loc_id(index))
    return node
  }

  attachFirstChildNode(node, parent, doc = null) {
    return this.attachNode(node, 0, parent, doc)
  }

  attachLastChildNode(node, parent, doc = null) {
    return this.attachNode(node, parent.children.children.length, parent, doc)
  }

  attachNodeToDocumentOnTop({ node, doc }) {
    return this.attachNode(node, 0, this.getRootNodeFromDocument(doc))
  }

  attachNodeToDocumentOnBottom({ node, doc }) {
    const index = this.getRootNodeFromDocument(doc).num_children()
    return this.attachNode(node, index, this.getRootNodeFromDocument(doc))
  }

  insertNodeContent({ node, content, doc }) {
    const app_doc = this.getAppDocumentById(doc.id)
    app_doc.view.edit_nodes_meta([node], (node) => { return node.set_content(content) })
  }

  getFirstLevelNodesFromDocument(doc) {
    return new Promise(resolve => {
      let interval = setInterval(() => {
        if (doc.get_node_collection().is_available()) {
          clearInterval(interval)
          resolve(doc.get_node_collection().get_first_level())
        } else {
          DYNALIST.app.find_or_add_app_document(doc)
        }
      }, 100)
    })
  }

  getContentFromNode(node) {
    return node.get_meta_object().get_content()
  }

  editNodeContent(node, text) {
    DYNALIST.app.app_document.ui.dom_events.queue(function () {
      DYNALIST.app.app_document.ui.dom_events.ui.run_edit(function () {
        DYNALIST.app.app_document.ui.dom_events.view.edit_content(node, text)
      })
    })
    DYNALIST.app.app_document.view.edit_content(node, text)
  }

  getNodeContentParsedTree(node) {
    return node.get_content_parse_tree()
  }

  getNodeNoteParsedTree(node) {
    return node.get_note_parse_tree()
  }

  getNodeState(node) {
    if (DYNALIST.app.app_document.document.node_collection.nodes[node.id]) {
      // if (this.lastDoc === DYNALIST.app.app_document.document.server_id) {
      return DYNALIST.app.app_document.ui.get_node_state(node)
    }
    return null
  }

  hasNodeUrlInContent(node) {
    const nodeParsedTree = this.getNodeContentParsedTree(node)
    if (nodeParsedTree.items) {
      for (let item of nodeParsedTree.items) {
        if (item.hasOwnProperty('url')) {
          return true
        }
      }
    } else if (nodeParsedTree.hasOwnProperty('url')) {
      return true
    }
    return false
  }

  hasNodeTagInContent(node) {
    const nodeParsedTree = this.getNodeContentParsedTree(node)
    if (nodeParsedTree.items) {
      for (let item of nodeParsedTree.items) {
        if (item.hasOwnProperty('tag')) {
          return true
        }
      }
    } else if (nodeParsedTree.hasOwnProperty('tag')) {
      return true
    }
    return false
  }

  hasNodeUrlInNote(node) {
    const noteParsedTree = this.getNodeNoteParsedTree(node)
    if (noteParsedTree.items) {
      for (let item of noteParsedTree.items) {
        if (item.hasOwnProperty('url')) {
          return true
        }
      }
    } else if (noteParsedTree.hasOwnProperty('url')) {
      return true
    }
    return false
  }

  hasNodeTagInNote(node) {
    const noteParsedTree = this.getNodeNoteParsedTree(node)
    if (noteParsedTree.items) {
      for (let item of noteParsedTree.items) {
        if (item.hasOwnProperty('tag')) {
          return true
        }
      }
    } else if (noteParsedTree.hasOwnProperty('tag')) {
      return true
    }
    return false
  }

  getRenderedNodeContent(node) {
    return DYNALIST.app.userspace.ui.node_formatter._render(DYNALIST.app.userspace.ui.node_formatter.render_options, node.get_content_parse_tree())
  }

  getRenderedNoteContent(node) {
    return DYNALIST.app.userspace.ui.node_formatter._render(DYNALIST.app.userspace.ui.node_formatter.render_options, node.get_note_parse_tree())
  }

  getFirstChildNodeFromNode(node) {
    return node.get_child_first()
  }

  getCurrentlyEditedNode() {
    return DYNALIST.app.app_document.view.current_selection().node
  }

  getSelectedNodes() {
    return DYNALIST.app.app_document.view.current_selection().nodes
  }

  getCurrentSelection() {
    return DYNALIST.app.app_document.view.current_selection()
  }

  getCursorPositionEnd() {
    return DYNALIST.app.app_document.ui.selection_manager.document_ui.view.current_selection().position_end
  }

  setCursorToPositionInNode(node, cursorPosition) {
    DYNALIST.app.app_document.ui.selection_manager.set_cursor_to_position_in_node(node, cursorPosition)
  }

  getNodeFromDomEl(el) {
    return DYNALIST.app.app_document.ui.get_node_from_el(el)
  }

  moveNodes(nodes, parentNode, index, doc = null) {
    if (doc) {
      if (doc.id !== DYNALIST.app.app_document.get_document().id) {
        DYNALIST.app.app_documents[doc.id].controller.clone_from_nodes(nodes, parentNode, index)
        DYNALIST.app.app_document.view.detach_nodes(nodes)
      } else {
        DYNALIST.app.app_document.view.move_nodes(nodes, parentNode, index)
      }
    } else {
      DYNALIST.app.app_document.view.move_nodes(nodes, parentNode, index)
    }

  }

  setNodeCheckedValue(node, value) {
    let app_doc = DYNALIST.app.app_documents[node.document.id]
    app_doc.view.set_checked([node], value)
  }

  setNodeColorValue(node, value) {
    let app_doc = DYNALIST.app.app_documents[node.document.id]
    app_doc.view.set_color_label([node], value)
  }

  setNodeHeadingValue(node, value, doc = null) {
    if (!doc) {
      doc = node.document
    }
    let app_doc = DYNALIST.app.app_documents[doc.id]
    app_doc.view.set_heading_level([node], value)
  }

  removeNode(node) {
    if (node.document.id === this.getCurrentDocument().id) {
      DYNALIST.app.app_documents[node.document.id].view.detach_nodes([node])
    } else {
      node.document.node_collection.remove_node(node)
      let app_doc = _.find(DYNALIST.app.app_documents, (app_doc) => { return app_doc.document.id === node.document.id })
      app_doc.controller.request_sync()
    }
  }

  removeNodeFromDoc({ node, doc }) {
    if (doc.id === this.getCurrentDocument().id) {
      DYNALIST.app.app_documents[doc.id].view.detach_nodes([node])
    } else {
      doc.node_collection.remove_node(node)
      let app_doc = _.find(DYNALIST.app.app_documents, (app_doc) => { return app_doc.document.id === doc.id })
      app_doc.controller.request_sync()
    }
  }

  cloneNode(node, parent, indexForNewNode) {
    return DYNALIST.app.app_document.controller.clone_node_self(node, parent, indexForNewNode)
  }

  cloneNodeAndTree(node, parent, indexForNewNode, doc = null) {
    if (doc) {
      return DYNALIST.app.app_documents[doc.id].controller.clone_node_and_children(node, parent, indexForNewNode)
    } else {
      return DYNALIST.app.app_document.controller.clone_node_and_children(node, parent, indexForNewNode)
    }
  }

  hasTag(contentParseTree, text, equals) {
    let found = false;
    if (contentParseTree) {
      contentParseTree.traverse(function (fragment) {
        if (equals) {
          if (fragment['tag'] && (fragment.tag === '#' + text || fragment.tag === '@' + text)) {
            found = true
          }
        } else {
          if (fragment['tag'] && (fragment.tag.startsWith('#' + text) || fragment.tag.startsWith('@' + text))) {
            found = true
          }
        }
      })
    }
    return found
  }

  getClosedTagsWithContent(nodeContent, text) {
    text = _.escapeRegExp(text)
    let regex = new RegExp('#' + text + '(.+?)[ ]##', 'g')
    let matches = nodeContent.match(regex)
    return matches ? matches : []
  }

  getFullTagsFromFragment(text, tagFragment) {
    tagFragment = _.escapeRegExp(tagFragment)
    let regex = new RegExp('((#|@)([^@#]*?)' + tagFragment + '(.*?)[\\s]|(#|@)([^@#]*?)' + tagFragment + '(.*?)$)', 'g')
    let matches = text.match(regex)
    return matches ? matches : []
  }

  removeFocus() {
    DYNALIST.app.app_document.ui.selection_manager.document_ui.selection().deselect()
  }

  createAbsoluteUrlFromState(state) {
    return DYNALIST.app.userspace.view.get_url_manager().create_absolute_url_from_state(state)
  }

  createUrlFromState(state) {
    return DYNALIST.app.userspace.view.get_url_manager().create_url_from_state(state)
  }

  getItemState(item) {
    return DYNALIST.app.userspace.view.file_item_view.get_file_item_state(item)
  }

  getUrlState(node) {
    return DYNALIST.app.userspace.view.get_url_state(DYNALIST.app.get_current_app_document().document, node)
  }

  getBookmarkFromBookmarkEl(domNode) {
    return DYNALIST.app.userspace.ui.get_bookmark_from_el(domNode)
  }

  getBookmarks() {
    const bookmarksObj = DYNALIST.app.userspace.userspace.get_bookmarks()
    let bookmarks = []
    for (let bookmark of Object.values(bookmarksObj)) {
      bookmarks.push(bookmark)
    }
    return bookmarks
  }

  createBookmark(urlState, withPopup) {
    let bookmark = DYNALIST.app.userspace.controller.create_bookmark(DYNALIST.app.userspace.userspace.get_root_bookmark().num_children())
    let n = bookmark.get_data_object().clone()
    n.set_url_manager_state(urlState)
    n.set_title(DYNALIST.app.userspace.view.get_default_bookmark_name(n))
    DYNALIST.app.userspace.view.controller.edit_bookmark(bookmark, n.write())
    DYNALIST.app.userspace.view.start_renaming(bookmark)
    DYNALIST.app.userspace.view.stop_renaming()
    DYNALIST.app.userspace.view.ui.update_bookmark_status()
    if (withPopup) {
      this.displayPopup('Bookmark for "' + DYNALIST.app.userspace.view.get_default_bookmark_name(n) + '" was successfully CREATED.')
    }
  }

  removeBookmark(bookmark, withPopup) {
    DYNALIST.app.userspace.controller.remove_bookmark(bookmark);
    DYNALIST.app.userspace.ui.update_bookmark_status();
    if (withPopup) {
      this.displayPopup('Bookmark for "' + bookmark.get_data_object().get_title() + '" was successfully REMOVED.')
    }
  }

  updateBookmarkStatus() {
    DYNALIST.app.userspace.ui.update_bookmark_status()
  }

  displayPopup(text) {
    DYNALIST.app.userspace.ui.popup_message_manager._display_popup(text, { dismissible: 1, autoclose: 1, error: 0 })
  }

  getTheme() {
    return DYNALIST.app.preferences.get('appearance.theme')
  }

  getDisplayDensity() {
    return DYNALIST.app.preferences.get('display_density')
  }

  getPaneEl(name) {
    if (name === 'Files') {
      return this.getFilePaneEl()
    } else if (name === 'Bookmarks') {
      return this.getBookmarkPaneEl()
    } else {
      return this.getTagPaneEl()
    }
  }
  getPaneIconEl(name) {
    if (name === 'Files') {
      return this.getFilePaneIconEl()
    } else if (name === 'Bookmarks') {
      return this.getBookmarkPaneIconEl()
    } else {
      return this.getTagPaneIconEl()
    }
  }
  getFilePaneEl() {
    return $(DYNALIST.app.userspace.ui.pane_ui.files_el[1])
  }
  getFilePaneIconEl() {
    return $(DYNALIST.app.userspace.ui.pane_ui.files_el[0])
  }

  getBookmarkPaneEl() {
    return $(DYNALIST.app.userspace.ui.pane_ui.bookmarks_el[1])
  }
  getBookmarkPaneIconEl() {
    return $(DYNALIST.app.userspace.ui.pane_ui.bookmarks_el[0])
  }

  getTagPaneEl() {
    return $(DYNALIST.app.userspace.ui.pane_ui.tags_el[1])
  }
  getTagPaneIconEl() {
    return $(DYNALIST.app.userspace.ui.pane_ui.tags_el[0])
  }
  openPane(name) {
    name ? DYNALIST.app.userspace.ui.pane_ui.open_pane(name) : DYNALIST.app.userspace.ui.pane_ui.open_pane()
  }
  closePane() {
    DYNALIST.app.userspace.ui.pane_ui.close_pane()
  }

  hashValue(s) {
    var hash = 0, i, chr, len;
    if (s.length == 0) return hash.toString();
    for (i = 0, len = s.length; i < len; i++) {
      chr = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash.toString();
  }


  ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////

  updateDynalistFunctionsOnStart(features) {
    console.log('updateDynalistFunctionsOnStart')

    // $(document).keyup(function (e) {
    //   if (e.keyCode === 27) { // esc
    //     if (DYNALIST.app.app_document.view.ui.tag_suggestion_manager.is_open) {
    //       DYNALIST.app.app_document.view.ui.tag_suggestion_manager.close_triggered_popup()
    //     }
    //   }
    // })

    if (DYNALIST.app.app_document.ui.search.is_searching()) {
      for (let feature of features) {
        if (feature['onShowDocumentSearchbar']) {
          feature.onShowDocumentSearchbar()
        }
      }
    }

    DYNALIST.app.userspace.view.stop_renaming = (function () {
      var cached_function = DYNALIST.app.userspace.view.stop_renaming
      return function () {
        let itemState = DYNALIST.app.userspace.view.file_item_view.get_renaming_file_item_state()
        if (itemState) {

          let type = ''
          if (itemState.is_document_type() || itemState.is_bookmark_type()) {
            type = itemState.is_bookmark_type() ? 'bookmark' : 'document'
          } else {
            type = 'folder'
          }

          for (let feature of features) {
            if ((type === 'bookmark' || type === 'document') && feature['onPaneDocumentOrPaneBookmarkStopRenaming']) {
              feature.onPaneDocumentOrPaneBookmarkStopRenaming(type, itemState)
            }
            if (type === 'document' && feature['onPaneDocumentStopRenaming']) {
              feature.onPaneDocumentStopRenaming(itemState)
            }
            if (type === 'bookmark' && feature['onPaneBookmarkStopRenaming']) {
              feature.onPaneBookmarkStopRenaming(itemState)
            }
            if (type === 'folder' && feature['onPaneFolderStopRenaming']) {
              feature.onPaneFolderStopRenaming(itemState)
            }
          }
        }
        return cached_function.apply(this, arguments)
      }
    })()

    const lastDoc = this.lastDoc
    DYNALIST.app.userspace.ui.update_bookmark_status = (function (e) {
      let cached_function = DYNALIST.app.userspace.ui.update_bookmark_status
      return function () {
        let result = cached_function.apply(this, arguments)
        for (let feature of features) {
          if (feature['onBookmarkStatusUpdate']) {
            feature.onBookmarkStatusUpdate()
          }
        }
        return result
      }
    })()

    DYNALIST.app.userspace.ui.pane_ui.open_pane = (function (e) {
      let cached_function = DYNALIST.app.userspace.ui.pane_ui.open_pane
      return function () {
        let result = cached_function.apply(this, arguments)
        for (let feature of features) {
          if (feature['onOpenPane']) {
            feature.onOpenPane(arguments[0])
          }
        }
        return result
      }
    })()

    DYNALIST.app.userspace.view.get_url_manager().zoom_node = (function (e) {
      let cached_function = DYNALIST.app.userspace.view.get_url_manager().zoom_node
      return function () {
        let result = cached_function.apply(this, arguments)
        for (let feature of features) {
          if (feature['onNodeZoom']) {
            feature.onNodeZoom(arguments[0])
          }
        }
        return result
      }
    })()

    const guiManager = this.guiManager
    DYNALIST.app.userspace.ui.pane_ui._update_nav_width = (function (e) {
      let cached_function = DYNALIST.app.userspace.ui.pane_ui._update_nav_width
      return function () {
        let result = cached_function.apply(this, arguments)

        guiManager.adjustPanelsSizes()

        return result
      }
    })()

    // DYNALIST.app.app_document.view.zoom_node = (function (e) {
    //   let cached_function = DYNALIST.app.app_document.view.zoom_node
    //   return function () {
    //     let result = cached_function.apply(this, arguments)

    //     console.log('zoomed')

    //     return result
    //   }
    // })()

    // DYNALIST.app.app_document.ui.end_load_document = (function (e) {
    //   let cached_function = DYNALIST.app.app_document.ui.end_load_document
    //   return function () {
    //     let result = cached_function.apply(this, arguments)

    //     console.log('end_load_document')

    //     return result
    //   }
    // })()

    // DYNALIST.app.userspace.view.url_manager.apply_state = (function (e) {
    //   let cached_function = DYNALIST.app.userspace.view.url_manager.apply_state
    //   return function () {
    //     let result = cached_function.apply(this, arguments)

    //     console.log('apply_state')

    //     return result
    //   }
    // })()

  }

  updateDynalistFunctions(features) {
    if (this.lastDoc === DYNALIST.app.get_current_app_document().document.server_id) {
      return
    }
    this.lastDoc = DYNALIST.app.get_current_app_document().document.server_id
    console.log('updateDynalistFunctions')

    $('.is-currentRoot .Node-children').off('focusin', '.Node-content', this.onNodeFocus)
    $('.is-currentRoot .Node-children').on('focusin', '.Node-content', this.onNodeFocus.bind(this))

    DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_previous_item = (function (e) {
      let cached_function = DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_previous_item
      return function () {
        if (DYNALIST.app.app_document.view.ui.tag_suggestion_manager.current_suggestion_index == 0) {
          DYNALIST.app.app_document.view.ui.tag_suggestion_manager.close_triggered_popup()
        } else {
          let result = cached_function.apply(this, arguments)
          return result
        }
      }
    })()

    DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_next_item = (function (e) {
      let cached_function = DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_next_item
      return function () {
        if ((DYNALIST.app.app_document.view.ui.tag_suggestion_manager.suggestions.length - 1) === DYNALIST.app.app_document.view.ui.tag_suggestion_manager.current_suggestion_index) {
          DYNALIST.app.app_document.view.ui.tag_suggestion_manager.close_triggered_popup()
        } else {
          let result = cached_function.apply(this, arguments)
          return result
        }
      }
    })()

    const attributesManager = this.attributesManager
    DYNALIST.app.app_document.ui.node_mover._move_node = (function (e) {
      var cached_function = DYNALIST.app.app_document.ui.node_mover._move_node
      return function () {

        const destDoc = DYNALIST.app.app_document.ui.node_mover.states.destination_results[DYNALIST.app.app_document.ui.node_mover.states.selected_destination_index].document
        const appDoc = DYNALIST.app.find_app_document(destDoc)

        appDoc.controller.clone_node_self = (function (e) {
          var cached_function = appDoc.controller.clone_node_self
          return function () {

            let result = cached_function.apply(this, arguments)

            for (let feature of features) {
              if (feature['onNodeCloned']) {
                feature.onNodeCloned({ oldNode: arguments[0], newNode: result, newDoc: destDoc })
              }
            }

            attributesManager.onNodeCloned({ oldNode: arguments[0], newNode: result, newDoc: destDoc })

            return result
          }
        })()

        let result = cached_function.apply(this, arguments)

        return result
      }
    })()

    // DYNALIST.app.app_document.ui.node_view.node_renderer.update_is_content_rendered = (function (e) {
    //   var cached_function = DYNALIST.app.app_document.ui.node_view.node_renderer.update_is_content_rendered
    //   return function () {

    //     let result = cached_function.apply(this, arguments)

    //     let nodeState = arguments[0]
    //     if (nodeState.ui_content_rendered) {
    //       for (let feature of features) {
    //         if (feature['onRenderedNodeUnfocus']) {
    //           feature.onRenderedNodeUnfocus(nodeState)
    //         }
    //       }
    //     } else {
    //       for (let feature of features) {
    //         if (feature['onRenderedNodeFocus']) {
    //           feature.onRenderedNodeFocus(nodeState)
    //         }
    //       }
    //     }
    //     return result
    //   }
    // })()

    // DYNALIST.app.app_document.ui.node_view.node_renderer.update_content = (function (e) {
    //   var cached_function = DYNALIST.app.app_document.ui.node_view.node_renderer.update_content
    //   return function () {

    //     let result = cached_function.apply(this, arguments)

    //     let nodeState = arguments[0]
    //     for (let feature of features) {
    //       if (feature['onNodeIsRendered']) {
    //         feature.onNodeIsRendered(nodeState)
    //       }
    //     }

    //     return result
    //   }
    // })()

    // DYNALIST.app.app_document.ui.node_view.node_renderer.update_is_note_rendered = (function (e) {
    //   var cached_function = DYNALIST.app.app_document.ui.node_view.node_renderer.update_is_note_rendered
    //   return function () {

    //     let result = cached_function.apply(this, arguments)

    //     let nodeState = arguments[0]
    //     for (let feature of features) {
    //       if (feature['onNoteIsRendered']) {
    //         feature.onNoteIsRendered(nodeState)
    //       }
    //     }

    //     return result
    //   }
    // })()

    // DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_previous_item = (function (e) {
    //   let cached_function = DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_previous_item
    //   return function () {
    //     for (let feature of features) {
    //       if (feature['onTagSuggestionUp']) {
    //         feature.onTagSuggestionUp()
    //       }
    //     }
    //     let result = cached_function.apply(this, arguments)
    //     return result
    //   }
    // })()

    // DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_next_item = (function (e) {
    //   let cached_function = DYNALIST.app.app_document.view.ui.tag_suggestion_manager._select_next_item
    //   return function () {
    //     let result = cached_function.apply(this, arguments)
    //     for (let feature of features) {
    //       if (feature['onTagSuggestionDown']) {
    //         feature.onTagSuggestionDown()
    //       }
    //     }
    //     return result
    //   }
    // })()

    let lastSearchExit = 0
    DYNALIST.app.app_document.ui.exit_document_search = (function (e) {
      let cached_function = DYNALIST.app.app_document.ui.exit_document_search
      return function () {
        let result = cached_function.apply(this, arguments)
        let currentTime = Date.now() / 1000 | 0
        if (currentTime - lastSearchExit > 1) {
          lastSearchExit = currentTime
          for (let feature of features) {
            if (feature['onExitDocumentSearch']) {
              feature.onExitDocumentSearch()
            }
          }
        }

        return result
      }
    })()

    let lastSearchStart = 0
    DYNALIST.app.app_document.ui.show_document_searchbar = (function (e) {
      let cached_function = DYNALIST.app.app_document.ui.show_document_searchbar
      return function () {
        let result = cached_function.apply(this, arguments)
        let currentTime = Date.now() / 1000 | 0
        if (currentTime - lastSearchStart > 1) {
          lastSearchStart = currentTime
          for (let feature of features) {
            if (feature['onShowDocumentSearchbar']) {
              feature.onShowDocumentSearchbar()
            }
          }
        }

        return result
      }
    })()
    DYNALIST.app.app_document.ui.search_in_document = (function (e) {
      let cached_function = DYNALIST.app.app_document.ui.search_in_document
      return function () {
        let result = cached_function.apply(this, arguments)
        if (DYNALIST.app.app_document.ui.search.is_searching()) {
          for (let feature of features) {
            if (feature['onShowDocumentSearchbar']) {
              feature.onShowDocumentSearchbar()
            }
          }
        }
        return result
      }
    })()


    DYNALIST.app.app_document.ui.node_view.set_current_root = (function (e) {
      let cached_function = DYNALIST.app.app_document.ui.node_view.set_current_root
      return function () {
        let result = cached_function.apply(this, arguments)
        for (let feature of features) {
          if (feature['onDocumentZoomed']) {
            feature.onDocumentZoomed()
          }
        }
        return result
      }
    })()


    if (!this.documentsLoadedBefore.includes(DYNALIST.app.app_document.document.server_id)) {
      this.documentsLoadedBefore.push(DYNALIST.app.app_document.document.server_id)
      DYNALIST.app.app_document.controller.node_collection.off('node_content_change', this.onNodeContentChange)
      DYNALIST.app.app_document.controller.node_collection.on('node_content_change', this.onNodeContentChange.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('node_create', this.onNodeCreate)
      DYNALIST.app.app_document.controller.node_collection.on('node_create', this.onNodeCreate.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('collapse_change', this.onNodeCollapseChange)
      DYNALIST.app.app_document.controller.node_collection.on('collapse_change', this.onNodeCollapseChange.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('node_note_change', this.onNoteContentChange)
      DYNALIST.app.app_document.controller.node_collection.on('node_note_change', this.onNoteContentChange.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('node_meta_change', this.onNodeMetaChange)
      DYNALIST.app.app_document.controller.node_collection.on('node_meta_change', this.onNodeMetaChange.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('index_change', this.onNodeIndexChange)
      DYNALIST.app.app_document.controller.node_collection.on('index_change', this.onNodeIndexChange.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('attach', this.onNodeAttached)
      DYNALIST.app.app_document.controller.node_collection.on('attach', this.onNodeAttached.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('detach', this.onNodeDetached)
      DYNALIST.app.app_document.controller.node_collection.on('detach', this.onNodeDetached.bind(this), DYNALIST.app.app_document.controller)
      DYNALIST.app.app_document.controller.node_collection.off('remove', this.onNodeRemoved)
      DYNALIST.app.app_document.controller.node_collection.on('remove', this.onNodeRemoved.bind(this), DYNALIST.app.app_document.controller)
    }

  }

  onNodeContentChange(node, changes) {
    for (let feature of this.features) {
      if (feature['onNodeContentChange']) {
        feature.onNodeContentChange(node, changes)
      }
    }
  }

  onNodeCreate(newNode) {
    for (let feature of this.features) {
      if (feature['onNodeCreate']) {
        feature.onNodeCreate(newNode)
      }
    }
  }

  onNodeCollapseChange(node) {
    this.domEvents()
    for (let feature of this.features) {
      if (feature['onNodeCollapseChange']) {
        feature.onNodeCollapseChange(node)
      }
    }
  }

  onNoteContentChange(node, noteChanges) {
    for (let feature of this.features) {
      if (feature['onNoteContentChange']) {
        feature.onNoteContentChange(node, noteChanges)
      }
    }
  }

  onNodeMetaChange(node) { // color, heading, content, note, ...
    for (let feature of this.features) {
      if (feature['onNodeMetaChange']) {
        feature.onNodeMetaChange(node)
      }
    }
  }

  onNodeIndexChange(node) { // it's called multiple times with each node from current node_collection
    for (let feature of this.features) {
      if (feature['onNodeIndexChange']) {
        feature.onNodeIndexChange(node)
      }
    }
  }

  onNodeAttached(node) {
    for (let feature of this.features) {
      if (feature['onNodeAttached']) {
        feature.onNodeAttached(node)
      }
    }
  }

  onNodeDetached(node, rootNode) { // node with null parent, but rootNode in 2nd arg
    for (let feature of this.features) {
      if (feature['onNodeDetached']) {
        feature.onNodeDetached(node, rootNode)
      }
    }
  }

  onNodeRemoved(node) {
    for (let feature of this.features) {
      if (feature['onNodeRemoved']) {
        feature.onNodeRemoved(node)
      }
    }
  }

  onNodeBlur(ev) {
    let node = DYNALIST.app.app_document.ui.get_node_from_el(ev.currentTarget)
    for (let feature of this.features) {
      if (feature['onNodeBlur']) {
        feature.onNodeBlur(node)
      }
    }
  }

  onNodeFocus(ev) {
    ev.stopImmediatePropagation()
    let node = DYNALIST.app.app_document.ui.get_node_from_el(ev.currentTarget)
    for (let feature of this.features) {
      if (feature['onNodeFocus']) {
        feature.onNodeFocus(node)
      }
    }
    DYNALIST.app.app_document.ui.dom_events.on_node_focus(ev)
  }

  onNoteBlur(ev) {
    let node = DYNALIST.app.app_document.ui.get_node_from_el(ev.currentTarget)
    for (let feature of this.features) {
      if (feature['onNoteBlur']) {
        feature.onNoteBlur(node)
      }
    }
  }

  onNoteFocus(ev) {
    let node = DYNALIST.app.app_document.ui.get_node_from_el(ev.currentTarget)
    for (let feature of this.features) {
      if (feature['onNoteFocus']) {
        feature.onNoteFocus(node)
      }
    }
  }

  loadEvents() {
    if (this.lastDoc === DYNALIST.app.get_current_app_document().document.server_id) {
      return
    }
    console.log('loadEvents')

    $('.modal-container.settings .setting-dropdown-menu[data-key="appearance.theme"]').on('change', () => {
      const theme = DYNALIST.app.preferences.get('appearance.theme')
      for (let feature of DYNALIST.Powerpack3.features) {
        if (feature['onThemeChange']) {
          feature.onThemeChange(theme)
        }
      }
      DYNALIST.Powerpack3.themeChanged(theme)
    })
  }

  domEvents() {
    if (this.lastDoc === DYNALIST.app.get_current_app_document().document.server_id) {
      return
    }
    console.log('domEvents')
    $(document).off('focusout', '.Document .Node-content', this.onNodeBlur)
    $(document).on('focusout', '.Document .Node-content', this.onNodeBlur.bind(this))
    $('.is-currentRoot .Node-children').off('focusin', '.Node-content', this.onNodeFocus)
    $('.is-currentRoot .Node-children').on('focusin', '.Node-content', this.onNodeFocus.bind(this))
    $(document).off('focusout', '.Document .Node-note', this.onNoteBlur)
    $(document).on('focusout', '.Document .Node-note', this.onNoteBlur.bind(this))
    $('.is-currentRoot .Node-children').off('focusin', '.Node-note', this.onNoteFocus)
    $('.is-currentRoot .Node-children').on('focusin', '.Node-note', this.onNoteFocus.bind(this))

  }



}