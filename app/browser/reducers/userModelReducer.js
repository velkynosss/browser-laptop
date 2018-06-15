/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

// Actions
const appActions = require('../../../js/actions/appActions')

// Constants
const appConstants = require('../../../js/constants/appConstants')
const settings = require('../../../js/constants/settings')

// State
const tabState = require('../../common/state/tabState')
const userModelState = require('../../common/state/userModelState')
const windowState = require('../../common/state/windowState')

// Utils
const userModel = require('../api/userModel')
const demoApi = require('../api/userModelLog')
const {makeImmutable} = require('../../common/state/immutableUtil')

const userModelReducer = (state, action, immutableAction) => {
  action = immutableAction || makeImmutable(action)
  switch (action.get('actionType')) {
    case appConstants.APP_SET_STATE: // performed once on app startup
      {
        state = userModel.initialize(state)

        state = userModel.generateAdReportingEvent(state, 'restart', action)
        break
      }
    case appConstants.APP_WINDOW_UPDATED:
      {
        let winData = windowState.getActiveWindow(state)
        let focusP = winData && winData.get('focused')

        userModel.appFocused(state, focusP)
        state = userModel.generateAdReportingEvent(state, focusP ? 'foreground' : 'background', action)
        break
      }
    case appConstants.APP_TAB_UPDATED: // kind of worthless; fires too often
      {
        const changeInfo = action.get('changeInfo')
        const stat = changeInfo && changeInfo.get('status')
        const complete = stat === 'complete'

        if (complete) {
          state = userModel.generateAdReportingEvent(state, 'load', action)
        }

        const tabValue = action.get('tabValue')

        const blurred = tabValue && !tabValue.get('active')

        state = userModel.tabUpdate(state, action)
        if (blurred) state = userModel.generateAdReportingEvent(state, 'blur', action)
        break
      }
    case appConstants.APP_REMOVE_HISTORY_SITE:
      {
        console.log('actionType remove history site')
        state = userModel.removeHistorySite(state, action)
        break
      }
    case appConstants.APP_ON_CLEAR_BROWSING_DATA:
      {
        state = userModel.removeAllHistory(state)
        state = userModel.confirmAdUUIDIfAdEnabled(state)
        break
      }
    case appConstants.APP_TAB_ACTIVATE_REQUESTED:  // tab switching
      {
        const tabId = action.get('tabId')
        const tab = tabState.getByTabId(state, tabId)
        if (tab == null) break

        const url = tab.get('url')
        state = userModel.tabUpdate(state, action)
        state = userModel.testShoppingData(state, url)
        state = userModel.testSearchState(state, url)
//        state = userModel.updateTimingModel(state) // this may be extraneous
        state = userModel.generateAdReportingEvent(state, 'focus', action)
        break
      }
    case appConstants.APP_IDLE_STATE_CHANGED: // TODO where to set this globally
      {
        console.log('idle state changed. action: ', action.toJS())

        if (action.has('idleState') && action.get('idleState') === 'active') {
          state = userModel.recordUnIdle(state)
          appActions.onNativeNotificationAllowedCheck(true)
        }
        break
      }
    case appConstants.APP_TEXT_SCRAPER_DATA_AVAILABLE:
      {
        const tabId = action.get('tabId')
        const tab = tabState.getByTabId(state, tabId)
        if (tab == null) break

        const url = tab.get('url')
        state = userModel.testShoppingData(state, url)
        state = userModel.testSearchState(state, url)
        state = userModel.classifyPage(state, action, tab.get('windowId'))
        state = userModel.updateTimingModel(state)
        break
      }
    case appConstants.APP_SHUTTING_DOWN:
      {
        state = userModel.saveCachedInfo(state)
        break
      }
    case appConstants.APP_ADD_AUTOFILL_ADDRESS:
    case appConstants.APP_ADD_AUTOFILL_CREDIT_CARD:
      {
        // TODO test this SCL
        const url = action.getIn(['details', 'newURL'])
        state = userModelState.flagBuyingSomething(state, url)
        break
      }
    // all other settings go here; TODO need to pipe settings through beyond what is set in appConfig.js
    case appConstants.APP_CHANGE_SETTING:
      {
        switch (action.get('key')) {
          case settings.ADS_ENABLED:
            {
              state = userModel.initialize(state, action.get('value'))
              break
            }
          case settings.ADS_PLACE:
            {
              state = userModelState.setAdPlace(state, action.get('value'))
              break
            }
          case settings.ADS_LOCALE:
            {
              state = userModel.changeLocale(state, action.get('value'))
              break
            }
        }

        // You need to call this at the bottom of the case and not
        // the top because the `switch` may change the values in question
        state = userModel.generateAdReportingEvent(state, 'settings', action)
        break
      }
    case appConstants.APP_ON_USERMODEL_LOG:
      {
        const eventName = action.get('eventName')
        const data = action.get('data')
        demoApi.appendValue(eventName, data)

        state = userModel.generateAdReportingEvent(state, 'notify', action)
        break
      }
    case appConstants.APP_ON_USERMODEL_COLLECT_ACTIVITY:
      {
        state = userModel.collectActivity(state)
        break
      }
    case appConstants.APP_ON_USERMODEL_UPLOAD_LOGS:
      {
        state = userModel.uploadLogs(state, action.get('stamp'), action.get('retryIn'))
        break
      }
    case appConstants.APP_ON_USERMODEL_DOWNLOAD_SURVEYS:
      {
        state = userModel.downloadSurveys(state, action.get('entries'))
        break
      }
    case appConstants.APP_NETWORK_CONNECTED:
      {
        userModel.retrieveSSID()
        break
      }
    case appConstants.APP_ON_ADS_SSID_RECEIVED:
      {
        state = userModelState.setSSID(state, action.get('value'))
        break
      }
  }

  return state
}

module.exports = userModelReducer
