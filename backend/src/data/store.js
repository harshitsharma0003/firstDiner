'use strict';
const config = require('../config');
const { createMemoryStore } = require('./memoryStore');
const { createFirestoreStore } = require('./firestoreStore');

let store;
if (config.dataStore === 'firestore') {
  store = createFirestoreStore();
} else {
  store = createMemoryStore();
}

module.exports = store;
