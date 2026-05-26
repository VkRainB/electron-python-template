/**
 * @typedef {Object} ElectronRequest
 * @property {'electron_request'} type
 * @property {string|null} callback_id
 * @property {string} action
 * @property {Record<string, any>} params
 * @property {number} timeout
 */

/**
 * @typedef {Object} ElectronResponse
 * @property {string} callback_id
 * @property {boolean} success
 * @property {any} [result]
 * @property {string} [error]
 * @property {number} timestamp
 */

/**
 * @typedef {(params: Record<string, any>) => Promise<any> | any} ActionHandler
 */

/**
 * @typedef {Object} BridgeStats
 * @property {number} totalRequests
 * @property {number} totalSuccess
 * @property {number} totalErrors
 * @property {number} averageDuration
 * @property {string[]} handlers
 */

export {}
