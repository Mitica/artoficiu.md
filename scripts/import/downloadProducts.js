
const fs = require('fs')
const helpers = require('./helpers')
const TurndownService = require('turndown')
const turndownService = new TurndownService()

const IMAGES = [];

module.exports = function downloadProducts(space, headers) {

    const products = [];

    return helpers.syncPromise(getIds(), id => getProduct(id, headers)
        .then(product => {
            if (product) {
                products.push(product)
            }
        })
        .catch(error => console.log(error.message))
    )
        .then(() => {
            if (products.length === 0) {
                throw new Error(`No product explored!`)
            }
            helpers.saveData('images', IMAGES.filter((v, i, a) => a.indexOf(v) === i))
            return helpers.saveData('products', products)
        });
}

function getProduct(id, headers) {
    return helpers.loadHtmlPage(`http://www.artoficiu.md/Admin/ECommerce/EditProduct/${id}`, headers)
        .then($ => parseProduct($, id))
}

function parseProduct($, id, headers) {
    const name = $('input#Name').val()
    if (!name) {
        return Promise.reject(new Error(`Invalid product page`))
    }
    const slug = helpers.toSlug($('#Descriptions_0__UrlTitlePrepend').val().trim() + ' ' + name)

    const categories = $('input[type="checkbox"]', '.list-unstyled')
        .filter((_, item) => $(item).attr('name').indexOf('Categories') === 0 && $(item).prop('checked'))
        .toArray()
        .map(item => $(item).val())

    if ($('#IsRecommended').prop('checked')) {
        categories.push('_recommended')
    }
    if ($('#IsPopular').prop('checked')) {
        categories.push('_popular')
    }

    // console.log('product categories', categories)

    const price = parseFloat($('input#Price').val())
    const newPrice = parseFloat($('input#NewPrice').val())
    const showNewPrice = $('input#ShowNewPrice').prop('checked')
    const published = $('select[name="Publish"] option[selected="selected"]').val() === 'true';

    if (!published) {
        console.log(`Product ${name} is not published`)
        return Promise.resolve()
    }

    const ro = {
        description: turndownService.turndown($('#Descriptions_0__Description').val()),
        metaTitle: $('#Descriptions_0__MetaTitle').val(),
        metaDescription: $('#Descriptions_0__MetaDescription').val(),
    }
    const ru = {
        description: turndownService.turndown($('#Descriptions_1__Description').val()),
        metaTitle: $('#Descriptions_1__MetaTitle').val(),
        metaDescription: $('#Descriptions_1__MetaDescription').val(),
    }

    if (ro.description) {
        ro.description = ro.description.replace(/\!\[\]\(data:image\/.+\)/g, '')
    }
    if (ru.description) {
        ru.description = ru.description.replace(/\!\[\]\(data:image\/.+\)/g, '')
    }

    if (ro.metaDescription && ro.metaDescription.length > 255) {
        ro.metaDescription = ro.metaDescription.substr(0, 255)
    }
    if (ru.metaDescription && ru.metaDescription.length > 255) {
        ru.metaDescription = ru.metaDescription.substr(0, 255)
    }
    if (ro.metaTitle && ro.metaTitle.length > 255) {
        ro.metaTitle = ro.metaTitle.substr(0, 255)
    }
    if (ru.metaTitle && ru.metaTitle.length > 255) {
        ru.metaTitle = ru.metaTitle.substr(0, 255)
    }
    if (ro.metaTitle && ro.metaTitle.trim().length < 5) {
        delete ro.metaTitle
    }
    if (ro.metaDescription && ro.metaDescription.trim().length < 5) {
        delete ro.metaDescription
    }
    if (ru.metaTitle && ru.metaTitle.trim().length < 5) {
        delete ru.metaTitle
    }
    if (ru.metaDescription && ru.metaDescription.trim().length < 5) {
        delete ru.metaDescription
    }

    const images = $('a.fancybox-button', '#table_images')
        .toArray()
        .map(item => 'http://www.artoficiu.md' + $(item).attr('href').replace('/Images/1/', '/Images/0/'))

    images.forEach(item => IMAGES.push(item))

    const variants = $('tr', '#datatable_categories')
        .filter((_, tr) => $('i.fa-check', tr).length > 0)
        .toArray()
        .map(tr => $('a', tr).attr('href'))
        .map(url => /(\d+)$/.exec(url)[1])
        .filter(id => variantExists(id))

    const properties = $('.portlet-body select option[selected]')
        .toArray()
        .map(item => $(item).val())
        .filter(item => item !== 'true')

    const product = {
        id: `shop_product${id}`,
        contentType: 'shop_product',
        fields: {
            price: { ro: newPrice && newPrice > 0 && showNewPrice ? newPrice : price },
            slug: { ro: slug },
            name: {
                ru: name,
                ro: name,
            },
            isInStock: {
                ro: variants.length > 0
            },
            description: {
                ru: ru.description,
                ro: ro.description,
            },
            metaTitle: {
                ru: ru.metaTitle,
                ro: ro.metaTitle,
            },
            metaDescription: {
                ru: ru.metaDescription,
                ro: ro.metaDescription,
            },
            categories: {
                ro: categories.map(item => {
                    return { "sys": { "type": "Link", "linkType": "Entry", "id": `category${item}` } }
                }),
            },
            images: {
                ro: images.map(item => {
                    return { "sys": { "type": "Link", "linkType": "Asset", "id": helpers.md5(item) } }
                }),
            },
            variants: {
                ro: variants.map(item => {
                    return { "sys": { "type": "Link", "linkType": "Entry", "id": `shop_product_variant${item}` } }
                }),
            },
            properties: {
                ro: properties.map(item => {
                    return { "sys": { "type": "Link", "linkType": "Entry", "id": `shop_property_value${item}` } }
                }),
            }
        }
    }

    if (~[undefined, null, '', ' '].indexOf(product.fields.metaDescription.ro)) {
        delete product.fields.metaDescription
    } else {
        if (~[undefined, null, '', ' '].indexOf(product.fields.metaDescription.ru)) {
            delete product.fields.metaDescription.ru
        }
    }
    if (~[undefined, null, '', ' '].indexOf(product.fields.metaTitle.ro)) {
        delete product.fields.metaTitle
    } else {
        if (~[undefined, null, '', ' '].indexOf(product.fields.metaTitle.ru)) {
            delete product.fields.metaTitle.ru
        }
    }

    if (newPrice && newPrice > 0 && showNewPrice) {
        product.fields.oldPrice = {
            ro: price
        }
    }

    return product
}

function variantExists(id) {
    return require('./data/product_variants').find(item => item.id === 'shop_product_variant' + id)
}

function getIds() {
    const ids = [];
    for (var i = 1; i < 100; i++) {
        ids.push(i);
    }
    return ids;
}
