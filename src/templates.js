import _ from 'lodash'

let moment = require('moment')
moment.locale(window.navigator.language)

export const checkboxTemplate = ({ checkboxId, checked, label, onChange = () => { } }) => {
  const checkboxJqNode = $(`<input type="checkbox" id="${checkboxId}">`)
  checkboxJqNode.prop('checked', checked)
  const labelJqNode = $(`<label for="${checkboxId}">${label}</label>`).prepend(checkboxJqNode)
  checkboxJqNode.on('change', () => {
    onChange()
  })
  return labelJqNode
}

// export const checkboxSubsectionTemplate = ({label = '', checkboxes }) => {
//   const wrapperJqNode = $('<div>', { 'class': 'settings-popup-checbox-subsection-wrapper' })
//   const labelJqNode = $('<h3>', { 'class': 'settings-popup-select-label float-left' }).text(label)

//   const checkboxJqNode = $(`<input type="checkbox" id="${checkboxId}">`)
//   checkboxJqNode.prop('checked', checked)
//   const labelJqNode = $(`<label for="${checkboxId}">${label}</label>`).prepend(checkboxJqNode)
//   checkboxJqNode.on('change', () => {
//     onChange()
//   })
//   return labelJqNode
// }

export const selectTemplate = ({ selectId, label, help, selected = null, values, onChange = () => { } }) => {
  const wrapperJqNode = $('<div>', { 'class': 'settings-popup-select-wrapper' })
  const labelJqNode = $('<h4>', { 'class': 'settings-popup-select-label' }).text(label)
  const selectJqNode = $('<select>', { id: selectId, 'class': 'settings-popup-select' })
  _.each(values, (value, key) => {
    const optionJqNode = $(`<option value="${key}">${value}</option>}`)
    selectJqNode.append(optionJqNode)
  })
  if (selected) {
    selectJqNode.val(selected)
  }
  wrapperJqNode.append(labelJqNode, selectJqNode)
  if (help.length > 0) {
    const helpJqNode = $('<span>', { 'class': 'settings-popup-help' }).text(help)
    wrapperJqNode.append(clearfix(), helpJqNode)
  }
  selectJqNode.on('change', () => {
    onChange(selectJqNode.val())
  })
  return wrapperJqNode
}

export const inputTemplate = ({ inputId, label, help, value, onSave = () => { } }) => {
  const wrapperJqNode = $('<div>', { 'class': 'settings-popup-input-wrapper' })
  const labelJqNode = $('<h4>', { 'class': 'settings-popup-input-label' }).text(label)
  const inputJqNode = $('<input>', { id: inputId, 'class': 'settings-popup-input', type: 'text' }).val(value)
  const saveButtonJqNode = $('<button>', { 'class': 'btn btn-save' }).text('Save')
  const savedNotificationJqNode = $('<span class="saved-notification">&#10004;</span>')
  wrapperJqNode.append(labelJqNode, inputJqNode, saveButtonJqNode, savedNotificationJqNode)
  if (help.length > 0) {
    const helpJqNode = $('<span>', { 'class': 'settings-popup-help' }).html(help)
    wrapperJqNode.append(clearfix(), helpJqNode)
  }
  inputJqNode.on('keypress', e => {
    if (e.keyCode == 13) {
      e.preventDefault()
      saveButtonJqNode.trigger('click')
    }
  })
  saveButtonJqNode.on('click', () => {
    onSave(inputJqNode.val())
    savedNotificationJqNode.show().delay(2000).fadeOut()
  })
  return wrapperJqNode
}

export const clearfix = () => {
  return $('<div>', { 'class': 'clearfix' })
}

