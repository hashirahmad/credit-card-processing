const moment = require('moment')
const memory = require('../../database/memory')
const APIError = require('../../helpers/APIError')
const listCard = require('./list')

class addCard {
    /**
     * Using "Luhn 10" to validate the card number which is
     * being added is indeed valid.
     */
    // eslint-disable-next-line class-methods-use-this
    isValid(cardNumber = '') {
        const cardNumberString = String(cardNumber)

        const nDigits = cardNumberString.length

        let nSum = 0
        let isSecond = false
        for (let i = nDigits - 1; i >= 0; i -= 1) {
            let d = cardNumberString[i].charCodeAt() - '0'.charCodeAt()

            if (isSecond) d *= 2

            nSum += parseInt(d / 10, 10)
            nSum += d % 10

            isSecond = !isSecond
        }
        return nSum % 10 === 0
    }

    /**
     * Add a card number to the system. Will check the validity
     * of the card and will early exit when not card number not valid.
     */
    add({ number = '', name = '', limit = 0 }) {
        /**
         * Lets make sure we are not adding same number again.
         */
        const existingCard = listCard.get({ number })
        if (existingCard && existingCard.number) {
            throw new APIError({
                errorCode: 'INVALID_PARAM',
                objectDetails: { existingCard },
                templateUserMessage: `'${number}' is already added in the system`,
            })
        }
        const valid = this.isValid(number)
        if (!valid) {
            throw new APIError({
                errorCode: 'INVALID_PARAM',
                objectDetails: { number, valid },
                templateUserMessage: `'${number}' is not a valid card number`,
            })
        }
        const obj = {
            number,
            name,
            limit,
            balance: 0,
            addedEpoch: moment().unix(),
        }
        memory.add(obj)
        return {
            ...obj,
            added: moment.unix(obj.addedEpoch).format('LLLL'),
        }
    }
}

module.exports = new addCard()
