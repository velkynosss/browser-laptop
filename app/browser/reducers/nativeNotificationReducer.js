/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const braveNotifier = require('brave-node-notifier')

// Actions
const appActions = require('../../../js/actions/appActions')

// Constants
const appConstants = require('../../../js/constants/appConstants')
const settings = require('../../../js/constants/settings')

// State
const userModelState = require('../../common/state/userModelState')

// Utils
const {makeImmutable} = require('../../common/state/immutableUtil')
const notificationUtil = require('../../renderer/lib/notificationUtil')

const nativeNotifications = (state, action, immutableAction) => {
  action = immutableAction || makeImmutable(action)
  switch (action.get('actionType')) {
    case appConstants.APP_NATIVE_NOTIFICATION_CREATE:
      {
        notificationUtil.createNotification(action.get('options'))
        break
      }
    case appConstants.APP_ON_NATIVE_NOTIFICATION_CONFIGURATION_CHECK:
      {
        braveNotifier.configured((err, result) => {
          appActions.onUserModelLog(appConstants.APP_ON_NATIVE_NOTIFICATION_CONFIGURATION_CHECK, {err, result})

          appActions.onNativeNotificationConfigurationReport((!err) && (result))
        })
        break
      }
    case appConstants.APP_ON_NATIVE_NOTIFICATION_CONFIGURATION_REPORT:
      {
        const ok = !!action.get('ok')

        if (!ok) {
          appActions.changeSetting(settings.ADS_ENABLED, false)
        }

        state = userModelState.setUserModelValue(state, 'configured', ok)
        break
      }
    case appConstants.APP_ON_NATIVE_NOTIFICATION_ALLOWED_CHECK:
      {
        braveNotifier.enabled((err, result) => {
          appActions.onUserModelLog(appConstants.APP_ON_NATIVE_NOTIFICATION_ALLOWED_CHECK, {err, result})

          appActions.onNativeNotificationAllowedReport((!err) && (result))
        })
        break
      }
    case appConstants.APP_ON_NATIVE_NOTIFICATION_ALLOWED_REPORT:
      {
        state = userModelState.setUserModelValue(state, 'allowed', !!action.get('ok'))
        break
      }
  }

  return state
}

module.exports = nativeNotifications
