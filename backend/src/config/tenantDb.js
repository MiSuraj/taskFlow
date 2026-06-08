const mongoose = require('mongoose');

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ProjectDoc = require('../models/ProjectDoc');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');

const tenantConnections = new Map();

const schemas = {
  User: User.schema,
  Project: Project.schema,
  Task: Task.schema,
  ProjectDoc: ProjectDoc.schema,
  ChatRoom: ChatRoom.schema,
  ChatMessage: ChatMessage.schema,
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeDbName(slug) {
  return `taskmanager_tenant_${slug.replace(/[^a-z0-9_]/g, '_')}`;
}

function getBaseMongoUri() {
  if (process.env.MONGO_BASE_URI) return process.env.MONGO_BASE_URI.replace(/\/$/, '');
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  const marker = '/';
  const queryIndex = uri.indexOf('?');
  const withoutQuery = queryIndex >= 0 ? uri.slice(0, queryIndex) : uri;
  const query = queryIndex >= 0 ? uri.slice(queryIndex) : '';
  const lastSlash = withoutQuery.lastIndexOf(marker);
  if (lastSlash <= 'mongodb://'.length) return withoutQuery + query;
  return withoutQuery.slice(0, lastSlash) + query;
}

function uriForDb(dbName) {
  const base = getBaseMongoUri();
  const queryIndex = base.indexOf('?');
  if (queryIndex >= 0) return `${base.slice(0, queryIndex)}/${dbName}${base.slice(queryIndex)}`;
  return `${base}/${dbName}`;
}

function getTenantConnection(dbName) {
  if (!dbName) throw new Error('Tenant database name is required');
  if (tenantConnections.has(dbName)) return tenantConnections.get(dbName);

  const conn = mongoose.createConnection(uriForDb(dbName));
  tenantConnections.set(dbName, conn);
  return conn;
}

function getTenantModels(dbName) {
  const conn = getTenantConnection(dbName);
  return Object.entries(schemas).reduce((models, [name, schema]) => {
    models[name] = conn.models[name] || conn.model(name, schema);
    return models;
  }, {});
}

module.exports = {
  getTenantConnection,
  getTenantModels,
  makeDbName,
  slugify,
};
