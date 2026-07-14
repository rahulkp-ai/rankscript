-- =============================================
--   RankScript — Comprehensive Seed Data
--   Run this SQL after containers are up
-- =============================================

-- Password for all accounts: 'password'
-- bcrypt hash: $2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O

-- =============================================
-- USERS: 1 Admin + 5 Mentors + 20 Students
-- =============================================

-- Admin user
INSERT INTO users (id, name, email, password_hash, role, state, district, country, is_active, is_verified, xp, rank_score)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Super Admin', 'admin@rankscript.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'admin', 'Kerala', 'Thiruvananthapuram', 'India', true, true, 0, 0)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 5 Mentor users (valid UUIDs with hex only)
INSERT INTO users (id, name, email, password_hash, role, state, district, country, is_active, is_verified, xp, rank_score)
VALUES 
  ('20000001-0000-0001-0000-000000000001', 'Dr. Rajesh Kumar', 'mentor.rajesh@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'mentor', 'Kerala', 'Thiruvananthapuram', 'India', true, true, 0, 0),
  ('20000001-0000-0001-0000-000000000002', 'Prof. Anjali Menon', 'mentor.anjali@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'mentor', 'Kerala', 'Ernakulam', 'India', true, true, 0, 0),
  ('20000001-0000-0001-0000-000000000003', 'Mr. Vineeth VS', 'mentor.vineeth@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'mentor', 'Karnataka', 'Bengaluru Urban', 'India', true, true, 0, 0),
  ('20000001-0000-0001-0000-000000000004', 'Ms. Divya S Nair', 'mentor.divya@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'mentor', 'Tamil Nadu', 'Chennai', 'India', true, true, 0, 0),
  ('20000001-0000-0001-0000-000000000005', 'Dr. Santhosh T', 'mentor.santhosh@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'mentor', 'Maharashtra', 'Mumbai', 'India', true, true, 0, 0)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 20 Student users
INSERT INTO users (id, name, email, password_hash, role, state, district, country, is_active, is_verified, xp, rank_score, streak_days)
VALUES 
  ('30000001-0000-0001-0000-000000000001', 'Akhil S', 'student.akhil@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Thiruvananthapuram', 'India', true, true, 1250, 92.5, 15),
  ('30000001-0000-0001-0000-000000000002', 'Sneha R', 'student.sneha@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Kollam', 'India', true, true, 980, 75.3, 8),
  ('30000001-0000-0001-0000-000000000003', 'Vishnu P', 'student.vishnu@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Ernakulam', 'India', true, true, 1100, 82.7, 12),
  ('30000001-0000-0001-0000-000000000004', 'Anu Maria Joseph', 'student.anu@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Kottayam', 'India', true, true, 850, 68.2, 5),
  ('30000001-0000-0001-0000-000000000005', 'Jithin K', 'student.jithin@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Thrissur', 'India', true, true, 920, 71.5, 6),
  ('30000001-0000-0001-0000-000000000006', 'Fathima T', 'student.fathima@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Malappuram', 'India', true, true, 1050, 79.8, 10),
  ('30000001-0000-0001-0000-000000000007', 'Arun M', 'student.arun@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Karnataka', 'Bengaluru Urban', 'India', true, true, 780, 62.4, 3),
  ('30000001-0000-0001-0000-000000000008', 'Lisa Ann Mathew', 'student.lisa@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Karnataka', 'Mysuru', 'India', true, true, 1150, 86.2, 14),
  ('30000001-0000-0001-0000-000000000009', 'Midhun R', 'student.midhun@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Tamil Nadu', 'Coimbatore', 'India', true, true, 890, 69.5, 7),
  ('30000001-0000-0001-0000-000000000010', 'Priya S', 'student.priya@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Tamil Nadu', 'Chennai', 'India', true, true, 1020, 77.9, 9),
  ('30000001-0000-0001-0000-000000000011', 'Nithin Raj', 'student.nithin@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Maharashtra', 'Mumbai', 'India', true, true, 720, 58.3, 2),
  ('30000001-0000-0001-0000-000000000012', 'Sohana Khan', 'student.sohana@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Maharashtra', 'Pune', 'India', true, true, 950, 73.6, 4),
  ('30000001-0000-0001-0000-000000000013', 'Abhishek Nair', 'student.abhishek@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Delhi', 'Central Delhi', 'India', true, true, 880, 67.1, 5),
  ('30000001-0000-0001-0000-000000000014', 'Kavya G', 'student.kavya@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Delhi', 'South Delhi', 'India', true, true, 1080, 81.4, 11),
  ('30000001-0000-0001-0000-000000000015', 'RAHUL KP KURUP', 'student@kurup.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Kerala', 'Thiruvananthapuram', 'India', true, true, 1500, 98.7, 30),
  ('30000001-0000-0001-0000-000000000016', 'UI Test - New User', 'ui.new@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Gujarat', 'Ahmedabad', 'India', true, true, 0, 0, 0),
  ('30000001-0000-0001-0000-000000000017', 'UI Test - Partial', 'ui.partial@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Rajasthan', 'Jaipur', 'India', true, true, 450, 35.2, 1),
  ('30000001-0000-0001-0000-000000000018', 'UI Test - Incomplete Quiz', 'ui.incomplete@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'West Bengal', 'Kolkata', 'India', true, true, 320, 28.5, 0),
  ('30000001-0000-0001-0000-000000000019', 'UI Test - Pending Grading', 'ui.pending@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Uttar Pradesh', 'Lucknow', 'India', true, true, 550, 42.1, 2),
  ('30000001-0000-0001-0000-000000000020', 'UI Test - High Achiever', 'ui.high@test.com', '$2b$12$zLkJj5zV.UV8omZSVuv5v.kOfgUgrjZIzsbs86OrnaMyysymgUZ1O', 'student', 'Telangana', 'Hyderabad', 'India', true, true, 1350, 95.2, 20)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

SELECT 'Users created: 1 admin + 5 mentors + 20 students' AS message;

-- =============================================
-- COURSES
-- =============================================

INSERT INTO courses (id, mentor_id, title, description, level, status, is_gated, total_lessons, total_enrolled)
VALUES 
  ('40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Complete Python Bootcamp', 'Master Python programming from basics to advanced.', 'beginner', 'approved', false, 5, 4),
  ('40000001-0000-0001-0000-000000000002', '20000001-0000-0001-0000-000000000001', 'Data Science with Python', 'Learn data analysis and machine learning.', 'advanced', 'approved', false, 6, 3),
  ('40000001-0000-0001-0000-000000000003', '20000001-0000-0001-0000-000000000001', 'Web Development with Django', 'Build full-stack web applications.', 'intermediate', 'approved', true, 5, 2),
  ('40000001-0000-0001-0000-000000000004', '20000001-0000-0001-0000-000000000002', 'JavaScript Fundamentals', 'Learn modern JavaScript.', 'beginner', 'approved', false, 7, 3),
  ('40000001-0000-0001-0000-000000000005', '20000001-0000-0001-0000-000000000002', 'React.js Complete Guide', 'Build modern single-page applications.', 'intermediate', 'approved', false, 8, 4),
  ('40000001-0000-0001-0000-000000000006', '20000001-0000-0001-0000-000000000002', 'Node.js Backend Development', 'Create scalable backend APIs.', 'intermediate', 'approved', false, 6, 2),
  ('40000001-0000-0001-0000-000000000007', '20000001-0000-0001-0000-000000000002', 'TypeScript Mastery', 'Type-safe JavaScript development.', 'intermediate', 'approved', false, 5, 1),
  ('40000001-0000-0001-0000-000000000008', '20000001-0000-0001-0000-000000000003', 'SQL & Database Design', 'Master relational databases.', 'beginner', 'approved', false, 6, 2),
  ('40000001-0000-0001-0000-000000000009', '20000001-0000-0001-0000-000000000003', 'PostgreSQL Advanced', 'Advanced PostgreSQL features.', 'advanced', 'approved', false, 5, 1),
  ('40000001-0000-0001-0000-000000000010', '20000001-0000-0001-0000-000000000004', 'Machine Learning Basics', 'Introduction to ML algorithms.', 'intermediate', 'approved', false, 8, 3),
  ('40000001-0000-0001-0000-000000000011', '20000001-0000-0001-0000-000000000004', 'Deep Learning with TensorFlow', 'Build neural networks.', 'advanced', 'approved', true, 6, 2),
  ('40000001-0000-0001-0000-000000000012', '20000001-0000-0001-0000-000000000004', 'Computer Vision Fundamentals', 'Image processing techniques.', 'advanced', 'approved', false, 5, 1),
  ('40000001-0000-0001-0000-000000000013', '20000001-0000-0001-0000-000000000005', 'DevOps Fundamentals', 'Learn CI/CD and Docker.', 'intermediate', 'approved', false, 7, 2),
  ('40000001-0000-0001-0000-000000000014', '20000001-0000-0001-0000-000000000005', 'Cloud Computing with AWS', 'Master AWS services.', 'intermediate', 'approved', false, 6, 1)
ON CONFLICT (id) DO NOTHING;

SELECT 'Courses created successfully' AS message;

-- =============================================
-- LESSONS
-- =============================================

INSERT INTO lessons (id, course_id, title, description, youtube_id, youtube_url, duration, "order", module)
VALUES 
  ('50000001-0000-0001-0000-000000000001', '40000001-0000-0001-0000-000000000001', 'Introduction to Python', 'Getting started with Python', 'hWWLlBoP7n8', 'https://www.youtube.com/watch?v=hWWLlBoP7n8', 720, 1, 'Module 1: Basics'),
  ('50000001-0000-0001-0000-000000000002', '40000001-0000-0001-0000-000000000001', 'Variables and Data Types', 'Understanding Python types', 'cQT46LJl-Nw', 'https://www.youtube.com/watch?v=cQT46LJl-Nw', 900, 2, 'Module 1: Basics'),
  ('50000001-0000-0001-0000-000000000003', '40000001-0000-0001-0000-000000000001', 'Control Flow - If/Else', 'Conditional statements', 'Zp5MuPOtsSY', 'https://www.youtube.com/watch?v=Zp5MuPOtsSY', 840, 3, 'Module 2: Control Flow'),
  ('50000001-0000-0001-0000-000000000004', '40000001-0000-0001-0000-000000000001', 'Loops in Python', 'For and while loops', 'On68T2k0v0I', 'https://www.youtube.com/watch?v=On68T2k0v0I', 780, 4, 'Module 2: Control Flow'),
  ('50000001-0000-0001-0000-000000000005', '40000001-0000-0001-0000-000000000001', 'Functions and Modules', 'Creating reusable code', 'O0lLhG7i4eM', 'https://www.youtube.com/watch?v=O0lLhG7i4eM', 960, 5, 'Module 3: Functions'),
  
  ('50000001-0000-0001-0000-000000000006', '40000001-0000-0001-0000-000000000002', 'Introduction to Data Science', 'Overview of data science', 'ua-CiD1jA6pg', 'https://www.youtube.com/watch?v=ua-CiD1jA6pg', 600, 1, 'Module 1'),
  ('50000001-0000-0001-0000-000000000007', '40000001-0000-0001-0000-000000000002', 'Python for Data Analysis', 'Using Pandas and NumPy', 'vV9A3U-Cqo4', 'https://www.youtube.com/watch?v=vV9A3U-Cqo4', 1200, 2, 'Module 2'),
  ('50000001-0000-0001-0000-000000000008', '40000001-0000-0001-0000-000000000002', 'Data Visualization', 'Creating charts with Matplotlib', 'cV7L28T6OC4', 'https://www.youtube.com/watch?v=cV7L28T6OC4', 900, 3, 'Module 3'),
  ('50000001-0000-0001-0000-000000000009', '40000001-0000-0001-0000-000000000002', 'Statistical Analysis', 'Basic statistics', 'FzP1z3PZ2PZ', 'https://www.youtube.com/watch?v=FzP1z3PZ2PZ', 720, 4, 'Module 4'),
  ('50000001-0000-0001-0000-000000000010', '40000001-0000-0001-0000-000000000002', 'Linear Regression', 'Simple linear regression', 'SjC_g_2v6Xw', 'https://www.youtube.com/watch?v=SjC_g_2v6Xw', 1080, 5, 'Module 5'),
  ('50000001-0000-0001-0000-000000000011', '40000001-0000-0001-0000-000000000002', 'Introduction to Scikit-learn', 'ML with scikit-learn', 'J5O0R0W1z8', 'https://www.youtube.com/watch?v=J5O0R0W1z8', 900, 6, 'Module 6'),

  ('50000001-0000-0001-0000-000000000012', '40000001-0000-0001-0000-000000000003', 'Django Installation & Setup', 'Setting up Django', 'F5pYT4z0x7k', 'https://www.youtube.com/watch?v=F5pYT4z0x7k', 600, 1, 'Module 1'),
  ('50000001-0000-0001-0000-000000000013', '40000001-0000-0001-0000-000000000003', 'Django Models & Database', 'Creating database models', 'ygz7Gz4k6G0', 'https://www.youtube.com/watch?v=ygz7Gz4k6G0', 1200, 2, 'Module 2'),
  ('50000001-0000-0001-0000-000000000014', '40000001-0000-0001-0000-000000000003', 'Django Views and URLs', 'Creating views and routing', 'K5fN9k_ny6E', 'https://www.youtube.com/watch?v=K5fN9k_ny6E', 840, 3, 'Module 3'),
  ('50000001-0000-0001-0000-000000000015', '40000001-0000-0001-0000-000000000003', 'Django Templates', 'Template language', 'f7D9X2pXh6Y', 'https://www.youtube.com/watch?v=f7D9X2pXh6Y', 720, 4, 'Module 4'),
  ('50000001-0000-0001-0000-000000000016', '40000001-0000-0001-0000-000000000003', 'User Authentication', 'Implementing login/register', 'k6x77T0k1s2', 'https://www.youtube.com/watch?v=k6x77T0k1s2', 900, 5, 'Module 5'),

  ('50000001-0000-0001-0000-000000000017', '40000001-0000-0001-0000-000000000004', 'JavaScript Introduction', 'What is JavaScript', 'W6NZf8xC4Jw', 'https://www.youtube.com/watch?v=W6NZf8xC4Jw', 600, 1, 'Module 1'),
  ('50000001-0000-0001-0000-000000000018', '40000001-0000-0001-0000-000000000004', 'Variables and Data Types', 'JS data types', '9emXNzqQygM', 'https://www.youtube.com/watch?v=9emXNzqQygM', 720, 2, 'Module 1'),
  ('50000001-0000-0001-0000-000000000019', '40000001-0000-0001-0000-000000000004', 'Functions and Arrow Functions', 'Creating and using functions', 'FOD408i0Jjs', 'https://www.youtube.com/watch?v=FOD408i0Jjs', 900, 3, 'Module 2'),
  ('50000001-0000-0001-0000-000000000020', '40000001-0000-0001-0000-000000000004', 'Arrays and Objects', 'Working with complex data', 'oigfa5aA9G4', 'https://www.youtube.com/watch?v=oigfa5aA9G4', 1080, 4, 'Module 3'),
  ('50000001-0000-0001-0000-000000000021', '40000001-0000-0001-0000-000000000004', 'DOM Manipulation', 'Interacting with HTML elements', '5fb2a14Gk2U', 'https://www.youtube.com/watch?v=5fb2a14Gk2U', 1200, 5, 'Module 4'),
  ('50000001-0000-0001-0000-000000000022', '40000001-0000-0001-0000-000000000004', 'Async JavaScript', 'Promises and async/await', 'PoJwK6xY0Uo', 'https://www.youtube.com/watch?v=PoJwK6xY0Uo', 960, 6, 'Module 5'),
  ('50000001-0000-0001-0000-000000000023', '40000001-0000-0001-0000-000000000004', 'ES6+ Features', 'Modern JavaScript features', 'NL5R1mqO4oY', 'https://www.youtube.com/watch?v=NL5R1mqO4oY', 840, 7, 'Module 6'),

  ('50000001-0000-0001-0000-000000000024', '40000001-0000-0001-0000-000000000005', 'React Introduction', 'Understanding React fundamentals', 'Ke90Tje7VS0', 'https://www.youtube.com/watch?v=Ke90Tje7VS0', 720, 1, 'Module 1'),
  ('50000001-0000-0001-0000-000000000025', '40000001-0000-0001-0000-000000000005', 'Components and Props', 'Building React components', 'W6NZf8xC4Jw', 'https://www.youtube.com/watch?v=W6NZf8xC4Jw', 900, 2, 'Module 2'),
  ('50000001-0000-0001-0000-000000000026', '40000001-0000-0001-0000-000000000005', 'State and useState', 'Managing component state', 'O6P5uw0xW5s', 'https://www.youtube.com/watch?v=O6P5uw0xW5s', 840, 3, 'Module 3'),
  ('50000001-0000-0001-0000-000000000027', '40000001-0000-0001-0000-000000000005', 'useEffect and Lifecycle', 'Side effects in React', '6B8kZqtY9fI', 'https://www.youtube.com/watch?v=6B8kZqtY9fI', 960, 4, 'Module 4'),
  ('50000001-0000-0001-0000-000000000028', '40000001-0000-0001-0000-000000000005', 'React Router', 'Navigation in React apps', '0WbVgL5Yd2w', 'https://www.youtube.com/watch?v=0WbVgL5Yd2w', 720, 5, 'Module 5'),
  ('50000001-0000-0001-0000-000000000029', '40000001-0000-0001-0000-000000000005', 'Context API', 'Global state management', 'Jg3C3j6C3Yo', 'https://www.youtube.com/watch?v=Jg3C3j6C3Yo', 780, 6, 'Module 6'),
  ('50000001-0000-0001-0000-000000000030', '40000001-0000-0001-0000-000000000005', 'Redux Basics', 'Introduction to Redux', 'poQ1p9lO6sc', 'https://www.youtube.com/watch?v=poQ1p9lO6sc', 1080, 7, 'Module 7'),
  ('50000001-0000-0001-0000-000000000031', '40000001-0000-0001-0000-000000000005', 'React Hooks Deep Dive', 'Custom hooks and advanced patterns', '1LBD6kVLaT8', 'https://www.youtube.com/watch?v=1LBD6kVLaT8', 900, 8, 'Module 8'),

  ('50000001-0000-0001-0000-000000000032', '40000001-0000-0001-0000-000000000006', 'Node.js Intro', 'Introduction to Node.js', 'Tl5U7b5P0R8', 'https://www.youtube.com/watch?v=Tl5U7b5P0R8', 600, 1, 'Intro'),
  ('50000001-0000-0001-0000-000000000033', '40000001-0000-0001-0000-000000000006', 'Express.js Setup', 'Creating Express server', 'S5z2a7W7r8Q', 'https://www.youtube.com/watch?v=S5z2a7W7r8Q', 720, 2, 'Express'),
  ('50000001-0000-0001-0000-000000000034', '40000001-0000-0001-0000-000000000006', 'REST API Design', 'Building RESTful APIs', 'pKd0Rpw7O8U', 'https://www.youtube.com/watch?v=pKd0Rpw7O8U', 900, 3, 'API'),
  ('50000001-0000-0001-0000-000000000035', '40000001-0000-0001-0000-000000000006', 'MongoDB Integration', 'Connecting to MongoDB', 'jx5T3T3w6B0', 'https://www.youtube.com/watch?v=jx5T3T3w6B0', 840, 4, 'Database'),
  ('50000001-0000-0001-0000-000000000036', '40000001-0000-0001-0000-000000000006', 'Authentication with JWT', 'Implementing JWT auth', 'm4Z8C2l8k1Y', 'https://www.youtube.com/watch?v=m4Z8C2l8k1Y', 960, 5, 'Auth'),
  ('50000001-0000-0001-0000-000000000037', '40000001-0000-0001-0000-000000000006', 'Deployment', 'Deploying Node apps', '7C2pq3R7l1M', 'https://www.youtube.com/watch?v=7C2pq3R7l1M', 600, 6, 'Deploy')
ON CONFLICT (id) DO NOTHING;

SELECT 'Lessons created successfully' AS message;

-- =============================================
-- QUIZZES
-- =============================================

INSERT INTO quizzes (id, course_id, mentor_id, title, description, time_limit, pass_score, max_attempts, is_active)
VALUES 
  ('60000001-0000-0001-0000-000000000001', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Python Basics Quiz', 'Test your understanding of Python fundamentals', 1800, 60, 3, true),
  ('60000001-0000-0001-0000-000000000002', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Data Types Quiz', 'Variables and data types', 1200, 60, 3, true),
  ('60000001-0000-0001-0000-000000000003', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Control Flow Quiz', 'If-else and loops', 1500, 60, 3, true),
  ('60000001-0000-0001-0000-000000000004', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Functions Quiz', 'Functions and modules', 1200, 60, 3, true),
  ('60000001-0000-0001-0000-000000000005', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Final Project Quiz', 'Comprehensive Python quiz', 1800, 70, 2, true),
  ('60000001-0000-0001-0000-000000000006', '40000001-0000-0001-0000-000000000002', '20000001-0000-0001-0000-000000000001', 'Data Science Intro Quiz', 'Introduction to data science', 1200, 60, 3, true),
  ('60000001-0000-0001-0000-000000000007', '40000001-0000-0001-0000-000000000002', '20000001-0000-0001-0000-000000000001', 'Pandas Quiz', 'Data analysis with Pandas', 1500, 60, 3, true),
  ('60000001-0000-0001-0000-000000000008', '40000001-0000-0001-0000-000000000003', '20000001-0000-0001-0000-000000000001', 'Django Setup Quiz', 'Django installation and setup', 1200, 60, 3, true),
  ('60000001-0000-0001-0000-000000000009', '40000001-0000-0001-0000-000000000004', '20000001-0000-0001-0000-000000000002', 'JS Basics Quiz', 'JavaScript fundamentals', 1200, 60, 3, true),
  ('60000001-0000-0001-0000-000000000010', '40000001-0000-0001-0000-000000000005', '20000001-0000-0001-0000-000000000002', 'React Basics Quiz', 'React fundamentals', 1200, 60, 3, true)
ON CONFLICT (id) DO NOTHING;

SELECT 'Quizzes created successfully' AS message;

-- =============================================
-- QUESTIONS
-- =============================================

INSERT INTO questions (id, quiz_id, text, option_a, option_b, option_c, option_d, correct_option, explanation, points, "order")
VALUES 
  ('70000001-0000-0001-0000-000000000001', '60000001-0000-0001-0000-000000000001', 'What is the correct way to create a variable in Python?', 'var x = 5', 'x = 5', 'int x = 5', 'let x = 5', 'b', 'In Python, you just use the variable name and assign a value', 1, 1),
  ('70000001-0000-0001-0000-000000000002', '60000001-0000-0001-0000-000000000001', 'Which function is used to print output in Python?', 'echo()', 'print()', 'console.log()', 'printf()', 'b', 'Python uses print() function for output', 1, 2),
  ('70000001-0000-0001-0000-000000000003', '60000001-0000-0001-0000-000000000001', 'What is the data type of 3.14?', 'int', 'float', 'str', 'bool', 'b', 'Numbers with decimals are floats in Python', 1, 3)
ON CONFLICT (id) DO NOTHING;

SELECT 'Questions created successfully' AS message;

-- =============================================
-- ASSIGNMENTS
-- =============================================

INSERT INTO assignments (id, course_id, mentor_id, title, description, instructions, max_score, passing_score, deadline, allow_late, is_active)
VALUES 
  ('80000001-0000-0001-0000-000000000001', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Python Basics Assignment', 'Complete basic Python exercises', 'Write a Python program to calculate factorial.', 100, 50, '2026-04-15 23:59:00', true, true),
  ('80000001-0000-0001-0000-000000000002', '40000001-0000-0001-0000-000000000001', '20000001-0000-0001-0000-000000000001', 'Data Structures Assignment', 'Implement data structures', 'Create a linked list class.', 100, 50, '2026-04-20 23:59:00', true, true),
  ('80000001-0000-0001-0000-000000000003', '40000001-0000-0001-0000-000000000002', '20000001-0000-0001-0000-000000000001', 'Data Analysis Project', 'Analyze a dataset', 'Use Pandas to analyze data.', 100, 50, '2026-04-18 23:59:00', true, true),
  ('80000001-0000-0001-0000-000000000004', '40000001-0000-0001-0000-000000000003', '20000001-0000-0001-0000-000000000001', 'Django Blog Project', 'Build a blog application', 'Create a Django blog.', 100, 50, '2026-04-22 23:59:00', true, true)
ON CONFLICT (id) DO NOTHING;

SELECT 'Assignments created successfully' AS message;

-- =============================================
-- ENROLLMENTS
-- =============================================

INSERT INTO enrollments (id, student_id, course_id, progress, lessons_done, is_approved, is_completed, enrolled_at)
VALUES 
  ('90000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000001', '40000001-0000-0001-0000-000000000001', 100.0, 5, true, true, '2026-01-15 10:00:00'),
  ('90000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000002', '40000001-0000-0001-0000-000000000001', 80.0, 4, true, false, '2026-01-20 14:30:00'),
  ('90000001-0000-0001-0000-000000000003', '30000001-0000-0001-0000-000000000003', '40000001-0000-0001-0000-000000000001', 60.0, 3, true, false, '2026-02-01 09:15:00'),
  ('90000001-0000-0001-0000-000000000004', '30000001-0000-0001-0000-000000000004', '40000001-0000-0001-0000-000000000001', 40.0, 2, true, false, '2026-02-10 16:45:00'),
  ('90000001-0000-0001-0000-000000000005', '30000001-0000-0001-0000-000000000001', '40000001-0000-0001-0000-000000000002', 100.0, 6, true, true, '2026-01-10 11:00:00'),
  ('90000001-0000-0001-0000-000000000006', '30000001-0000-0001-0000-000000000005', '40000001-0000-0001-0000-000000000002', 50.0, 3, true, false, '2026-02-05 13:20:00'),
  ('90000001-0000-0001-0000-000000000007', '30000001-0000-0001-0000-000000000007', '40000001-0000-0001-0000-000000000004', 85.7, 6, true, false, '2026-01-25 15:00:00'),
  ('90000001-0000-0001-0000-000000000008', '30000001-0000-0001-0000-000000000008', '40000001-0000-0001-0000-000000000004', 100.0, 7, true, true, '2026-01-05 12:00:00'),
  ('90000001-0000-0001-0000-000000000009', '30000001-0000-0001-0000-000000000010', '40000001-0000-0001-0000-000000000005', 75.0, 6, true, false, '2026-01-30 14:00:00'),
  ('90000001-0000-0001-0000-000000000010', '30000001-0000-0001-0000-000000000015', '40000001-0000-0001-0000-000000000001', 100.0, 5, true, true, '2026-01-02 08:00:00'),
  ('90000001-0000-0001-0000-000000000011', '30000001-0000-0001-0000-000000000020', '40000001-0000-0001-0000-000000000005', 100.0, 8, true, true, '2026-01-02 08:00:00'),
  ('90000001-0000-0001-0000-000000000012', '30000001-0000-0001-0000-000000000020', '40000001-0000-0001-0000-000000000001', 100.0, 5, true, true, '2026-01-08 10:00:00')
ON CONFLICT (id) DO NOTHING;

SELECT 'Enrollments created successfully' AS message;

-- =============================================
-- QUIZ ATTEMPTS
-- =============================================

INSERT INTO quiz_attempts (id, quiz_id, student_id, answers, score, total_points, earned_points, passed, time_taken, started_at, submitted_at)
VALUES 
  ('a0000001-0000-0001-0000-000000000001', '60000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000015', '{"q1":"b","q2":"b","q3":"b"}', 100.0, 3, 3, true, 540, '2026-02-01 10:00:00', '2026-02-01 10:09:00'),
  ('a0000001-0000-0001-0000-000000000002', '60000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000015', '{"q4":"a","q5":"c"}', 100.0, 2, 2, true, 480, '2026-02-05 14:00:00', '2026-02-05 14:08:00'),
  ('a0000001-0000-0001-0000-000000000003', '60000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000001', '{"q1":"b","q2":"b","q3":"a"}', 66.6, 3, 2, true, 600, '2026-02-02 11:00:00', '2026-02-02 11:10:00'),
  ('a0000001-0000-0001-0000-000000000004', '60000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000001', '{"q4":"a","q5":"c"}', 100.0, 2, 2, true, 420, '2026-02-06 15:00:00', '2026-02-06 15:07:00'),
  ('a0000001-0000-0001-0000-000000000005', '60000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000002', '{"q1":"a","q2":"b","q3":"b"}', 33.3, 3, 1, false, 720, '2026-02-03 09:00:00', '2026-02-03 09:12:00'),
  ('a0000001-0000-0001-0000-000000000006', '60000001-0000-0001-0000-000000000004', '30000001-0000-0001-0000-000000000008', '{"q1":"b","q2":"b","q3":"b"}', 100.0, 3, 3, true, 480, '2026-02-01 16:00:00', '2026-02-01 16:08:00'),
  ('a0000001-0000-0001-0000-000000000007', '60000001-0000-0001-0000-000000000010', '30000001-0000-0001-0000-000000000020', '{"q1":"b","q2":"b","q3":"b"}', 100.0, 3, 3, true, 900, '2026-02-15 10:00:00', '2026-02-15 10:15:00')
ON CONFLICT (id) DO NOTHING;

SELECT 'Quiz attempts created successfully' AS message;

-- =============================================
-- SUBMISSIONS
-- =============================================

INSERT INTO submissions (id, assignment_id, student_id, content, score, feedback, is_graded, is_late, late_days, submitted_at, graded_at)
VALUES 
  ('b0000001-0000-0001-0000-000000000001', '80000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000015', 'Here is my factorial implementation...', 95.0, 'Excellent work!', true, false, 0, '2026-04-10 20:30:00', '2026-04-11 14:00:00'),
  ('b0000001-0000-0001-0000-000000000002', '80000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000001', 'My factorial implementation...', 88.0, 'Good solution.', true, false, 0, '2026-04-12 18:00:00', '2026-04-13 10:00:00'),
  ('b0000001-0000-0001-0000-000000000003', '80000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000002', 'Factorial using recursion...', 72.0, 'Works but could be optimized.', true, false, 0, '2026-04-13 22:00:00', '2026-04-14 09:00:00'),
  ('b0000001-0000-0001-0000-000000000004', '80000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000003', 'Factorial code...', 65.0, 'Acceptable.', true, true, 1, '2026-04-16 23:30:00', '2026-04-17 11:00:00'),
  ('b0000001-0000-0001-0000-000000000005', '80000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000019', 'Linked list implementation...', NULL, NULL, false, false, 0, '2026-03-20 15:00:00', NULL),
  ('b0000001-0000-0001-0000-000000000006', '80000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000015', 'LinkedList class implementation...', 98.0, 'Perfect implementation!', true, false, 0, '2026-04-18 19:00:00', '2026-04-19 15:00:00'),
  ('b0000001-0000-0001-0000-000000000007', '80000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000008', 'My LinkedList implementation...', 90.0, 'Very good implementation.', true, false, 0, '2026-04-17 21:00:00', '2026-04-18 10:00:00'),
  ('b0000001-0000-0001-0000-000000000008', '80000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000020', 'Complete linked list implementation...', 92.0, 'Excellent work!', true, false, 0, '2026-04-19 14:00:00', '2026-04-20 09:00:00')
ON CONFLICT (id) DO NOTHING;

SELECT 'Submissions created successfully' AS message;

-- =============================================
-- RANK ENTRIES
-- =============================================

INSERT INTO rank_entries (id, user_id, quiz_score, assignment_score, exam_score, completion_score, streak_score, rank_score, xp, streak_days, last_active, country, state, district)
VALUES 
  ('c0000001-0000-0001-0000-000000000015', '30000001-0000-0001-0000-000000000015', 100.0, 96.0, 95.0, 100.0, 100.0, 98.7, 1500, 30, '2026-03-25 10:00:00', 'India', 'Kerala', 'Thiruvananthapuram'),
  ('c0000001-0000-0001-0000-000000000001', '30000001-0000-0001-0000-000000000001', 83.3, 88.0, 0, 100.0, 50.0, 92.5, 1250, 15, '2026-03-24 14:00:00', 'India', 'Kerala', 'Thiruvananthapuram'),
  ('c0000001-0000-0001-0000-000000000008', '30000001-0000-0001-0000-000000000008', 100.0, 90.0, 0, 100.0, 46.6, 86.2, 1150, 14, '2026-03-23 18:00:00', 'India', 'Karnataka', 'Mysuru'),
  ('c0000001-0000-0001-0000-000000000003', '30000001-0000-0001-0000-000000000003', 66.6, 65.0, 0, 60.0, 40.0, 82.7, 1100, 12, '2026-03-22 12:00:00', 'India', 'Kerala', 'Ernakulam'),
  ('c0000001-0000-0001-0000-000000000014', '30000001-0000-0001-0000-000000000014', 80.0, 75.0, 0, 85.0, 36.6, 81.4, 1080, 11, '2026-03-21 16:00:00', 'India', 'Delhi', 'South Delhi'),
  ('c0000001-0000-0001-0000-000000000006', '30000001-0000-0001-0000-000000000006', 75.0, 70.0, 0, 75.0, 33.3, 79.8, 1050, 10, '2026-03-20 10:00:00', 'India', 'Kerala', 'Malappuram'),
  ('c0000001-0000-0001-0000-000000000010', '30000001-0000-0001-0000-000000000010', 70.0, 65.0, 0, 62.5, 30.0, 77.9, 1020, 9, '2026-03-19 14:00:00', 'India', 'Tamil Nadu', 'Chennai'),
  ('c0000001-0000-0001-0000-000000000002', '30000001-0000-0001-0000-000000000002', 33.3, 72.0, 0, 80.0, 26.6, 75.3, 980, 8, '2026-03-18 12:00:00', 'India', 'Kerala', 'Kollam'),
  ('c0000001-0000-0001-0000-000000000012', '30000001-0000-0001-0000-000000000012', 85.0, 80.0, 0, 62.5, 13.3, 73.6, 950, 4, '2026-03-15 16:00:00', 'India', 'Maharashtra', 'Pune'),
  ('c0000001-0000-0001-0000-000000000005', '30000001-0000-0001-0000-000000000005', 50.0, 55.0, 0, 50.0, 20.0, 71.5, 920, 6, '2026-03-17 10:00:00', 'India', 'Kerala', 'Thrissur'),
  ('c0000001-0000-0001-0000-000000000004', '30000001-0000-0001-0000-000000000004', 60.0, 60.0, 0, 40.0, 16.6, 68.2, 850, 5, '2026-03-16 14:00:00', 'India', 'Kerala', 'Kottayam'),
  ('c0000001-0000-0001-0000-000000000009', '30000001-0000-0001-0000-000000000009', 50.0, 50.0, 0, 42.8, 23.3, 69.5, 890, 7, '2026-03-18 08:00:00', 'India', 'Tamil Nadu', 'Coimbatore'),
  ('c0000001-0000-0001-0000-000000000013', '30000001-0000-0001-0000-000000000013', 45.0, 48.0, 0, 57.1, 16.6, 67.1, 880, 5, '2026-03-17 12:00:00', 'India', 'Delhi', 'Central Delhi'),
  ('c0000001-0000-0001-0000-000000000007', '30000001-0000-0001-0000-000000000007', 40.0, 45.0, 0, 85.7, 10.0, 62.4, 780, 3, '2026-03-14 18:00:00', 'India', 'Karnataka', 'Bengaluru Urban'),
  ('c0000001-0000-0001-0000-000000000011', '30000001-0000-0001-0000-000000000011', 35.0, 40.0, 0, 25.0, 6.6, 58.3, 720, 2, '2026-03-12 10:00:00', 'India', 'Maharashtra', 'Mumbai'),
  ('c0000001-0000-0001-0000-000000000016', '30000001-0000-0001-0000-000000000016', 0.0, 0.0, 0, 0.0, 0.0, 0.0, 0, 0, NULL, 'India', 'Gujarat', 'Ahmedabad'),
  ('c0000001-0000-0001-0000-000000000017', '30000001-0000-0001-0000-000000000017', 50.0, 0.0, 0, 20.0, 3.3, 35.2, 450, 1, '2026-03-10 14:00:00', 'India', 'Rajasthan', 'Jaipur'),
  ('c0000001-0000-0001-0000-000000000018', '30000001-0000-0001-0000-000000000018', 10.0, 0.0, 0, 10.0, 0.0, 28.5, 320, 0, '2026-03-08 12:00:00', 'India', 'West Bengal', 'Kolkata'),
  ('c0000001-0000-0001-0000-000000000019', '30000001-0000-0001-0000-000000000019', 0.0, 0.0, 0, 57.1, 6.6, 42.1, 550, 2, '2026-03-15 16:00:00', 'India', 'Uttar Pradesh', 'Lucknow'),
  ('c0000001-0000-0001-0000-000000000020', '30000001-0000-0001-0000-000000000020', 100.0, 92.0, 0, 100.0, 66.6, 95.2, 1350, 20, '2026-03-25 08:00:00', 'India', 'Telangana', 'Hyderabad')
ON CONFLICT (id) DO NOTHING;

SELECT '✅ RankScript seed data created successfully!' AS message;
SELECT 'Summary: 1 admin, 5 mentors, 20 students, 14 courses, 37 lessons, 10 quizzes, 4 assignments' AS summary;