/* eslint-disable node/no-unpublished-require */

const { assert } = require('chai')
const { describe, it } = require('mocha')
const addCard = require('./add')
const setUp = require('./setUp')

describe('Test: Card Add', () => {
    it('isValid() defined', () => {
        assert.isFunction(addCard.isValid)
    })
    it('add() defined', () => {
        assert.isFunction(addCard.add)
    })

    const invalidNumbers = [
        '12345678910',
        '11223344556677',
        '73847348324',
        'hsjadhsdadsa',
    ]

    const validNumbers = ['4485275742308327', '6011329933655299']

    invalidNumbers.forEach((number) => {
        it(`'${number}' should be invalid`, () => {
            const valid = addCard.isValid(number)
            assert.isFalse(valid)
        })
    })

    validNumbers.forEach((number) => {
        it(`'${number}' should be valid`, () => {
            const valid = addCard.isValid(number)
            assert.isTrue(valid)
        })
    })

    it('Not allow duplicate card numbers', () => {
        addCard.add({ number: validNumbers[0], name: 'Anything', limit: 10 })
        try {
            addCard.add({
                number: validNumbers[0],
                name: 'Anything',
                limit: 10,
            })
        } catch (err) {
            setUp.isAPIError(err, 'INVALID_PARAM', 'already')
        }
    })
    it('Adding a card maintains its strict signature', () => {
        const result = addCard.add({
            number: validNumbers[1],
            name: 'Anything',
            limit: 10,
        })
        assert.isString(result.added)
        assert.isNumber(result.addedEpoch)
        assert.isNumber(result.balance)
        assert.isNumber(result.limit)
        assert.isString(result.name)
        assert.isString(result.number)
    })
})
