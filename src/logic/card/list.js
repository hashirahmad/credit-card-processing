const moment = require('moment')
const memory = require('../../database/memory')

class listCard {
    /**
     * Add types so we know what the types are and maintain
     * single source of truth.
     */
    // eslint-disable-next-line class-methods-use-this
    parse(array) {
        const parsed = Array.from(array).map((o) => ({
            number: String(o.number),
            name: String(o.name),
            limit: Number(o.limit),
            balance: Number(o.balance),
            added: moment.unix(o.addedEpoch).format('LLLL'),
        }))
        return parsed
    }

    /**
     * List cards according to the specified page number.
     */
    list(pageNumber = 0) {
        const result = memory.list(pageNumber)
        const parsed = this.parse(result.page)
        return { ...result, page: parsed }
    }

    /** Will retrieve a particular card by specified `number` */
    get({ number = '' }) {
        const result = memory.get({ key: 'number', value: number })
        if (result) {
            const parsed = this.parse([result])
            return parsed[0]
        }
        return null
    }
}

module.exports = new listCard()
