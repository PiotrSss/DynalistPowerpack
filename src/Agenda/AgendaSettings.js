import $ from 'jquery'
require('jquery-ui')
require('jquery-ui/ui/widgets/sortable')

import { clearfix } from '../templates'
import { generateId } from '../helpers'

export class AgendaSettings {

  constructor({ googleCalendar, agendaViews, agendaQueries, dbManager, sorting }) {
    this.googleCalendar = googleCalendar
    this.agendaViews = agendaViews
    this.agendaQueries = agendaQueries
    this.dbManager = dbManager
    this.sorting = sorting
  }

  async buildQueriesFragment() {
    const sectionJqNode = $('<div>', { 'class': 'agenda-settings-section-queries' }).html('<h3>Configure Agenda Queries</h3>')
    const queriesListJqNode = $('<div>', { 'class': 'agenda-settings-section-queries-list' })
    const addQueryBtnJqNode = $('<button>', { 'class': 'agenda-settings-section-button-add btn btn-add agenda-settings-section-button-add-query' }).text('Add Query').on('click', async () => {
      queriesListJqNode.append(await this.getQueryTemplate({ query: null }))
    })

    const queries = await this.agendaQueries.getQueries()
    queries.map(async query => {
      queriesListJqNode.append(await this.getQueryTemplate({ query }))
    })

    sectionJqNode.append(queriesListJqNode, addQueryBtnJqNode)
    return sectionJqNode
  }

  async buildViewsFragment() {
    const sectionJqNode = $('<div>', { 'class': 'agenda-settings-section-views' }).html('<h3>Configure Agenda Views</h3>')
    const viewsListJqNode = $('<div>', { 'class': 'agenda-settings-section-views-list' })
    const addViewBtnJqNode = $('<button>', { 'class': 'agenda-settings-section-button-add btn btn-add agenda-settings-section-button-add-view' }).text('Add View').on('click', async () => {
      viewsListJqNode.append(await this.getViewTemplate({ view: null }))
    })

    const views = await this.agendaViews.getRawViews()
    views.map(async view => {
      viewsListJqNode.append(await this.getViewTemplate({ view }))
    })

    sectionJqNode.append(viewsListJqNode, addViewBtnJqNode)
    return sectionJqNode
  }

