/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable node/no-unpublished-require */
const { assert, expect } = require('chai')

exports.isAPIError = (err, errCode, userMsg) => {
    /**
     * For some reason the fake message does not work. I have
     * not looked too much into it.
     */
    assert.isTrue(err.isBusinessError)
    assert.strictEqual(err.errorCode, errCode)
    if (userMsg) assert.include(err.templateUserMessage, userMsg)
}

const eErr = 'EXPECTED_ERR'

/**
 * Now we are going to throw an Error.
 * To prevent further execution of completeExchangeOnCMPS
 * We want to test only up to this point.
 */
exports.throwDeliberateErr = () => {
    throw new Error(eErr)
}

/**
 * Just checking the error is our own
 * thrown error.
 */
exports.ensureItIsOurDeliberateErr = (err) => {
    expect(err.message).equal(
        eErr,
        `Some other error happened in place of our: ${eErr}`
    )
}
