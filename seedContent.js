const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BlogPost = require('./models/BlogPost');
const GalleryItem = require('./models/GalleryItem');

dotenv.config();

const blogPosts = [
    {
        type: "upcoming-event",
        department: "Zion School",
        title: "Annual Science Fair 2026",
        description: "Join us for our biggest science fair yet! Students from all departments will showcase their innovative projects. Prizes for top 3 projects in each category.",
        shortDescription: "Annual Science Fair with prizes and exhibitions",
        timestamp: new Date("2026-01-06T10:00:00"),
        image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "Front End Web Development",
        title: "Building Responsive Layouts with CSS Grid",
        description: "Our students are currently mastering CSS Grid layout system. This week's focus is on creating complex responsive designs that adapt seamlessly across all device sizes.",
        shortDescription: "Learning CSS Grid for responsive designs",
        timestamp: new Date("2026-01-05T14:30:00"),
        image: "https://images.unsplash.com/photo-1517134191118-9d595e4c8c2b?w=400&h=300&fit=crop"
    },
    {
        type: "upcoming-event",
        department: "Data Analysis",
        title: "Data Analytics Hackathon 2026",
        description: "48-hour data analytics hackathon starting February 15th. Teams will analyze real-world datasets and present actionable insights. Sponsored by leading tech companies.",
        shortDescription: "48-hour data hackathon with real datasets",
        timestamp: new Date("2026-01-04T09:00:00"),
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "Back End Web Development",
        title: "Microservices Architecture Deep Dive",
        description: "Students are learning to design and implement microservices using Node.js and Docker. Current project involves building a scalable e-commerce backend with separate services for authentication, products, and orders.",
        shortDescription: "Building microservices with Node.js",
        timestamp: new Date("2026-01-04T16:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Zion School",
        title: "Mid-Term Break - February 2026",
        description: "School will be closed for mid-term break from February 10-14. Classes resume on February 17th. Have a restful break everyone!",
        shortDescription: "Mid-term break announcement",
        timestamp: new Date("2026-01-03T08:00:00"),
        image: null
    },
    {
        type: "ongoing-activity",
        department: "WAEC Class",
        title: "Mathematics Past Questions Marathon",
        description: "Intensive review of WAEC mathematics past questions from 2015-2025. Students solving 20 questions daily with detailed explanations and common pitfall discussions.",
        shortDescription: "WAEC math past questions review",
        timestamp: new Date("2026-01-03T10:30:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "French Department",
        title: "French Cultural Day Celebration",
        description: "Experience French culture through music, food, and art! Join us on January 25th for a day of French cuisine tasting, traditional music performances, and art exhibitions.",
        shortDescription: "French culture celebration event",
        timestamp: new Date("2026-01-02T13:00:00"),
        image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "JAMB Class",
        title: "Use of English: Comprehension Strategies",
        description: "Focusing on advanced comprehension techniques for JAMB Use of English. Students learning to identify main ideas, infer meanings, and tackle vocabulary in context questions.",
        shortDescription: "JAMB English comprehension strategies",
        timestamp: new Date("2026-01-02T15:45:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Zion School",
        title: "Inter-School Debate Competition",
        description: "Zion School hosts the Regional Inter-School Debate Competition on February 5th. 15 schools competing. Topic: 'Technology is doing more harm than good to modern education.'",
        shortDescription: "Regional debate competition",
        timestamp: new Date("2026-01-01T11:00:00"),
        image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "IELTS",
        title: "Academic Writing Task 2 Workshop",
        description: "Intensive workshop on IELTS Academic Writing Task 2 essays. Students practicing opinion, discussion, problem-solution, and two-part question essay types with timed writing sessions.",
        shortDescription: "IELTS Writing Task 2 workshop",
        timestamp: new Date("2025-12-31T14:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Data Analysis",
        title: "Guest Speaker: Senior Data Scientist from Google",
        description: "Don't miss this opportunity! A Senior Data Scientist from Google will discuss career paths in data science and share insights on industry trends. Q&A session included.",
        shortDescription: "Google data scientist talk",
        timestamp: new Date("2025-12-30T10:00:00"),
        image: "https://images.unsplash.com/photo-1560439514-4e9645039924?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "SAT Classes",
        title: "SAT Math: Advanced Algebra Problems",
        description: "Tackling the most challenging algebra problems from official SAT practice tests. Focus on systems of equations, quadratic functions, and exponential growth problems.",
        shortDescription: "SAT advanced algebra practice",
        timestamp: new Date("2025-12-30T09:30:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Zion School",
        title: "Educational Excursion to National Museum",
        description: "All students grades 7-12 invited for educational excursion to National Museum on January 30th. Transportation provided. Exploring Nigerian history and cultural heritage.",
        shortDescription: "Museum excursion trip",
        timestamp: new Date("2025-12-29T08:00:00"),
        image: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "NECO Class",
        title: "Chemistry Practical Preparation",
        description: "Hands-on chemistry practical sessions preparing for NECO exams. Students conducting experiments on titration, qualitative analysis, and organic chemistry reactions.",
        shortDescription: "NECO chemistry practicals",
        timestamp: new Date("2025-12-28T13:30:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Front End Web Development",
        title: "React.js Project Showcase Day",
        description: "Students will present their capstone React projects on February 1st. Projects range from e-commerce sites to social media dashboards. Industry professionals invited as judges.",
        shortDescription: "React project presentations",
        timestamp: new Date("2025-12-28T16:00:00"),
        image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "French Department",
        title: "Conversational French Practice Sessions",
        description: "Daily 30-minute conversation practice focusing on real-life scenarios. This week's theme: ordering at restaurants, shopping, and asking for directions in French.",
        shortDescription: "French conversation practice",
        timestamp: new Date("2025-12-27T11:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Back End Web Development",
        title: "API Security Workshop",
        description: "Special workshop on securing REST APIs. Topics include JWT authentication, rate limiting, SQL injection prevention, and best practices for handling sensitive data.",
        shortDescription: "API security workshop",
        timestamp: new Date("2025-12-27T14:00:00"),
        image: null
    },
    {
        type: "ongoing-activity",
        department: "WAEC Class",
        title: "English Literature: Unseen Poetry Analysis",
        description: "Students developing skills in analyzing unseen poetry for WAEC English Literature. Focus on identifying literary devices, themes, and articulating personal responses.",
        shortDescription: "Poetry analysis for WAEC",
        timestamp: new Date("2025-12-26T10:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Zion School",
        title: "Career Day 2026",
        description: "Annual Career Day on March 3rd! Professionals from various fields including medicine, engineering, law, tech, and arts will share their experiences and answer questions.",
        shortDescription: "Career exploration day",
        timestamp: new Date("2025-12-26T09:00:00"),
        image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "JAMB Class",
        title: "Physics: Mechanics Problem-Solving",
        description: "Intensive focus on JAMB physics mechanics questions. Students working through problems on motion, force, work, energy, and power with emphasis on calculation accuracy.",
        shortDescription: "JAMB physics mechanics",
        timestamp: new Date("2025-12-25T15:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Data Analysis",
        title: "Python for Data Science Bootcamp",
        description: "3-day intensive bootcamp starting January 20th. Learn pandas, NumPy, matplotlib, and scikit-learn. Build 3 complete data analysis projects. Limited spots available!",
        shortDescription: "Python data science bootcamp",
        timestamp: new Date("2025-12-24T12:00:00"),
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "IELTS",
        title: "Speaking Test Mock Examinations",
        description: "Full-length IELTS speaking mock tests with certified examiners. Students receiving detailed feedback on fluency, vocabulary, grammar, and pronunciation.",
        shortDescription: "IELTS speaking mock tests",
        timestamp: new Date("2025-12-24T10:30:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "SAT Classes",
        title: "SAT Full-Length Practice Test Day",
        description: "Simulated SAT exam under real test conditions on January 18th. 3 hours for reading and writing, 70 minutes for math. Results and analysis provided within 48 hours.",
        shortDescription: "SAT practice test",
        timestamp: new Date("2025-12-23T08:00:00"),
        image: null
    },
    {
        type: "ongoing-activity",
        department: "Front End Web Development",
        title: "JavaScript ES6+ Features Masterclass",
        description: "Exploring modern JavaScript features including destructuring, spread operators, arrow functions, promises, async/await, and modules. Building practical examples for each concept.",
        shortDescription: "Modern JavaScript features",
        timestamp: new Date("2025-12-23T13:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "French Department",
        title: "DELF Certification Exam Preparation",
        description: "Preparation course for DELF B1 and B2 certification exams starting February 1st. Course covers all four skills: listening, reading, writing, and speaking.",
        shortDescription: "DELF exam preparation",
        timestamp: new Date("2025-12-22T11:00:00"),
        image: null
    },
    {
        type: "ongoing-activity",
        department: "NECO Class",
        title: "Biology: Human Body Systems Review",
        description: "Comprehensive review of human body systems for NECO Biology. Current focus on circulatory, respiratory, and digestive systems with diagrams and practice questions.",
        shortDescription: "Biology body systems review",
        timestamp: new Date("2025-12-22T14:00:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Zion School",
        title: "Sports Day Competition",
        description: "Annual Sports Day on February 20th! Track and field events, team sports, and fun games. All students participate. Parents and guardians invited to cheer!",
        shortDescription: "Annual sports day",
        timestamp: new Date("2025-12-21T10:00:00"),
        image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop"
    },
    {
        type: "ongoing-activity",
        department: "Back End Web Development",
        title: "Database Design and Optimization",
        description: "Learning advanced database concepts including normalization, indexing, query optimization, and database schema design. Working with PostgreSQL and MongoDB.",
        shortDescription: "Database design and optimization",
        timestamp: new Date("2025-12-21T15:30:00"),
        image: null
    },
    {
        type: "upcoming-event",
        department: "Data Analysis",
        title: "Tableau Visualization Competition",
        description: "Create the most insightful data visualization using Tableau! Competition on February 8th. Prize: Professional Tableau license for 1 year. Dataset provided on January 25th.",
        shortDescription: "Tableau viz competition",
        timestamp: new Date("2025-12-20T09:00:00"),
        image: null
    },
    {
        type: "ongoing-activity",
        department: "WAEC Class",
        title: "Government: Constitutional Law Studies",
        description: "Studying constitutional law and governance structures for WAEC Government exam. Focus on separation of powers, checks and balances, and fundamental human rights.",
        shortDescription: "Constitutional law studies",
        timestamp: new Date("2025-12-20T12:00:00"),
        image: null
    }
];

const galleryItems = [
  {
    title: 'Computer Lab Session',
    img: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Graduation Day',
    img: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Group Study',
    img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Library Resources',
    img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'International Exams',
    img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Student Lounge',
    img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Coding Bootcamp',
    img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Science Fair',
    img: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Workshop',
    img: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Class Presentation',
    img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Outdoor Activities',
    img: 'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Art Class',
    img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'school exams preparation',
    img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'javacript Project Presentation',
    img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  },
];

const seedContent = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Clear existing data
        await BlogPost.deleteMany({});
        await GalleryItem.deleteMany({});
        console.log('Cleared existing content');

        // Insert new data
        await BlogPost.insertMany(blogPosts);
        await GalleryItem.insertMany(galleryItems);
        console.log(`Imported ${blogPosts.length} blog posts and ${galleryItems.length} gallery items`);

        process.exit();
    } catch (error) {
        console.error('Error seeding content:');
        console.error(error);
        process.exit(1);
    }
};

seedContent();
