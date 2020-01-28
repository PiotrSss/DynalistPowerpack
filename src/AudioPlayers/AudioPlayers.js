
import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class AudioPlayers {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'AudioPlayers'
    this.featureTitle = 'Audio Players'

    window.speechSynthesis.onvoiceschanged = () => {
      this.tts = window.speechSynthesis
      this.voicesList = this.tts.getVoices()
    }

    this.status = false
    this.init()
  }

  async init() {

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        tts_lang: 'en-US'
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

    const selected = await this.getSetting('tts_lang')

    const voices = {}
    this.voicesList.map(voice => {
      return voices[voice.lang] = voice.lang
    })

    const ttsFragment = await this.settingsManager.buildSelectPopupElement({
      featureName: this.featureName, settingName: 'tts_lang', label: 'Text-to-speech default language', selected, values: voices
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, ttsFragment] })
  }

  activate() {
    this.status = true
    this.renderButtonsInAllNodes()
  }

  deactivate() {
    this.status = false

    $('.audio-player').remove()
    $('.tts-player').remove()

    $('.player-tag').show()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderButtonsInAllNodes()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderButtonsInAllNodes()
    }
  }

  onNodeBlur(node) {
    if (this.status && (this.dlInterface.hasTag(node.get_content_parse_tree(), 'play|') || this.dlInterface.hasTag(node.get_content_parse_tree(), 'speak'))) {
      this.renderButton(node)
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderButtonsInAllNodes(node)
    }
  }

  renderButtonsInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.dlInterface.hasTag(node.get_content_parse_tree(), 'play|') || this.dlInterface.hasTag(node.get_content_parse_tree(), 'speak')) {
        this.renderButton(node)
      }
    })
  }

  async renderButton(node) {
    onNodeStateInitialized({
      node, callback: () => {
        const nodeState = this.dlInterface.getNodeState(node)
        $(nodeState.dom.rendered_content_el).find('.node-tag').map(async (i, tag) => {
          if ($(tag).text().includes('#play|') && !$(tag).prev().hasClass('powerpack3-player')) {
            const url = $(tag).text().replace('#play|', '')
            const player = this.createAudioPlayer({ url })
            $(player).insertBefore(tag)
            $(tag).addClass('player-tag').hide()
          }
          if ($(tag).text().includes('#speak') && !$(tag).prev().hasClass('powerpack3-player')) {
            const text = $(tag).parent().text().replace($(tag).text(), '')
            const options = $(tag).text().split('|')
            let lang = await this.getSetting('tts_lang')
            let rate = 1
            options.map(opt => {
              if (opt.includes('-')) { lang = opt }
              if (opt.includes('rate:')) { rate = parseFloat(opt.replace('rate:', '')) }
            })
            const player = this.createTTSPlayer({ text, lang, rate })
            $(player).insertBefore(tag)
            $(tag).addClass('player-tag').hide()
          }
        })
      }
    })
  }

  createAudioPlayer({ url }) {
    const player = $('<span>', { 'class': 'powerpack3-player audio-player' })
    const audio = new Audio(url)
    const pauseBtn = $('<i class="fas fa-pause-circle pause-btn"></i>').on('mousedown', (e) => {
      e.stopImmediatePropagation()
      if (audio.paused) {
        audio.play()
      } else {
        audio.pause()
      }
    }).hide()
    const stopBtn = $('<i class="fas fa-stop-circle stop-btn"></i>').on('mousedown', (e) => {
      e.stopImmediatePropagation()
      audio.pause()
      audio.currentTime = 0
      pauseBtn.hide()
      stopBtn.hide()
    }).hide()
    const playBtn = $('<i class="fas fa-play-circle play-btn"></i>').on('mousedown', (e) => {
      e.stopImmediatePropagation()
      audio.play()
      pauseBtn.show()
      stopBtn.show()
    })
    audio.onended = () => {
      pauseBtn.hide()
      stopBtn.hide()
    }
    return player.append(playBtn, pauseBtn, stopBtn)
  }

  createTTSPlayer({ text, lang, rate = 1 }) {
    const player = $('<span>', { 'class': 'powerpack3-player tts-player' })
    const speech = new SpeechSynthesisUtterance()
    speech.text = text
    speech.lang = lang
    speech.rate = rate
    const pauseBtn = $('<i class="fas fa-pause-circle pause-btn"></i>').on('mousedown', (e) => {
      e.stopImmediatePropagation()
      if (this.tts.paused) {
        this.tts.resume()
      } else {
        this.tts.pause()
      }
    }).hide()
    const stopBtn = $('<i class="fas fa-stop-circle stop-btn"></i>').on('mousedown', (e) => {
      e.stopImmediatePropagation()
      if (this.tts.paused) {
        this.tts.resume()
      }
      this.tts.cancel()
      pauseBtn.hide()
      stopBtn.hide()
    }).hide()
    const playBtn = $('<i class="fas fa-play-circle play-btn"></i>').on('mousedown', (e) => {
      e.stopImmediatePropagation()
      if (this.tts.paused) {
        this.tts.resume()
      } else {
        this.tts.speak(speech)
      }
      pauseBtn.show()
      stopBtn.show()
    })
    speech.onend = () => {
      pauseBtn.hide()
      stopBtn.hide()
    }
    return player.append(playBtn, pauseBtn, stopBtn)
  }

}