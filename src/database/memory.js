class memory {
    constructor() {
        this.cards = []
        this.pageSize = 10
    }

    /** Add an object to the in memory storage */
    add(obj) {
        this.cards.push(obj)
    }

    /**
     * Returns a paginated list according to the specified page number
     */
    list(pageNumber = 1) {
        const page = this.cards.slice(
            (pageNumber - 1) * this.pageSize,
            pageNumber * this.pageSize
        )
        return {
            page,
            pageNumber,
            pageSize: this.pageSize,
            total: this.cards.length,
        }
    }

    /**
     * Returns a particular item by specified `key` i.e. field name
     * and `value` i.e. the actual value to retrieve.
     */
    get({ key, value }) {
        for (let i = 0; i < this.cards.length; i += 1) {
            const obj = this.cards[i]
            if (obj[key] === value) return obj
        }
        return null
    }
}

module.exports = new memory()
