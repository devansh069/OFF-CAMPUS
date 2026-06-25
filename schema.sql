USE `off_campus_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `comments`, `confessions`, `event_attendees`, `events`, `likes`, `messages`, `ratings`, `stories`, `user_sessions`, `verification_requests`, `colleges`, `users`, `college_master`;
SET FOREIGN_KEY_CHECKS = 1;





-- 1. Create Tables

CREATE TABLE IF NOT EXISTS `college_master` (
  `college_id` varchar(255) PRIMARY KEY,
  `college_name` varchar(255) UNIQUE,
  `short_name` varchar(255) UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` varchar(255) PRIMARY KEY,
  `phone_number` varchar(255) UNIQUE,
  `firebase_uid` varchar(255) UNIQUE,
  `email` varchar(255) UNIQUE,
  `name` varchar(255),
  `age` int,
  `height` int,
  `gender` ENUM('male', 'female', 'other'),
  `looking_for` ENUM('dating', 'friends', 'networking', 'all'),
  `location` varchar(255),
  `latitude` double,
  `longitude` double,
  `religion` varchar(255),
  `drink` varchar(50) DEFAULT 'no',
  `smoke` varchar(50) DEFAULT 'no',
  `weed` varchar(50) DEFAULT 'no',
  `bio` text,
  `interests` json,
  `college_name` varchar(255),
  `college_id` varchar(255),
  `year` varchar(255),
  `course` varchar(255),
  `prompts` json,
  `photos` json,
  `picture` text,
  `verification_status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `vibe_score` float NOT NULL DEFAULT 5,
  `spotify_data` json,
  `is_premium` tinyint(1) NOT NULL DEFAULT 0,
  `is_on_campus` tinyint(1) NOT NULL DEFAULT 0,
  `last_location_update` datetime,
  `total_ratings` int NOT NULL DEFAULT 0,
  `rating_sum` float NOT NULL DEFAULT 0,
  `referral_code` varchar(255),
  `referred_by` varchar(255),
  `referral_count` int NOT NULL DEFAULT 0,
  `premium_until` datetime,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_college_name` (`college_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `colleges` (
  `user_id` varchar(255),
  `college_id` varchar(255) PRIMARY KEY,
  `college_name` varchar(255) NOT NULL,
  `short_name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `email_domains` json NOT NULL,
  `type` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL DEFAULT 'Delhi',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_colleges_user_id` (`user_id`),
  INDEX `idx_colleges_college_name` (`college_name`),
  INDEX `idx_colleges_short_name` (`short_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `confessions` (
  `confession_id` varchar(255) PRIMARY KEY,
  `user_id` varchar(255) NOT NULL,
  `college_id` varchar(255),
  `content` text NOT NULL,
  `likes` int NOT NULL DEFAULT 0,
  `comments` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_confessions_user_id` (`user_id`),
  INDEX `idx_confessions_college_id` (`college_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `comments` (
  `comment_id` varchar(255) PRIMARY KEY,
  `confession_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_comments_confession_id` (`confession_id`),
  INDEX `idx_comments_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `events` (
  `event_id` varchar(255) PRIMARY KEY,
  `title` varchar(255) NOT NULL,
  `host_name` varchar(255) NOT NULL,
  `host_user_id` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'fest',
  `date` varchar(255) NOT NULL,
  `attendee_count` int NOT NULL DEFAULT 0,
  `location` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `cover_image` text,
  `college_id` varchar(255),
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `gallery_photos` JSON DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_events_college_id` (`college_id`),
  INDEX `idx_events_host_user_id` (`host_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `event_attendees` (
  `event_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`, `user_id`),
  CONSTRAINT `fk_attendees_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attendees_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `likes` (
  `like_id` varchar(255) PRIMARY KEY,
  `from_user_id` varchar(255) NOT NULL,
  `to_user_id` varchar(255) NOT NULL,
  `is_match` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `likes_from_user_id_to_user_id` (`from_user_id`, `to_user_id`),
  INDEX `idx_likes_to_user_id` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` varchar(255) PRIMARY KEY,
  `from_user_id` varchar(255) NOT NULL,
  `to_user_id` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_messages_from_user_id` (`from_user_id`),
  INDEX `idx_messages_to_user_id` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ratings` (
  `rating_id` varchar(255) PRIMARY KEY,
  `from_user_id` varchar(255) NOT NULL,
  `to_user_id` varchar(255) NOT NULL,
  `score` float NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `ratings_from_user_id_to_user_id` (`from_user_id`, `to_user_id`),
  INDEX `idx_ratings_to_user_id` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stories` (
  `story_id` varchar(255) PRIMARY KEY,
  `user_id` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_picture` text,
  `college_id` varchar(255),
  `image` text NOT NULL,
  `caption` varchar(255),
  `audience` varchar(255) NOT NULL DEFAULT 'college',
  `views` json NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_stories_user_id` (`user_id`),
  INDEX `idx_stories_college_id` (`college_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_token` varchar(255) PRIMARY KEY,
  `user_id` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_sessions_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `verification_requests` (
  `request_id` varchar(255) PRIMARY KEY,
  `user_id` varchar(255) NOT NULL,
  `college_id` varchar(255) NOT NULL,
  `id_card_image` text NOT NULL,
  `status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `reviewed_at` datetime,
  `reviewed_by` varchar(255),
  `submitted_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_verification_requests_user_id` (`user_id`),
  INDEX `idx_verification_requests_college_id` (`college_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 2. Add Foreign Key Constraints

ALTER TABLE `colleges` 
  ADD CONSTRAINT `fk_colleges_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_colleges_master_id` FOREIGN KEY (`college_id`) REFERENCES `college_master` (`college_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_colleges_master_name` FOREIGN KEY (`college_name`) REFERENCES `college_master` (`college_name`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_colleges_master_short` FOREIGN KEY (`short_name`) REFERENCES `college_master` (`short_name`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `comments` 
  ADD CONSTRAINT `comments_ibfk_35` FOREIGN KEY (`confession_id`) REFERENCES `confessions` (`confession_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `comments_ibfk_36` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `confessions` 
  ADD CONSTRAINT `confessions_ibfk_35` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `confessions_ibfk_36` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `events` 
  ADD CONSTRAINT `events_ibfk_35` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `events_ibfk_36` FOREIGN KEY (`host_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `likes` 
  ADD CONSTRAINT `likes_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `likes_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `messages` 
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ratings` 
  ADD CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stories` 
  ADD CONSTRAINT `stories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `stories_ibfk_2` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `user_sessions` 
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `verification_requests` 
  ADD CONSTRAINT `verification_requests_ibfk_35` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `verification_requests_ibfk_36` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `users` 
  ADD CONSTRAINT `fk_users_college_name` FOREIGN KEY (`college_name`) REFERENCES `colleges` (`college_name`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_users_college_id` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`college_id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- 3. Seed Master College List

INSERT INTO `college_master` (`college_id`, `college_name`, `short_name`) VALUES
('col_stephens', 'St. Stephen\'s College', 'SSC'),
('col_hindu', 'Hindu College', 'HC'),
('col_dtu', 'Delhi Technological University', 'DTU'),
('col_nsut', 'Netaji Subhas University of Technology', 'NSUT'),
('col_iitd', 'Indian Institute of Technology Delhi', 'IITD')
ON DUPLICATE KEY UPDATE `college_name` = VALUES(`college_name`), `short_name` = VALUES(`short_name`);
















