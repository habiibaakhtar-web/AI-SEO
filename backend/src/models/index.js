import { DataTypes } from 'sequelize';

const id = () => ({ type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true });
const ref = () => ({ type: DataTypes.UUID, allowNull: false });
const text = () => ({ type: DataTypes.TEXT, allowNull: false });
const score = () => ({ type: DataTypes.SMALLINT, allowNull: true, validate: { min: 0, max: 100 } });

export function defineModels(database) {
  const User = database.define('User', {
    id: id(), name: text(), email: { ...text(), unique: true },
    passwordHash: { ...text(), field: 'password_hash' },
  }, { tableName: 'users', defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: { attributes: ['id', 'name', 'email', 'passwordHash', 'createdAt', 'updatedAt'] } } });
  const Website = database.define('Website', {
    id: id(), userId: ref(), name: text(), url: text(),
    description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  }, { tableName: 'websites', indexes: [{ unique: true, fields: ['user_id', 'url'] }] });
  const Audit = database.define('Audit', {
    id: id(), websiteId: ref(), status: { type: DataTypes.STRING, defaultValue: 'queued', allowNull: false,
      validate: { isIn: [['queued', 'running', 'completed', 'failed', 'cancelled']] } },
    overallScore: score(), technicalScore: score(), onPageScore: score(), contentScore: score(),
    scoringVersion: { type: DataTypes.STRING, allowNull: true },
    coverage: { type: DataTypes.JSONB, defaultValue: {}, allowNull: false },
    errorCode: { type: DataTypes.STRING, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'audits' });
  const CrawledPage = database.define('CrawledPage', {
    id: id(), auditId: ref(), url: text(), httpStatus: { type: DataTypes.SMALLINT },
    evidence: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, { tableName: 'crawled_pages', indexes: [{ unique: true, fields: ['audit_id', 'url'] }] });
  const SeoIssue = database.define('SeoIssue', {
    id: id(), auditId: ref(), title: text(),
    category: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [['technical', 'on_page', 'content']] } },
    severity: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [['critical', 'high', 'medium', 'low']] } },
    description: text(), whyItMatters: text(), recommendation: text(), pageUrl: text(), checkId: text(),
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open',
      validate: { isIn: [['open', 'in_progress', 'resolved', 'ignored']] } },
    evidence: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, { tableName: 'seo_issues' });
  const Recommendation = database.define('Recommendation', {
    id: id(), auditId: ref(), issueId: ref(), recommendation: text(), reason: text(),
    priority: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [['critical', 'high', 'medium', 'low']] } },
    suggestedText: { type: DataTypes.TEXT, allowNull: true },
    source: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ai',
      validate: { isIn: [['ai', 'rule']] } },
  }, { tableName: 'recommendations' });
  User.hasMany(Website, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Website.belongsTo(User, { foreignKey: 'userId' });
  Website.hasMany(Audit, { foreignKey: 'websiteId', onDelete: 'CASCADE' });
  Audit.belongsTo(Website, { foreignKey: 'websiteId' });
  for (const model of [CrawledPage, SeoIssue, Recommendation]) {
    Audit.hasMany(model, { foreignKey: 'auditId', onDelete: 'CASCADE' });
    model.belongsTo(Audit, { foreignKey: 'auditId' });
  }
  SeoIssue.hasMany(Recommendation, { foreignKey: 'issueId', onDelete: 'CASCADE' });
  Recommendation.belongsTo(SeoIssue, { foreignKey: 'issueId' });
  return { User, Website, Audit, CrawledPage, SeoIssue, Recommendation };
}