export const settingsPopupSectionTemplate = ({ featureName, featureTitle, settingsFragments, settingsVisibility, onSectionToggle }) => {
  const sectionTitle = $(`<h2 class="settings-popup-section-title"><span>${featureTitle}</span></h2>`)
  const sectionIcon = $('<i class="fas fa-caret-down"></i>')
  const sectionBody = $('<div>', { 'class': `settings-popup-section-body` })
  if (!settingsVisibility) {
    sectionIcon.addClass('fa-caret-right')
    sectionBody.hide()
  }
  sectionTitle.prepend(sectionIcon).append(clearfix())
  sectionTitle.on('mousedown', () => {
    sectionIcon.toggleClass('fa-caret-right')
    onSectionToggle()
    sectionBody.toggle()
  })
  for (let settingsFragment of settingsFragments) {
    sectionBody.append(settingsFragment, clearfix())
  }
  return $('<div>', { 'class': `settings-popup-section settings-popup-section-${featureName}` }).append(sectionTitle, sectionBody)
}

export const iframeTemplate = (href) => {
  return `<iframe width="100%" height="100%" src="${href}" onload="$(\'iframe\').contents().find(\'head\').append($(\'<style>.DocumentTools{margin-top: 50px;}.powerpack3-panel {display:none} .LeftPaneSlidebarContainer, .LeftPaneSplitter, .MobileHeader-mainMenuIcon {display:none !important;} .is-desktop .AppHeader {display: none!important} .is-mobile .AppHeader {display: block!important} .DocumentContainer {z-index: 98!important; width: 100% !important; height: 100%!important; top: 0 !important; left: 0!important; padding: 0 30px !important} .is-mobile .DocumentContainer {height: calc(100% - 46px)!important} .is-mobile .Node.is-currentRoot {padding: 0;} .Document {margin: 0 !important; width: 100% !important;}.Document-rootNode {padding: 0 !important;}.main-container{height:100%!important}.Document-bottomSpace{display:none} .DocumentBreadcrumb {margin: 0;min-height: 0;padding: 20px 0 0 0px;}</style>\'))" style="border:0; margin-bottom: -10px;"></iframe>`
}


export const agendaTimeframedResultsLayout = ({ query, foundedNodes, onTimeframeChange, onQueryRefreshNeeded, queryWrapper }) => {
  let queryResults = $('<div>', { 'class': 'agenda-query-results date-grouped' })
  let timeframesContainer = $('<div>', { class: 'agenda-query-timeframes' })
  let datesSliderContainer = $('<div>', { class: 'agenda-query-dates-slider' })
  let dateEl = $('<span>', { class: 'date', startdate: moment(query.startdate).format('YYYY-MM-DD') }).text(getDateElementText({ timeframe: query.timeframe, startdate: query.startdate }));

  ['day', 'week', 'month', 'year'].forEach((tf, i) => {
    let tfEl = $('<span>', { class: 'timeframe', 'tf': tf }).text(tf)
    if (tf == query.timeframe) {
      tfEl.addClass('selected')
    }
    tfEl.on('click', () => {
      onTimeframeChange({ queryId: query.id, timeframe: tfEl.attr('tf') })
      onQueryRefreshNeeded({ queryWrapper })
    })
    timeframesContainer.append(tfEl)
  })

  let prev = $('<span>', { class: 'prev' }).html('<i class="fas fa-arrow-circle-left"></i>').on('click', () => {
    onQueryRefreshNeeded({ queryWrapper, startdateChange: 'prev' })
  })
  let next = $('<span>', { class: 'next' }).html('<i class="fas fa-arrow-circle-right"></i>').on('click', () => {
    onQueryRefreshNeeded({ queryWrapper, startdateChange: 'next' })
  })
  datesSliderContainer.append(prev, dateEl, next)

  queryResults.append(timeframesContainer, datesSliderContainer)

  const today = moment()

  if (query.groupByDoc) {
    queryResults.addClass('document-grouped')
    _.forEach(foundedNodes, (nodesObj, key) => {
      let momentDate = moment(nodesObj.date)
      let resultDate = query.timeframe === 'day' ? '' : $('<h4>', { class: 'result-header' }).text(momentDate.format('DD MMMM YYYY, ddd'))
      if (query.timeframe !== 'day' && momentDate.isSame(today, 'day')) {
        resultDate.addClass('today')
      }
      let resultItemsContainer = $('<ul>', { class: 'result-items' })
      let resultSectionContainer = $('<div>', { class: 'result-section' }).append(resultDate, resultItemsContainer)
      _.forEach(nodesObj.foundedNodesForDate, (nodesGroupedByDoc, docTitle) => {
        const resultItemsDocTitle = $('<li>', { class: 'result-item-doc' }).html(`<span class="result-item-doc-title">${docTitle}</span>`)
        resultItemsContainer.append(resultItemsDocTitle)
        const resultItemsDocContainer = $('<ul>', { class: 'result-item-doc-container' })
        resultItemsDocTitle.append(resultItemsDocContainer)
        nodesGroupedByDoc.map(node => {
          resultItemsDocContainer.append(node.prepareNodeJqElement({ groupByDoc: query.groupByDoc, renderTags: query.renderTags, removeDates: query.removeDates, onQueryRefreshNeeded, queryWrapper }))
        })
      })
      queryResults.append(resultSectionContainer)
    })

  } else {
    _.forEach(foundedNodes, (nodesObj, key) => {
      let momentDate = moment(nodesObj.date)
      let resultDate = query.timeframe === 'day' ? '' : $('<h4>', { class: 'result-header' }).text(momentDate.format('DD MMMM YYYY, ddd'))
      if (query.timeframe !== 'day' && momentDate.isSame(today, 'day')) {
        resultDate.addClass('today')
      }
      let resultItemsContainer = $('<ul>', { class: 'result-items' })
      let resultSectionContainer = $('<div>', { class: 'result-section' }).append(resultDate, resultItemsContainer)
      nodesObj.foundedNodesForDate.map(node => {
        resultItemsContainer.append(node.prepareNodeJqElement({ groupByDoc: query.groupByDoc, renderTags: query.renderTags, removeDates: query.removeDates, onQueryRefreshNeeded, queryWrapper }))
      })
      queryResults.append(resultSectionContainer)
    })
  }
  return queryResults
}

