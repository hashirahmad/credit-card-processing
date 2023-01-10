/**
 * @api {post} /v1/card/add Add Card
 * @apiName /v1/card/add
 * @apiGroup Card
 * @apiPermission none
 *
 * @apiDescription This will add card to the system.
 *
 * @apiParam {String}	number	        Card number. Max up to 19 characters.
 * @apiParam {String}	name	        Card name.
 * @apiParam {String}	[limit=50]	    Card limit. Max limit allowed for the credit card.
 *
 * @apiSuccess {string}   status        ok

@apiSuccessExample {json} Success As an overall count
{
}
@apiSuccessExample {json} Success As a list
{
}
@apiErrorExample {json} EXAMPLE_ERR
{
    error: 'EXAMPLE_ERR',
    details: { hello: "world" },
    userMessage: `Hello there! Erm . . . something went wrong!!!`,
}
*/
const app = require('../../app')
const restify = require('../../helpers/restifyHelpers')
const addCard = require('../../logic/card/add')

module.exports = async (url) => {
    app.post(url, async (req, res, next) => {
        const number = restify.getAsStringAlphanumeric(
            req,
            'number',
            '',
            true,
            19
        )
        const name = restify.getAsStringAlphanumeric(req, 'name', '', true, 40)
        const limit = restify.getNumberInRange(req, 'limit', 50, 50, 9999)

        const response = addCard.add({ number, name, limit })
        restify.ok(req, res, next, response)
    })
}