  async getQueryTemplate({ query }) {
    let targets = ['item', 'parent']
    let filterNames = ['content_contains', 'content_not_contains', 'is_checked', 'is_heading', 'is_not_heading', 'has_color', 'has_not_color',
      'note_content_contains', 'note_content_not_contains', 'has_note', 'with_children', 'without_children', 'with_all_children_checked',
      'with_one_or_more_children_unchecked', 'is_collapsed', 'is_empty', 'has_date', 'has_date_before', 'has_date_after'
    ]

    let queryContEl = $('<div>', { class: 'agenda-settings-section-queries-query-container' })
    let queryNameLabelEl = $(`<label class="query-name-label">Query name:</label>`)
    let queryNameInputEl = $(`<input class="query-name-input" type="text">`)
    queryContEl.append(queryNameLabelEl, queryNameInputEl, clearfix())

    let id = generateId()

    let renderItemsCheckbox = $(`<input class=" render-tags-checkbox" id="render-tags-checkbox-${id}" type="checkbox">`)
    let renderItemsCheckboxLabel = $(`<label class=" " for="render-tags-checkbox-${id}">Render tags and dates in item</label>`)
    let renderItemsWrapper = $('<div class="render-tags-wrapper"></div>').append(renderItemsCheckbox, renderItemsCheckboxLabel, clearfix())
    queryContEl.append(renderItemsWrapper)

    let groupByDocumentCheckbox = $(`<input class=" group-by-document-checkbox" id="group-by-document-checkbox-${id}" type="checkbox">`)
    let groupByDocumentCheckboxLabel = $(`<label class="" for="group-by-document-checkbox-${id}">Group items by document</label>`)
    let groupByDocumentWrapper = $('<div class="group-by-document-wrapper"></div>').append(groupByDocumentCheckbox, groupByDocumentCheckboxLabel, clearfix())
    queryContEl.append(groupByDocumentWrapper)

    let removeDatesCheckbox = $(`<input class=" remove-dates-checkbox" id="remove-dates-checkbox-${id}" type="checkbox">`)
    let removeDatesCheckboxLabel = $(`<label class=" " for="remove-dates-checkbox-${id}">Remove dates from items</label>`)
    let removeDatesWrapper = $('<div class="remove-dates"></div>').append(removeDatesCheckbox, removeDatesCheckboxLabel, clearfix())
    queryContEl.append(removeDatesWrapper)

    let timeframesWrapper = $('<div class="timeframes-wrapper"></div>')
    let firstDayLabel = $(`<label class="">First day of the week</label>`)
    let firstDayDropdown = $(`<select class=" first-day-of-the-week"></select>`);
    ['sunday', 'monday', 'tuesday', 'wednesday'].forEach((val, i) => {
      let optionEl = $(`<option value="${val}">${val}</option>`)
      firstDayDropdown.append(optionEl)
    })
    let firstDayWrapper = $('<div class="firstday-wrapper"></div>').append(firstDayLabel, firstDayDropdown, clearfix())

    let daysReversedCheckbox = $(`<input class=" days-reversed-checkbox" id="days-reversed-checkbox-${id}" type="checkbox">`)
    let daysReversedCheckboxLabel = $(`<label class=" " for="days-reversed-checkbox-${id}">Show days in reversed order</label>`)
    let daysReversedWrapper = $('<div class="days-reversed"></div>').append(daysReversedCheckbox, daysReversedCheckboxLabel, clearfix())

    let showOnlyDaysWithMatchCheckbox = $(`<input class=" show-only-days-with-match-checkbox" id="show-only-days-with-match-checkbox-${id}" type="checkbox">`)
    let showOnlyDaysWithMatchCheckboxLabel = $(`<label class=" " for="show-only-days-with-match-checkbox-${id}">Hide empty days</label>`)
    let showOnlyDaysWithMatchWrapper = $('<div class="show-only-days-with-match-wrapper"></div>').append(showOnlyDaysWithMatchCheckbox, showOnlyDaysWithMatchCheckboxLabel, clearfix())

    const integrateWithGoogleCalendarCheckbox = $(`<input class="integrate-with-google-calendar-checkbox" id="integrate-with-google-calendar-checkbox-${id}" type="checkbox">`)
    const integrateWithGoogleCalendarCheckboxLabel = $(`<label class=" " for="integrate-with-google-calendar-checkbox-${id}">Integrate with Google Calendar</label>`)
    const integrateWithGoogleCalendarWrapper = $('<div class="integrate-with-google-calendar-wrapper"></div>').append(integrateWithGoogleCalendarCheckbox, integrateWithGoogleCalendarCheckboxLabel, clearfix())

    let timeframesCheckbox = $(`<input class=" group-by-date-checkbox" id="group-by-date-checkbox-${id}" type="checkbox">`)
    timeframesCheckbox.on('change', e => {
      if (timeframesCheckbox.prop('checked')) {
        firstDayWrapper.insertAfter(timeframesWrapper)
        daysReversedWrapper.insertAfter(firstDayWrapper)
        showOnlyDaysWithMatchWrapper.insertAfter(daysReversedWrapper)
        integrateWithGoogleCalendarWrapper.insertAfter(showOnlyDaysWithMatchWrapper)
      } else {
        firstDayWrapper.remove()
        daysReversedWrapper.remove()
        showOnlyDaysWithMatchWrapper.remove()
        integrateWithGoogleCalendarWrapper.remove()
      }
    })
    let timeframesCheckboxLabel = $(`<label class=" " for="group-by-date-checkbox-${id}">Group items by date</label>`)
    timeframesWrapper.append(timeframesCheckbox, timeframesCheckboxLabel, clearfix())

    queryContEl.append(timeframesWrapper)

    let autoRefreshLabel = $(`<label class="">Auto refresh</label>`)
    let autoRefreshDropdown = $(`<select class=" auto-refresh-dropdown"></select>`).append(
      $('<option value="0">disabled</option>'),
      $('<option value="1">every minute</option>'),
      $('<option value="5">every 5 minutes</option>'),
      $('<option value="15">every 15 minutes</option>'),
      $('<option value="30">every 30 minutes</option>'),
      $('<option value="60">every hour</option>')
    )
    let autoRefreshWrapper = $('<div class="auto-refresh-wrapper"></div>').append(autoRefreshLabel, autoRefreshDropdown, clearfix())
    queryContEl.append(autoRefreshWrapper, clearfix())

    let queryDocumentsEl = $('<textarea>', { class: 'query-documents' })
    let queryDocumentsLabelEl = $(`<label class="">Search documents:</label>`)

    let queryArchiveDocumentsEl = $('<textarea>', { class: 'query-archive-documents' })
    let queryArchiveDocumentsLabelEl = $(`<label class="">Archive in documents:</label>`)

    let sortOptionsLabel = $(`<label class="">Sort options:</label>`)
    let sortOptionsWrapper = $('<div>', { class: 'query-sort-options-wrapper' }).append(sortOptionsLabel)

    if (query) {
      queryDocumentsEl.val(query.docs.join('\n'))
      queryArchiveDocumentsEl.val(query.archives.join('\n'))
      renderItemsCheckbox.prop('checked', query.renderTags)
      groupByDocumentCheckbox.prop('checked', query.groupByDoc)
      removeDatesCheckbox.prop('checked', query.removeDates)
      autoRefreshDropdown.val(query.autorefresh)
      if (query.groupByDate) {
        timeframesCheckbox.prop('checked', true)
        firstDayDropdown.val(query.firstDay)
        daysReversedCheckbox.prop('checked', query.daysReversed)
        showOnlyDaysWithMatchCheckbox.prop('checked', query.daysWithResults)
        integrateWithGoogleCalendarCheckbox.prop('checked', query.integrateWithGoogleCalendar)
        firstDayWrapper.insertAfter(timeframesWrapper)
        daysReversedWrapper.insertAfter(firstDayWrapper)
        showOnlyDaysWithMatchWrapper.insertAfter(daysReversedWrapper)
        integrateWithGoogleCalendarWrapper.insertAfter(showOnlyDaysWithMatchWrapper)
      }

      queryContEl.attr('query-id', query.id)
      queryNameInputEl.val(query.name)
      for (let filtersGroup of query.filtersGroups) {
        let filtersGroupEl = this.getQueryFiltersGroupTemplate(filtersGroup, targets, filterNames)
        queryContEl.append(filtersGroupEl)
      }

      for (let sortOption of query.sortOptions) {
        if (!sortOption.default) {
          let sortOptionsInputWrapper = $('<div>', { class: 'query-sort-option-wrapper' })
          let sortOptionsInput = $(`<input class=" query-sort-option" type="text">`).val(sortOption.name)
          let sortOptionRemoveBtn = $('<button>', { 'class': 'btn btn-remove btn-remove-sort-option' }).text('Remove').on('click', () => {
            sortOptionsInputWrapper.remove()
          })
          sortOptionsInputWrapper.append(sortOptionsInput, sortOptionRemoveBtn)
          sortOptionsWrapper.append(sortOptionsInputWrapper)
        }
      }

    } else {
      queryContEl.attr('query-id', id)
    }
    let addNewFilterGroup = $('<button>', { 'class': 'btn btn-add btn-add-new-filter-group' }).text('+ add new filter group').on('click', () => {
      this.getQueryFiltersGroupTemplate([], targets, filterNames).insertBefore(addNewFilterGroup)
    })
    let saveQuery = $('<button>', { 'class': 'btn btn-save btn-save-query' }).text('save query').on('click', () => {
      this.saveQuery({ queryContEl })
    })
    let removeQuery = $('<button>', { 'class': 'btn btn-remove btn-remove-query' }).text('Remove query').on('click', () => {
      this.removeQuery({ queryContEl })
    })

    let addSortOptionsBtn = $('<button>', { 'class': 'btn btn-add btn-add-sort-option' }).text('+ add sort option').on('click', () => {
      let sortOptionsInputWrapper = $('<div>', { class: 'query-sort-option-wrapper' })
      let sortOptionsInput = $(`<input class=" query-sort-option" type="text">`)
      let sortOptionRemoveBtn = $('<button>', { 'class': 'btn btn-remove btn-remove-sort-option' }).text('remove').on('click', () => {
        sortOptionsInputWrapper.remove()
      })
      sortOptionsInputWrapper.append(sortOptionsInput, sortOptionRemoveBtn, clearfix())
      sortOptionsWrapper.append(sortOptionsInputWrapper)
    })

    queryContEl.append(addNewFilterGroup, clearfix(), queryDocumentsLabelEl, queryDocumentsEl, queryArchiveDocumentsLabelEl, queryArchiveDocumentsEl, sortOptionsWrapper, clearfix(), addSortOptionsBtn, clearfix(), saveQuery, removeQuery, clearfix())
    return queryContEl
  }

