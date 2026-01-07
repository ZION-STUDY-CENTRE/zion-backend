const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Program = require('../models/Program');
const dns = require('dns');

// Fix for Node > 17 DNS issues
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.log("Could not set DNS servers");
}

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const coursesData = [
  {
    title: "Front End Web Development",
    code: "web-dev",
    category: "Technology",
    heroImage: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1593720213428-28a5b9e94613?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Master the fundamentals of modern web development through HTML5, CSS3, JavaScript, and responsive design frameworks.",
    description: "Master the fundamentals of modern web development through HTML5, CSS3, JavaScript, and responsive design frameworks. Build interactive user interfaces and create dynamic web experiences that work seamlessly across all devices.",
    overview: "Focus on the user-facing side of web development. Learn to create visually stunning and highly interactive websites using modern tools and frameworks. This course covers everything from the basics of HTML and CSS to advanced JavaScript and React.",
    keyStats: {
      duration: "4 months",
      studyMode: "Part-time",
      intakes: ["February", "June", "October"],
      certification: "Professional Certificate",
    },
    schedule: "Mon, Wed, Fri",
    students: 250,
    modules: [
      { title: "HTML5 & CSS3", description: "Semantic markup and modern styling techniques." },
      { title: "JavaScript Essentials", description: "Programming fundamentals and DOM manipulation." },
      { title: "Responsive Design", description: "Mobile-first approach using Flexbox and Grid." }
    ],
    entryRequirements: ["Basic computer skills"],
    careerOpportunities: ["Frontend Developer", "UI Developer", "Web Designer"],
  },
  {
    title: "Back End Web Development",
    code: "web-dev-2",
    category: "Technology",
    heroImage: "https://images.unsplash.com/photo-1629904853716-6b03185f4900?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1629904853716-6b03185f4900?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Develop robust server-side applications using Node.js and Python. Learn database design and API development.",
    description: "Develop robust server-side applications using Node.js and Python. Learn database design, API development, authentication systems, and cloud deployment to build scalable backend solutions for modern web applications.",
    overview: "Dive deep into the server-side of web applications. This course teaches you how to build the logic, database interactions, and APIs that power modern web apps. You will work with Node.js, Python, and various database technologies.",
    keyStats: {
      duration: "6 months",
      studyMode: "Part-time",
      intakes: ["March", "July", "November"],
      certification: "Professional Certificate",
    },
    schedule: "Mon, Wed, Fri",
    students: 250,
    modules: [
      { title: "Node.js & Express", description: "Server-side JavaScript runtime and framework." },
      { title: "Python for Backend", description: "Scripting and application logic with Python." },
      { title: "Databases", description: "SQL (PostgreSQL) and NoSQL (MongoDB) design." },
      { title: "API Development", description: "RESTful APIs and GraphQL." }
    ],
    entryRequirements: ["Basic programming knowledge recommended"],
    careerOpportunities: ["Backend Developer", "API Engineer", "Database Administrator"],
  },
  {
    title: "Graphic Design & Digital Marketing",
    code: "graphic-design",
    category: "Technology",
    heroImage: "https://images.unsplash.com/photo-1626785774573-4b799314348d?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799314348d?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Transform your creative vision into compelling visual content using Adobe Photoshop and Illustrator.",
    description: "Transform your creative vision into compelling visual content using Adobe Photoshop and Illustrator. Explore digital marketing strategies, brand identity design, and social media campaigns that drive engagement and business growth.",
    overview: "Unleash your creativity and learn to communicate visually. This course combines graphic design principles with digital marketing strategies. You will master industry-standard tools like Adobe Creative Cloud and learn how to create effective marketing campaigns.",
    keyStats: {
      duration: "4 months",
      studyMode: "Part-time",
      intakes: ["Monthly"],
      certification: "Certificate of Competence",
    },
    schedule: "Tue, Thu, Sat",
    students: 180,
    modules: [
      { title: "Design Principles", description: "Color theory, typography, and layout." },
      { title: "Adobe Photoshop", description: "Photo editing and manipulation." },
      { title: "Adobe Illustrator", description: "Vector graphics and logo design." },
      { title: "Digital Marketing", description: "Social media strategy and content creation." }
    ],
    entryRequirements: ["Creativity and basic computer skills"],
    careerOpportunities: ["Graphic Designer", "Digital Marketer", "Social Media Manager"],
  },
  {
    title: "Data Science & Analytics",
    code: "data-science",
    category: "Technology",
    heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Unlock insights from complex datasets through Python programming, statistical analysis, and machine learning.",
    description: "Unlock insights from complex datasets through Python programming, statistical analysis, and machine learning algorithms. Master data visualization techniques and predictive modeling to make data-driven decisions that solve real-world problems.",
    overview: "Data is the new oil. Learn how to extract valuable insights from data using Python and statistical methods. This course covers data cleaning, visualization, and machine learning, preparing you for one of the most in-demand careers.",
    keyStats: {
      duration: "5 months",
      studyMode: "Full-time",
      intakes: ["April", "September"],
      certification: "Professional Diploma",
    },
    schedule: "Weekdays",
    students: 150,
    modules: [
      { title: "Python for Data Science", description: "Pandas, NumPy, and Matplotlib." },
      { title: "Statistical Analysis", description: "Probability, hypothesis testing, and regression." },
      { title: "Machine Learning", description: "Supervised and unsupervised learning algorithms." },
      { title: "Data Visualization", description: "Tableau and PowerBI basics." }
    ],
    entryRequirements: ["Strong mathematical background", "Basic programming skills"],
    careerOpportunities: ["Data Scientist", "Data Analyst", "Business Intelligence Analyst"],
  },
  {
    title: "TOEFL Preparation",
    code: "toefl",
    category: "International Exams",
    heroImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Expert coaching for TOEFL iBT with practice tests and strategies.",
    description: "Expert coaching for TOEFL iBT with practice tests and strategies",
    overview: "Prepare for the TOEFL iBT with our specialized coaching program. We cover all sections of the exam, providing you with the strategies and practice needed to achieve a high score. Our course includes simulated tests to familiarize you with the exam format.",
    keyStats: {
      duration: "3 months",
      studyMode: "Part-time",
      intakes: ["Monthly"],
      certification: "Certificate of Completion",
    },
    schedule: "Tue, Thu, Sat",
    students: 150,
    modules: [
      { title: "Reading Comprehension", description: "Analyzing academic texts." },
      { title: "Listening Skills", description: "Understanding lectures and conversations." },
      { title: "Speaking Practice", description: "Expressing opinions and summarizing information." },
      { title: "Writing Skills", description: "Integrated and independent writing tasks." }
    ],
    entryRequirements: ["Intermediate English proficiency"],
    careerOpportunities: ["Study in USA/Canada"],
  },
  {
    title: "SAT & GRE Coaching",
    code: "sat-gre",
    category: "International Exams",
    heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Intensive preparation for SAT and GRE with proven success strategies.",
    description: "Intensive preparation for SAT and GRE with proven success strategies",
    overview: "Ace your college or graduate school admissions tests with our SAT and GRE coaching. We provide comprehensive coverage of math, verbal, and analytical writing sections. Our proven strategies and extensive practice materials will help you maximize your score.",
    keyStats: {
      duration: "4 months",
      studyMode: "Weekend",
      intakes: ["Quarterly"],
      certification: "Certificate of Completion",
    },
    schedule: "Weekdays",
    students: 120,
    modules: [
      { title: "Quantitative Reasoning", description: "Math concepts and problem-solving." },
      { title: "Verbal Reasoning", description: "Vocabulary, reading comprehension, and text completion." },
      { title: "Analytical Writing", description: "Essay writing and argument analysis." },
      { title: "Test Strategies", description: "Time management and guessing tactics." }
    ],
    entryRequirements: ["Secondary school education"],
    careerOpportunities: ["Admission to US Universities"],
  },
  {
    title: "JAMB UTME Preparation",
    code: "jamb",
    category: "Secondary School",
    heroImage: "https://images.unsplash.com/photo-1639741660848-a07ebe5e2ce0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFkdWF0aW9uJTIwc3VjY2Vzc3xlbnwxfHx8fDE3NjU5NTUzMjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    imageUrl: "https://images.unsplash.com/photo-1639741660848-a07ebe5e2ce0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFkdWF0aW9uJTIwc3VjY2Vzc3xlbnwxfHx8fDE3NjU5NTUzMjN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    shortDescription: "Complete JAMB preparation covering all subjects and practice tests.",
    description: "Complete JAMB preparation covering all subjects and practice tests",
    overview: "Get ready for the JAMB UTME with our intensive preparation classes. We cover all major subjects, providing in-depth teaching and regular practice tests (CBT). Our goal is to ensure you score high enough to get into your university of choice.",
    keyStats: {
      duration: "4 months",
      studyMode: "Full-time",
      intakes: ["January", "October"],
      certification: "N/A",
    },
    schedule: "Mon - Sat",
    students: 300,
    modules: [
      { title: "Subject Mastery", description: "In-depth coverage of 4 JAMB subjects." },
      { title: "CBT Practice", description: "Computer-Based Test simulations." },
      { title: "Past Questions", description: "Review of previous years' questions." },
      { title: "Exam Strategy", description: "Time management and answering techniques." }
    ],
    entryRequirements: ["SSCE attempted or completed"],
    careerOpportunities: ["University Admission"],
  },
  {
    title: "WAEC Preparation",
    code: "waec",
    category: "Secondary School",
    heroImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Thorough WAEC preparation with experienced teachers.",
    description: "Thorough WAEC preparation with experienced teachers",
    overview: "Prepare for your WASSCE with confidence. Our experienced teachers provide thorough coaching in all subjects, ensuring you understand the syllabus and can answer questions correctly. We focus on both theory and practicals.",
    keyStats: {
      duration: "6 months",
      studyMode: "Full-time",
      intakes: ["September"],
      certification: "N/A",
    },
    schedule: "Mon - Sat",
    students: 280,
    modules: [
      { title: "Syllabus Coverage", description: "Complete coverage of WAEC syllabus." },
      { title: "Practical Sessions", description: "Science practicals and lab work." },
      { title: "Mock Exams", description: "Simulated exams to test readiness." }
    ],
    entryRequirements: ["SS3 Student or External Candidate"],
    careerOpportunities: ["University Admission", "Employment"],
  },
  {
    title: "NECO Preparation",
    code: "neco",
    category: "Secondary School",
    heroImage: "https://images.unsplash.com/photo-1427504743055-b72976e9d246?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    imageUrl: "https://images.unsplash.com/photo-1427504743055-b72976e9d246?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80",
    shortDescription: "Expert coaching for NECO examinations.",
    description: "Expert coaching for NECO examinations",
    overview: "Our NECO preparation classes are designed to help you pass your exams with flying colors. We provide targeted coaching, focusing on areas where students often struggle. Join us to secure your O'Level results.",
    keyStats: {
      duration: "5 months",
      studyMode: "Full-time",
      intakes: ["October"],
      certification: "N/A",
    },
    schedule: "Mon - Sat",
    students: 200,
    modules: [
      { title: "Subject Coaching", description: "Intensive teaching in all subjects." },
      { title: "Revision Classes", description: "Focused revision of key topics." },
      { title: "Exam Guidance", description: "Tips for answering exam questions." }
    ],
    entryRequirements: ["SS3 Student or External Candidate"],
    careerOpportunities: ["University Admission"],
  },
  {
    title: "IELTS Preparation Course",
    code: "ielts-preparation",
    category: "International Exams",
    heroImage: "https://images.unsplash.com/photo-1654366698665-e6d611a9aaa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMHN0dWR5aW5nJTIwY2xhc3Nyb29tfGVufDF8fHx8MTc2NTk1NTM4MXww&ixlib=rb-4.1.0&q=80&w=1080",
    imageUrl: "https://images.unsplash.com/photo-1654366698665-e6d611a9aaa9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMHN0dWR5aW5nJTIwY2xhc3Nyb29tfGVufDF8fHx8MTc2NTk1NTM4MXww&ixlib=rb-4.1.0&q=80&w=1080",
    shortDescription: "Achieve your target band score with our intensive IELTS preparation course.",
    description: "Achieve your target band score with our intensive IELTS preparation course.",
    overview: "Our IELTS Preparation Course is meticulously structured to help students achieve high band scores required for international study, work, or migration.",
    keyStats: {
      duration: "3 Months",
      studyMode: "Weekend / Weekday",
      intakes: ["Monthly Rolling Intake"],
      certification: "Certificate of Completion",
    },
    schedule: "Mon, Wed, Fri",
    students: 180,
    modules: [
      { title: "Listening Mastery", description: "Techniques for understanding accents." },
      { title: "Reading Strategies", description: "Skimming and scanning." },
      { title: "Writing Excellence", description: "Structuring essays." },
      { title: "Speaking Confidence", description: "Fluency practice." },
    ],
    entryRequirements: ["Intermediate English"],
    careerOpportunities: ["Study Abroad"],
  }
];

const seedCourses = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for Seeding');

        // Drop the collection completely to remove old indexes (like 'name_1')
        try {
            await mongoose.connection.db.dropCollection('programs');
            console.log('Dropped programs collection and indexes');
        } catch (error) {
            if (error.code === 26) {
                console.log('Collection does not exist, skipping drop');
            } else {
                throw error;
            }
        }

        for (const course of coursesData) {
            await Program.create(course);
            console.log(`Created: ${course.title}`);
        }

        console.log('Seeding Completed');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedCourses();