const getDateElementText = ({ timeframe, startdate }) => {
  switch (timeframe) {
    case 'day':
      return moment(startdate).format('ddd, DD MMMM YYYY')
    case 'week':
      const weekstart = moment(startdate).format('DD.MM')
      const weekend = moment(startdate).clone().add(6, 'd').format('DD.MM')
      return 'Week ' + moment(startdate).format('wo') + ', ' + weekstart + '-' + weekend + ' ' + moment(startdate).format('YYYY')
    case 'month':
      return moment(startdate).format('MMMM YYYY')
    case 'year':
      return moment(startdate).format('YYYY')
  }
}

export const agendaResultsLayout = ({ foundedNodes, groupByDoc, renderTags, removeDates, onQueryRefreshNeeded, queryWrapper }) => {
  let queryResults = $('<div>', { 'class': 'agenda-query-results' })
  let resultItemsContainer = $('<ul>', { 'class': 'result-items' })
  if (groupByDoc) {
    queryResults.addClass('document-grouped')
    _.forEach(foundedNodes, (nodes, docTitle) => {
      const resultItemsDocTitle = $('<li>', { class: 'result-item-doc' }).html(`<span class="result-item-doc-title">${docTitle}</span>`)
      resultItemsContainer.append(resultItemsDocTitle)
      const resultItemsDocContainer = $('<ul>', { class: 'result-item-doc-container' })
      resultItemsDocTitle.append(resultItemsDocContainer)
      nodes.map(node => {
        resultItemsDocContainer.append(node.prepareNodeJqElement({ groupByDoc, renderTags, removeDates, onQueryRefreshNeeded, queryWrapper }))
      })
    })
  } else {
    foundedNodes.map(node => {
      resultItemsContainer.append(node.prepareNodeJqElement({ groupByDoc, renderTags, removeDates, onQueryRefreshNeeded, queryWrapper }))
    })
  }
  return queryResults.append(resultItemsContainer)
}