  getQueryFiltersGroupTemplate(filtersGroup, targets, filterNames) {
    const wrapper = $('<div>', { 'class': 'agenda-settings-query-filters-group-wrapper' })
    let filtersGroupEl = $('<ul>', { class: 'agenda-settings-query-filters-group' })
    for (let filter of filtersGroup) {
      let filterEl = this.getQueryFilterTemplate(filter, targets, filterNames)
      filtersGroupEl.append(filterEl)
    }
    let addNewFilter = $('<button>', { 'class': 'btn btn-add btn-add-new-filter' }).text('+ add new filter').on('click', () => {
      filtersGroupEl.append(this.getQueryFilterTemplate({}, targets, filterNames))
    })
    return wrapper.append(filtersGroupEl, addNewFilter)
  }

  getQueryFilterTemplate(filter, targets, filterNames) {
    let filterEl = $(`<li class="agenda-settings-query-filter"></li>`)
    let filterTargetDropdownEl = $(`<select class=" filter-target"></select>`)
    for (let target of targets) {
      let optionEl = $(`<option value="${target}">${target}</option>`)
      filterTargetDropdownEl.append(optionEl)
    }
    if (filter.target) {
      filterTargetDropdownEl.val(filter.target)
    }
    let filterNameDropdownEl = $(`<select class=" filter-name"></select>`)
    for (let name of filterNames) {
      let optionEl = $(`<option value="${name}">${name.replace(/_/g, ' ')}</option>`)
      filterNameDropdownEl.append(optionEl)
    }
    if (filter.name) {
      filterNameDropdownEl.val(filter.name)
    }
    let filterValueInputEl = $(`<input class=" filter-value" type="text">`)
    if (filter.value) {
      filterValueInputEl.val(filter.value)
    }

    let removeFilterEl = $('<button>', { 'class': 'btn btn-remove' }).text('remove').on('click', () => {
      filterEl.remove()
    })

    return filterEl.append(filterTargetDropdownEl, filterNameDropdownEl, filterValueInputEl, removeFilterEl, clearfix())
  }

