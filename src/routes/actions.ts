
import { Router, Request, Response } from 'express';
import config from '../config';
import { Data } from '../data';
import { CartData } from '../cart';
import { ShopProductVariantEntity } from '../content/entities';
import logger from '../logger';
import { CartHelpers } from '../cart/cartHelpers';
const ms = require('ms');

const route: Router = Router();

export default route;

//index

route.get('/actions/set_language/:lang', function (req: Request, res: Response) {

    const lang = req.params.lang;

    if (~config.languages.indexOf(lang)) {
        res.cookie('ul', lang, {
            // domain: config.domain,
            maxAge: ms('3m'),
            path: null,
        });
    }

    const ref = req.get('Referrer') || '/';

    res.redirect(ref);
});

route.post('/actions/cart/add', function (req: Request, res: Response) {

    const productId = req.query.productId || req.query.productid || req.query.product_id;
    const variantId = req.query.variantId || req.query.variantid || req.query.variant_id;
    const quantity = parseInt(req.query.quantity || 0);

    const __ = res.locals.__;
    const culture = res.locals.culture;

    if (quantity < 1 || !productId) {
        return cartErrors(res, __('cart_error_invalid_input'));
    }

    Data.shopProduct({ language: culture.language, id: productId })
        .then(product => {
            if (!product) {
                return cartErrors(res, __('cart_error_invalid_product'));
            }
            let variant: ShopProductVariantEntity;
            if (variantId) {
                if (!product.variants) {
                    return cartErrors(res, __('cart_error_invalid_product_variant'));
                }
                variant = product.variants.find(item => item.id === variantId);
                if (!variant) {
                    return cartErrors(res, __('cart_error_invalid_product_variant'));
                }
            }

            const Cart = req.session.Cart as CartData;
            CartHelpers.addItem(Cart, {
                id: product.id,
                product: product,
                quantity: quantity,
                variant: variant,
                variantId: variant && variant.id,
                price: product.price * quantity
            });

            return new Promise<any>((resolve, reject) => {
                req.session.save(error => {
                    if (error) {
                        return reject(error);
                    }
                    res.send({
                        data: { quantity: Cart.quantity }
                    });
                    resolve();
                });
            });
        })
        .catch((error: any) => {
            logger.error(error);
            cartErrors(res, __('server_error'));
        });
});

function cartErrors(res: Response, errors: string | string[]) {
    errors = Array.isArray(errors) ? errors : [errors];

    res.send({
        errors: errors
    });
}
