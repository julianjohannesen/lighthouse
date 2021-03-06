/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 *  This audit evaluates if a page's load performance is fast enough for it to be considered a PWA.
 *  We are doublechecking that the network requests were throttled (or slow on their own)
 *  Afterwards, we report if the TTFI is less than 10 seconds.
 */

const isDeepEqual = require('lodash.isequal');
const Audit = require('./audit');
const mobile3GThrottling = require('../config/constants').throttling.mobile3G;
const Util = require('../report/html/renderer/util.js');

// Maximum TTI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTI = 10 * 1000;

class LoadFastEnough4Pwa extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'load-fast-enough-for-pwa',
      description: 'Page load is fast enough on 3G',
      failureDescription: 'Page load is not fast enough on 3G',
      helpText:
        'A fast page load over a 3G network ensures a good mobile user experience. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/fast-3g).',
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.AuditResult}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    // If throttling was default devtools or lantern 3G throttling, then reuse the given settings
    // Otherwise, we'll force the usage of lantern 3G.
    const settingOverrides = {throttlingMethod: 'simulate', throttling: mobile3GThrottling};
    const settings =
      context.settings.throttlingMethod !== 'provided' &&
      isDeepEqual(context.settings.throttling, mobile3GThrottling)
        ? context.settings
        : Object.assign({}, context.settings, settingOverrides);

    const metricComputationData = {trace, devtoolsLog, settings};
    const tti = await artifacts.requestInteractive(metricComputationData);

    const score = Number(tti.timing < MAXIMUM_TTI);

    let debugString;
    if (!score) {
      // eslint-disable-next-line max-len
      debugString = `First Interactive was ${Util.formatMilliseconds(tti.timing)}. More details in the "Performance" section.`;
    }

    return {
      score,
      debugString,
      rawValue: tti.timing,
    };
  }
}

module.exports = LoadFastEnough4Pwa;
