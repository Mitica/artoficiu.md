
require('dotenv').config()

const downloadCategories = require('./downloadCategories');
const downloadProperties = require('./downloadProperties');
const downloadPropertyValues = require('./downloadPropertyValues');
const downloadProducts = require('./downloadProducts');
const downloadProductVariants = require('./downloadProductVariants');
const createClient = require('contentful-management').createClient

console.log(`Start script: downloader`)

const spaceId = process.env.CONTENTFUL_SPACE

if (!spaceId) {
    throw `env CONTENTFUL_SPACE is required!`
}

const accessToken = process.env.CONTENTFUL_PERSONAL_ACCESS_TOKEN

if (!accessToken) {
    throw `env CONTENTFUL_PERSONAL_ACCESS_TOKEN is required!`
}

const client = createClient({
    accessToken: accessToken
})

const headers = {
    cookie: '.AspNet.ApplicationCookie=' + process.env.ARTOFICIU_LOGIN_COOKIE
}

client.getSpace(spaceId)
    .then(space => {
        const tasks = [
            // downloadCategories(space, headers),
            // downloadProperties(space, headers),
            // downloadPropertyValues(space, headers),
            downloadProducts(space, headers),
            // downloadProductVariants(space, headers),
        ]

        return Promise.all(tasks)
    })
    .then(_ => console.log('DONE!'))
    .catch(error => console.error(error))
