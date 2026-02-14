import Knex from 'knex';
import config from '../knexfile.js';

const db = Knex.default(config);
export default db;
