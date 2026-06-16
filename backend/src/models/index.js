const { sequelize } = require('../config/db');
const College = require('./College');
const User = require('./User');
const Session = require('./Session');
const VerificationRequest = require('./VerificationRequest');
const Like = require('./Like');
const Confession = require('./Confession');
const Comment = require('./Comment');
const Rating = require('./Rating');
const Message = require('./Message');
const Event = require('./Event');
const Story = require('./Story');

// Define Relations

// College & User
User.belongsTo(College, { foreignKey: 'college_id', as: 'college' });
College.hasMany(User, { foreignKey: 'college_id' });

// Session & User
Session.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Session, { foreignKey: 'user_id', onDelete: 'CASCADE' });

// VerificationRequest & User/College
VerificationRequest.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(VerificationRequest, { foreignKey: 'user_id', onDelete: 'CASCADE' });

VerificationRequest.belongsTo(College, { foreignKey: 'college_id' });
College.hasMany(VerificationRequest, { foreignKey: 'college_id' });

// Like & User
Like.belongsTo(User, { foreignKey: 'from_user_id', as: 'sender' });
Like.belongsTo(User, { foreignKey: 'to_user_id', as: 'receiver' });
User.hasMany(Like, { foreignKey: 'from_user_id', as: 'sentLikes', onDelete: 'CASCADE' });
User.hasMany(Like, { foreignKey: 'to_user_id', as: 'receivedLikes', onDelete: 'CASCADE' });

// Confession & User/College
Confession.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Confession, { foreignKey: 'user_id', onDelete: 'CASCADE' });

Confession.belongsTo(College, { foreignKey: 'college_id', as: 'college' });
College.hasMany(Confession, { foreignKey: 'college_id' });

// Comment & Confession/User
Comment.belongsTo(Confession, { foreignKey: 'confession_id' });
Confession.hasMany(Comment, { foreignKey: 'confession_id', onDelete: 'CASCADE' });

Comment.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Comment, { foreignKey: 'user_id', onDelete: 'CASCADE' });

// Rating & User
Rating.belongsTo(User, { foreignKey: 'from_user_id', as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'to_user_id', as: 'ratee' });
User.hasMany(Rating, { foreignKey: 'from_user_id', as: 'givenRatings', onDelete: 'CASCADE' });
User.hasMany(Rating, { foreignKey: 'to_user_id', as: 'receivedRatings', onDelete: 'CASCADE' });

// Message & User
Message.belongsTo(User, { foreignKey: 'from_user_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'to_user_id', as: 'receiver' });
User.hasMany(Message, { foreignKey: 'from_user_id', as: 'sentMessages', onDelete: 'CASCADE' });
User.hasMany(Message, { foreignKey: 'to_user_id', as: 'receivedMessages', onDelete: 'CASCADE' });

// Event & User/College
Event.belongsTo(User, { foreignKey: 'host_user_id', as: 'host' });
User.hasMany(Event, { foreignKey: 'host_user_id', as: 'hostedEvents', onDelete: 'CASCADE' });

Event.belongsTo(College, { foreignKey: 'college_id', as: 'college' });
College.hasMany(Event, { foreignKey: 'college_id' });

// Story & User/College
Story.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Story, { foreignKey: 'user_id', onDelete: 'CASCADE' });

Story.belongsTo(College, { foreignKey: 'college_id' });
College.hasMany(Story, { foreignKey: 'college_id' });

module.exports = {
  sequelize,
  College,
  User,
  Session,
  VerificationRequest,
  Like,
  Confession,
  Comment,
  Rating,
  Message,
  Event,
  Story
};
