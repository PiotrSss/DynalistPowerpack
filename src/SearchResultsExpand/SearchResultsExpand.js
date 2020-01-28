

export class SearchResultsExpand {

  async getPopupSettingsSection() { }

  onShowDocumentSearchbar() {
    if ($('.DocumentTools-search').find('.expand-search-results').length === 0) {
      const btn = $('<button>', { 'class': 'expand-search-results' }).html('<i class="fas fa-plus-square"></i>').on('mousedown', () => {
        this.expand()
      })
      $('.DocumentTools-search').prepend(btn)
      btn.clone().insertBefore($('.MobileHeader-option--clearSearch'))
    }
  }

  onExitDocumentSearch() {
    $('.expand-search-results').remove()
  }

  onExpandSearchResults() {
    setTimeout(() => this.expand(), 500)
  }

  expand() {
    let opened = true
    // while (opened) {
    const bullets = $('.Node:visible').find('> .is-collapsed.is-parent > .Node-bullet')
    if (bullets.length > 0) {
      bullets.map((i, bullet) => {
        while ($(bullet).parent().hasClass('is-collapsed')) {
          bullet.click()
        }
      })
      // } else {
      // opened = false
    }
    // }
  }

}