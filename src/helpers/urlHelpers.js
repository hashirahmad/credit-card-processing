exports.isURL = (url) => {
    try {
        // eslint-disable-next-line no-param-reassign
        const actualURL = new URL(url)
        return { url: actualURL, is: true }
    } catch (err) {
        return { is: false }
    }
}

exports.injectExternalSignInId = ({ url, externalSignInId }) => {
    const isURL = exports.isURL(url)
    if (!isURL.is) {
        return false
    }

    isURL.url.searchParams.set('state', externalSignInId)
    return isURL.url
}