  saveQuery({ queryContEl }) {
    const filtersGroups = []
    queryContEl.find('.agenda-settings-query-filters-group').each((i, filtersGroupEl) => {
      let filtersGroup = []
      $(filtersGroupEl).find('.agenda-settings-query-filter').each((i, filterEl) => {
        filtersGroup.push({
          target: $(filterEl).find('.filter-target').val(),
          name: $(filterEl).find('.filter-name').val(),
          value: $(filterEl).find('.filter-value').val(),
        })
      })
      if (filtersGroup.length > 0) {
        filtersGroups.push(filtersGroup)
      }
    })
    const sortOptions = []
    queryContEl.find('.query-sort-options-wrapper .query-sort-option').each((i, sortOptionInput) => {
      if ($(sortOptionInput).val().length > 0) {
        let sortParamsArr = this.sorting.parseSortParams($(sortOptionInput).val())
        sortOptions.push({
          id: generateId(10),
          name: $(sortOptionInput).val(),
          by: sortParamsArr.map(p => p.name + p.fragment),
          order: sortParamsArr.map(p => p.order),
        })
      }
    })
    const query = {
      id: $(queryContEl).attr('query-id'),
      name: $(queryContEl).find('.query-name-input').val(),
      groupByDoc: $(queryContEl).find('.group-by-document-checkbox').prop('checked'),
      groupByDate: $(queryContEl).find('.group-by-date-checkbox').prop('checked'),
      renderTags: $(queryContEl).find('.render-tags-checkbox').prop('checked'),
      removeDates: $(queryContEl).find('.remove-dates-checkbox').prop('checked'),
      firstDay: $(queryContEl).find('.first-day-of-the-week').val(),
      daysReversed: $(queryContEl).find('.days-reversed-checkbox').prop('checked'),
      daysWithResults: $(queryContEl).find('.show-only-days-with-match-checkbox').prop('checked'),
      autorefresh: $(queryContEl).find('.auto-refresh-dropdown').val(),
      integrateWithGoogleCalendar: $(queryContEl).find('.integrate-with-google-calendar-checkbox').prop('checked'),
      docs: $(queryContEl).find('.query-documents').val().split('\n'),
      archives: $(queryContEl).find('.query-archive-documents').val().split('\n'),
      filtersGroups,
      sortOptions
    }
    this.agendaQueries.saveQuery({ query })
  }

