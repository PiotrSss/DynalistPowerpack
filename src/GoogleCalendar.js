
export class GoogleCalendar {

  constructor() {
    if ($('.google-calendar-api').length === 0) {
      $('head').append(`<script class="google-calendar-api" async defer src="https://apis.google.com/js/api.js" onload="this.onload=function(){};handleClientLoad()" onreadystatechange="if (this.readyState === 'complete') this.onload()"></script>`)
    }

    this.status = ''

  }

  load({ apiKey, clientID }) {
    const gapiLoaded = setInterval(() => {
      if (gapi) {
        clearInterval(gapiLoaded)
        gapi.load('client:auth2', () => {
          gapi.client.init({
            apiKey: apiKey,
            clientId: clientID,
            // clientId: DYNALIST.GOOGLE_LOGIN_PUBLICKEY,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            scope: "https://www.googleapis.com/auth/calendar"
          }).then(async () => {
            if (!this.isSigned()) {
              this.signIn()
            } else {
              this.status = 'Already authorized'
            }
          }, (error) => {
            console.log(error)
          })
        })
      }
    }, 100)

  }

  isSigned() {
    return gapi.auth2.getAuthInstance().isSignedIn.get()
  }

  signIn() {
    if (!this.isSigned()) {
      gapi.auth2.getAuthInstance().signIn()
      this.status = 'Already authorized'
    }
  }

  signOut() {
    if (this.isSigned()) {
      gapi.auth2.getAuthInstance().signOut()
      this.status = 'Signed out'
    }
  }

  getCalendarsList() {
    gapi.client.calendar.calendarList.list().execute((resp) => {
      return calendars = resp.items
    })
  }

  async getEventsForDay({ day }) {
    let i = 1
    return new Promise(resolve => {
      let interval = setInterval(() => {
        if (gapi && gapi.client && gapi.client.calendar) {
          const events = gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': day.clone().startOf('day').toISOString(),
            'timeMax': day.clone().add(1, 'd').startOf('day').toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 10,
            'orderBy': 'startTime'
          }).then(function (response) {
            return response.result.items
          }, () => {
            return []
          })
          resolve(events)
          clearInterval(interval)
        } else if (i >= 30) {
          clearInterval(interval)
          resolve([])
        }
        i++
      }, 500)
    })

  }

}