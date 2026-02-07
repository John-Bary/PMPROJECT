// Email Templates Utility
// Renders queued email templates from stored template name + data.
// This module re-uses the same template loading and rendering logic
// from emailService.js but is designed for the email queue processor.

const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', 'templates', 'email');
const templateCache = new Map();

const loadTemplate = (templateName) => {
  const templatePath = path.join(templatesDir, templateName);

  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath);
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  templateCache.set(templatePath, template);
  return template;
};

// HTML-escape user-supplied values to prevent XSS in emails
const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Keys that contain pre-built HTML and must NOT be escaped
const HTML_SAFE_KEYS = new Set(['taskRows', 'taskUrl', 'inviteUrl', 'priorityColor']);

const renderTemplate = (templateName, data = {}) => {
  let template = loadTemplate(templateName);

  template = template.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, key, block) => {
    return data[key] ? block : '';
  });

  template = template.replace(/{{(\w+)}}/g, (match, key) => {
    if (data[key] === undefined) return '';
    if (HTML_SAFE_KEYS.has(key)) return data[key];
    return escapeHtml(String(data[key]));
  });

  return template;
};

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Render a queued email from template name and data.
 * @param {string} templateName - Template file name (e.g., 'taskReminder.html')
 * @param {object} templateData - Template variables
 * @returns {{ html: string, text: string }}
 */
const renderQueuedEmail = (templateName, templateData) => {
  const data = typeof templateData === 'string' ? JSON.parse(templateData) : templateData;
  const html = renderTemplate(templateName, data);
  const text = stripHtml(html);
  return { html, text };
};

module.exports = {
  renderQueuedEmail,
};
