export const generateId = (len = 16, bits = 36) => {
  var outStr = "", newStr
  while (outStr.length < len) {
    newStr = Math.random().toString(bits).slice(2)
    outStr += newStr.slice(0, Math.min(newStr.length, (len - outStr.length)))
  }
  return outStr
}

export const createEmbeddableUrl = (url) => {
  if (url.includes('youtube') && url.includes('watch')) {
    url = url.replace('watch?v=', 'embed/').trim()
  }
  if (url.includes('gist.github') && !url.includes('script')) {
    url = 'data:text/html;charset=utf-8,%3Cbody%3E%3Cscript%20src%3D%22' + url + '.js%22%3E%3C%2Fscript%3E%3C%2Fbody%3E'
  }
  if (url.includes('jsfiddle.net') && !url.includes('embedded')) {
    url = url + 'embedded/'
  }
  return url
}

export const isIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export const traverseNodeTree = (node, callback) => {
  if (node.index === -1 && node.id !== DYNALIST.app.app_document.ui.current_root.id) {
    return
  }
  callback(node)
  if (node.has_children()) {
    for (let child of node.get_children().children) {
      traverseNodeTree(child, callback)
    }
  }
}

export const traverseNotCollapsedNodeTree = (node, callback) => {
  if (node.index === -1 && node.id !== DYNALIST.app.app_document.ui.current_root.id) {
    return
  }
  callback(node)
  if (node.id === DYNALIST.app.app_document.ui.current_root.id || !node.collapsed) {
    if (node.has_children()) {
      for (let child of node.get_children().children) {
        traverseNotCollapsedNodeTree(child, callback)
      }
    }
  }
}

export const onNodeStateInitialized = ({ node, callback }) => {
  if (!DYNALIST.app.app_document.document.node_collection.nodes[node.id]) {
    return
  }
  if (!DYNALIST.app.app_document.ui.node_view.node_states[node.id]) {
    return
  }
  let counter = 0
  const interval = setInterval(() => {
    if (!DYNALIST.app.app_document.ui.node_view.node_states[node.id] || counter >= 50) {
      clearInterval(interval)
      return
    }
    if (DYNALIST.app.app_document.ui.node_view.node_states[node.id].dom.initialized_self) {
      clearInterval(interval)
      callback(DYNALIST.app.app_document.ui.node_view.node_states[node.id])
    }
    counter++
  }, 100)
}