
import { clearfix } from '../templates'

export class GoogleCalendarIntegration {

  constructor({ googleCalendar, settingsManager, dlInterface }) {
    this.googleCalendar = googleCalendar
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'GoogleCalendarIntegration'
    this.featureTitle = 'Google Calendar Integration'

    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        api_key: '',
        client_id: '',
      }
    })

    if (await this.getSetting('status')) {
      const apiKey = await this.getSetting('api_key')
      const clientID = await this.getSetting('client_id')

      if (apiKey !== '' && clientID !== '') {
        this.googleCalendar.load({ apiKey, clientID })
      }
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

    const apiKeyFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'api_key', label: 'API Key'
    })
    const clientIDFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'client_id', label: 'Client ID'
    })

    const messageFragment = $('<span class="popup-settings-google-calendar-message"></span>')

    const authorizeBtn = $('<button>', { 'class': 'btn btn-save popup-settings-google-calendar-authorize' }).text('Authorize').on('mousedown', async () => {
      const apiKey = await this.getSetting('api_key')
      const clientID = await this.getSetting('client_id')

      if (apiKey !== '' && clientID !== '') {
        this.googleCalendar.load({ apiKey, clientID })
        messageFragment.text(this.googleCalendar.status).delay(2000).text()
      } else {
        messageFragment.text('You need to provide both values').delay(2000).text()
      }
    })
    const signOutBtn = $('<button>', { 'class': 'btn btn-remove popup-settings-google-calendar-sign-out' }).text('Sign Out').on('mousedown', () => {
      if (this.googleCalendar.isSigned()) {
        this.googleCalendar.signOut()
        messageFragment.text(this.googleCalendar.status).delay(2000).text()
        this.googleCalendar.status = ''
      } else {
        messageFragment.text('You\'re currently not signed in').delay(2000).text()
      }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, apiKeyFragment, clientIDFragment, clearfix(), messageFragment, clearfix(), authorizeBtn, signOutBtn] })
  }

  async activate() {

    if (await this.getSetting('status')) {
      const apiKey = await this.getSetting('api_key')
      const clientID = await this.getSetting('client_id')

      if (apiKey !== '' && clientID !== '') {
        this.googleCalendar.load({ apiKey, clientID })
      }
    }
  }

  deactivate() {
    if (this.googleCalendar.isSigned()) {
      this.googleCalendar.signOut()
    }
  }

}