  async removeQuery({ queryContEl }) {
    const queryId = $(queryContEl).attr('query-id')
    this.agendaQueries.removeQuery({ id: queryId })
    $(queryContEl).slideUp({ complete: () => $(queryContEl).remove() })

    const views = await this.agendaViews.getRawViews()
    views.map(async view => {
      const queries = []
      view.queries.map(viewQueryId => {
        if (viewQueryId != queryId) {
          queries.push(viewQueryId)
        }
      })
      if (queries.length != view.queries.length) {
        view.queries = queries
        this.agendaViews.saveView({ view })
        console.log('zapisano zmieniony view')
      }
    })

  }











  async getViewTemplate({ view }) {
    let id = generateId()

    let viewContEl = $('<div>', { 'class': 'agenda-settings-section-views-view-container', 'view-id': id })

    let viewNameLabelEl = $(`<label class="view-name-label">View name:</label>`)
    let viewNameInputEl = $(`<input class="view-name" type="text">`)
    viewContEl.append(viewNameLabelEl, viewNameInputEl, clearfix())

    // let viewShortcutLabelEl = $(`<label class="">Popup shortcut:</label>`)
    // let viewShortcutInputEl = $(`<input class=" view-shortcut" type="text">`)
    // viewContEl.append(viewShortcutLabelEl, viewShortcutInputEl, clearfix())
    const queries = $('<ul>', { 'class': 'settings-popup-sortable-input-rows' }).sortable({
      handle: ".handle", stop: async (event, ui) => {
      }
    })
    let selectNewQuery = $('<button>', { 'class': 'btn btn-add btn-add-query' }).text('+ add query').on('click', async () => {
      const template = await this.getSelectQueryTemplate({ queryId: null })
      // template.insertBefore(selectNewQuery)
      queries.append(template)
    })
    viewContEl.append(queries, selectNewQuery, clearfix())

    if (view) {
      viewContEl.attr('view-id', view.id)
      viewContEl.find('.view-name').val(view.name)
      await Promise.all(view.queries.map(async queryId => {
        const template = await this.getSelectQueryTemplate({ queryId })
        queries.append(template)
      }))
    }

    let saveView = $('<button>', { 'class': 'btn btn-save btn-save-view' }).text('save view').on('click', () => {
      this.saveView({ viewContEl })
    })
    let removeView = $('<button>', { 'class': 'btn btn-remove btn-remove-view' }).text('Remove view').on('click', () => {
      this.removeView({ viewContEl })
    })

    return viewContEl.append(saveView, removeView, clearfix())
  }

  async getSelectQueryTemplate({ queryId }) {
    const rowJqNode = $('<li>', { 'class': 'settings-popup-sortable-input-row' })
    const handle = $('<i class="fas fa-arrows-alt handle"></i>')

    // let queriesDropdownLabel = $(`<label class="">Queries</label>`)
    let queriesDropdown = $(`<select class=" queries-dropdown"></select>`).append(
      $(`<option value="0">Choose query from the list</option>`)
    )

    const queries = await this.agendaQueries.getQueries()
    queries.map(query => {
      queriesDropdown.append($(`<option value="${query.id}">${query.name}</option>`))
    })

    const removeBtnJqNode = $('<button>', { 'class': 'btn btn-remove', value: 'remove' }).text('remove').on('mousedown', async () => {
      rowJqNode.remove()
    })
    if (queryId) {
      queriesDropdown.val(queryId)
    }

    return rowJqNode.append(handle, queriesDropdown, removeBtnJqNode, clearfix())
  }

  saveView({ viewContEl }) {
    const queries = []
    viewContEl.find('.queries-dropdown').each((i, queriesDropdown) => {
      queries.push($(queriesDropdown).val())
    })
    const view = {
      id: $(viewContEl).attr('view-id'),
      name: $(viewContEl).find('.view-name').val(),
      queries,
      shortcut: $(viewContEl).find('.view-shortcut').val()
    }
    this.agendaViews.saveView({ view })
  }

  removeView({ viewContEl }) {
    this.agendaViews.removeView({ id: $(viewContEl).attr('view-id') })
    $(viewContEl).slideUp({ complete: () => $(viewContEl).remove() })
  }
}