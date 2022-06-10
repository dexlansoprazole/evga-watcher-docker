import axios from 'axios';
import * as cheerio from 'cheerio';
import {LowSync, JSONFileSync} from 'lowdb';
import lodash from 'lodash';
import {logger, DATA_PATH} from './logger.js';

const isURL = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
const db = new LowSync(new JSONFileSync(`${DATA_PATH}/db.json`));
db.read();
db.data ||= {
  products: [],
};
var id = db.data.products.length;
db.write();

function sort_list() {
  id = 0;
  db.read();
  db.chain = lodash.chain(db.data);
  for (const product of db.data.products) {
    db.chain.get('products').find({id: product.id}).assign({...product, id: ++id}).value();
  }
  db.write();
}

export function list_products() {
  db.read();
  let res = db.data.products.map(p => `#${p.id}.\t${p.name}\n${p.url}`).join('\n\n');
  if (!res)
    return "The tracking list is empty."
  return res;
}

export async function add_product(url, user) {
  try {
    if (!url || !isURL.test(url)) throw Error('invalid url')
    const resp = await axios.get(url);
    const $ = cheerio.load(resp.data);
    let name = $('.product-name').eq(0).text();
    if (name.length) {
      db.read();
      db.chain = lodash.chain(db.data);
      let product = db.chain.get('products').find({url});
      if (product.value()) {
        if (!product.get('users').value().map(user => user.id).includes(user.id))
          product.get('users').push({id: user.id}).value();
        else
          throw new Error('duplicated url')
      }
      else
        db.data.products.push({id: ++id, name, url, users: [{id: user.id}]});
      db.write();
    }
    else
      throw new Error('invalid url')
  } catch (err) {
    throw Error(err);
  }
}

export async function del_product(id) {
  try {
    db.read();
    db.chain = lodash.chain(db.data);
    if (db.chain.get('products').find({id}).value())
      db.chain.get('products').remove({id}).value();
    else
      throw Error('product doesn\'t exist');
    db.write();
    sort_list()
    logger.debug(`product ${id} deleted`);
  } catch (err) {
    throw Error(err);
  }
}

export async function update_product(product, callback) {
  logger.info(`Updating product: ${product.id}`);
  try {
    let resp = await axios.get(product.url);
    const $ = cheerio.load(resp.data);
    const btnAddCart = $('.btnBigAddCart').eq(0);
    if (btnAddCart.length)
      return callback(product);
    return;
  } catch (err) {
    throw Error(err);
  }
}

export function update(callback) {
  logger.info(`Updating all products...`);
  db.read();
  for (const product of db.data.products)
    update_product(product, callback);
  logger.info(`Update compeleted`);
}

export function init(callback) {
  update(callback);
  setInterval(update, 60000, callback);
}