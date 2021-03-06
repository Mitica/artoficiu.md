import { Router, Request, Response, NextFunction } from "express";
import { DataContainer, NarbutasStorage } from "../data";
import { Menu as NarbutasMenu } from "../catalog/narbutas/menu";
import links from "../links";
import { canonical } from "../utils";
import { PageType, PageData } from "../catalog/narbutas/page";
import { QSMessage } from "../qsMessage";
import logger from "../logger";

const route: Router = Router();

export default route;

//narbutas
route.get("/narbutas", async function(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const __ = res.locals.__;
  const dc: DataContainer = res.locals.dataContainer;
  try {
    res.locals.currentPageLink = links.narbutas();
    res.locals.site.head.canonical = canonical(res.locals.currentPageLink);

    res.locals.site.head.title = __("narbutas_page_title");
    res.locals.site.head.description = __("narbutas_page_description");

    const items = NarbutasMenu.getItems(null);

    const pages = await Promise.all(
      items.map(item => NarbutasStorage.getPage(item.id))
    );

    if (!pages) {
      const error: any = new Error(`Not found narbutas pages`);
      error.statusCode = 404;
      return next(error);
    }

    res.locals.pages = pages;

    const dcData = await dc.getData();

    return res.render("narbutas", dcData);
  } catch (e) {
    next(e);
  }
});

route.get("/narbutas/:id", async function(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const __ = res.locals.__;
  const message = req.query.message;

  if (message === QSMessage.INPUT_ERROR) {
    res.locals.alertMessage = __("contact_input_error");
  } else if (message === QSMessage.SUCCESS) {
    res.locals.alertMessage = __("contact_success");
  }

  const id = (req.params.id as string).toLowerCase();
  const dc: DataContainer = res.locals.dataContainer;
  let page: PageData;
  try {
    page = await NarbutasStorage.getPage(id);
  } catch (error) {
    logger.error(error);
  }
  if (!page) {
    const error: any = new Error(`Not found narbutas page ${id}`);
    error.statusCode = 404;
    return next(error);
  }

  try {
    res.locals.page = page;

    res.locals.currentPageLink = links.narbutas.page(page.id);
    res.locals.site.head.canonical = canonical(res.locals.currentPageLink);

    res.locals.site.head.title =
      __("narbutas") + ": " + (page.title || page.name);
    res.locals.site.head.description = page.title;

    let viewName: string;
    let parentMenuId: string;

    if (page.type === PageType.CATEGORY) {
      viewName = "narbutas-category";
      parentMenuId = page.parentId ? page.parentId : page.id;
      const items = NarbutasMenu.getItems(page.id);

      const pages = await Promise.all(
        items.map(item => NarbutasStorage.getPage(item.id))
      );

      if (!pages) {
        const error: any = new Error(`Not found narbutas pages ${id}`);
        error.statusCode = 404;
        return next(error);
      }

      res.locals.pages = pages;
    } else {
      viewName = "narbutas-page";

      const parentMenuItem = NarbutasMenu.getItem(page.parentId);
      parentMenuId = parentMenuItem.parentId || page.parentId;
    }

    if (parentMenuId) {
      const menuItem = res.locals.narbutasMenu.find(
        (item: any) => item.id === parentMenuId
      );
      if (menuItem) {
        menuItem.items = NarbutasMenu.getItems(parentMenuId).map(item => ({
          name: item.name,
          shortName: item.shortName,
          link: links.narbutas.page(item.id)
        }));
      }
    }

    const dcData = await dc.getData();

    return res.render(viewName, dcData);
  } catch (e) {
    next(e);
  }
});
