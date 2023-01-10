/**
 * @api {get} /v1/card/list List all cards
 * @apiName /v1/card/list
 * @apiGroup Card
 * @apiPermission none
 *
 * @apiDescription This will get a list of the cards stored in the system.
 * 
 * 
 * @apiParam {Number}	[pageNumber=1]	   The page number.
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
const listCard = require('../../logic/card/list')

module.exports = (url) => {
    app.get(url, async (req, res, next) => {
        /** Get all params */
        const pageNumber = restify.getNumberInRange(
            req,
            'pageNumber',
            1,
            1,
            99999999999
        )

        const response = listCard.list(pageNumber)
        restify.ok(req, res, next, response)
    })
}
