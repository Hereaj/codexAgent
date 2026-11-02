"""Schema init + first-run seed — port of the old server/database/init.js.

Runs at every startup: CREATE TABLE IF NOT EXISTS for all tables, then seeds
the content tables only if hero_info is empty.
"""

from psycopg.types.json import Json

from db import pool

TABLES = [
    """
    CREATE TABLE IF NOT EXISTS hero_info (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS hero_stats (
        id SERIAL PRIMARY KEY,
        number VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS about_info (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        technologies JSONB,
        link VARCHAR(500),
        link_text VARCHAR(100),
        is_current_study BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        level VARCHAR(50) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS education (
        id SERIAL PRIMARY KEY,
        date_range VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS contact_info (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        linkedin VARCHAR(500),
        github VARCHAR(500),
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        page VARCHAR(255) NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
]


def initialize_database():
    with pool.connection() as conn:
        for ddl in TABLES:
            conn.execute(ddl)
        print("Database tables created successfully!")

        count = conn.execute("SELECT COUNT(*) AS count FROM hero_info").fetchone()["count"]
        if int(count) == 0:
            _seed(conn)


def _seed(conn):
    print("Seeding database with initial data...")

    conn.execute(
        "INSERT INTO hero_info (name, title, description) VALUES (%s, %s, %s)",
        (
            "Jaehyeon (AJ) Ahn",
            "UW Computer Science Graduate specializing in Data Science",
            "Building ML solutions and database systems • CrossFit Coach passionate about data-driven training",
        ),
    )

    stats = [
        ("15+", "Projects Completed", 1),
        ("6+", "Programming Languages", 2),
        ("10+", "CSE Courses", 3),
        ("2+", "Years Experience", 4),
    ]
    for number, label, order in stats:
        conn.execute(
            "INSERT INTO hero_stats (number, label, sort_order) VALUES (%s, %s, %s)",
            (number, label, order),
        )

    conn.execute(
        "INSERT INTO about_info (content) VALUES (%s)",
        (
            "I'm a recent graduate from the Paul G. Allen School of Computer Science at the "
            "University of Washington with a Data Science specialization. I'm passionate about "
            "solving complex problems with data, building machine learning solutions, and "
            "developing robust database systems. When I'm not coding, I coach CrossFit and love "
            "analyzing training data to optimize athletic performance.",
        ),
    )

    projects = [
        ("Full-Stack B2B Platform", "Weedus - Cannabis B2B Platform",
         "Scalable B2B commerce platform built with Next.js 14, Express.js (TypeScript), PostgreSQL (Prisma ORM). Features multi-tenant RBAC, third-party API integration with circuit breaker patterns, AI chatbot agent for natural language order management via WhatsApp/Slack, and calendar sync with Google/Microsoft APIs using AES-256-GCM encrypted credential storage.",
         ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "LLM Integration"],
         "https://weedus.app", "View Live", False, 1),
        ("ML/DL/NLP", "Wizardry GPT",
         "A specialized language model fine-tuned for generating creative fantasy content, implementing transformer architecture with custom training pipeline.",
         ["Python", "PyTorch", "Transformers", "Hugging Face"],
         "https://github.com/Hereaj/wizardryGPT", "View Project", False, 2),
        ("ML/DL/NLP", "LipNet with Self-Attention",
         "Enhanced lip reading model incorporating self-attention mechanisms for improved accuracy in visual speech recognition tasks.",
         ["Python", "TensorFlow", "Computer Vision", "Attention Mechanisms"],
         "/attached_assets/DL_project_Final_ppt_1750576563453.pdf", "View Research", False, 3),
        ("Database Management", "Simple DB",
         "A from-scratch implementation of a relational database system with B+ tree indexing, query optimization, and transaction management.",
         ["Java", "B+ Trees", "SQL Parser", "Buffer Management"],
         "https://github.com/Hereaj/simpleDB", "View Project", False, 4),
        ("Web Applications", "Mapping Anxiety",
         "Interactive data visualization platform analyzing anxiety patterns across demographics using D3.js and modern web technologies.",
         ["JavaScript", "D3.js", "Data Visualization", "Statistical Analysis"],
         "https://mapping-anxiety-visualization-cse442-24au-fp-fe684fffc99048bb7e.pages.cs.washington.edu/", "View Live Demo", False, 5),
        ("ML/DL/NLP", "Self-Driving Car",
         "Computer vision-based autonomous vehicle system using convolutional neural networks for lane detection and path planning.",
         ["Python", "OpenCV", "CNN", "Computer Vision"],
         "https://github.com/Hereaj/selfdriving", "View Project", False, 6),
        ("Database Management", "Flight Manager",
         "Comprehensive flight booking system with complex SQL queries, database normalization, and real-time seat availability tracking.",
         ["SQL", "Database Design", "Java", "JDBC"],
         "https://github.com/Hereaj/flightManager", "View Project", False, 7),
    ]
    for category, title, description, technologies, link, link_text, is_current, order in projects:
        conn.execute(
            """
            INSERT INTO projects (category, title, description, technologies, link, link_text, is_current_study, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (category, title, description, Json(technologies), link, link_text, is_current, order),
        )

    skills = [
        ("Programming Languages", [
            ("Python", "Expert", 1),
            ("Java", "Expert", 2),
            ("C/C++", "Advanced", 3),
            ("JavaScript/TypeScript", "Proficient", 4),
            ("R", "Proficient", 5),
        ]),
        ("Data & ML Technologies", [
            ("PyTorch & TensorFlow", "Advanced", 1),
            ("Pandas & NumPy", "Expert", 2),
            ("Scikit-learn", "Advanced", 3),
            ("SQL & NoSQL", "Expert", 4),
            ("Statistical Analysis", "Advanced", 5),
        ]),
        ("Web & Software Engineering", [
            ("React & Node.js", "Proficient", 1),
            ("HTML/CSS", "Proficient", 2),
            ("Git & Version Control", "Advanced", 3),
            ("Software Testing", "Advanced", 4),
            ("System Design", "Proficient", 5),
        ]),
    ]
    for category, entries in skills:
        for name, level, order in entries:
            conn.execute(
                "INSERT INTO skills (category, name, level, sort_order) VALUES (%s, %s, %s, %s)",
                (category, name, level, order),
            )

    education = [
        ("2023 — 2025", "University of Washington",
         "Bachelor of Science in Computer Science with Data Science option. Relevant coursework: Machine Learning, Deep Learning, Natural Language Processing, Database Systems, Software Engineering, Data Structures & Algorithms.", 1),
        ("2022 — Present", "CrossFit Coach @ Persistence Athletics",
         "Lead group fitness classes for 15-20 athletes, design personalized training programs, track performance metrics, and analyze training data to optimize athlete progress and reduce injury risk.", 2),
        ("2022 — 2023", "Bellevue College",
         "Completed foundational computer science courses including Data Structures (CS 210), Computer Programming (CS 211), and Calculus III (MATH 208) with honors.", 3),
    ]
    for date_range, title, description, order in education:
        conn.execute(
            "INSERT INTO education (date_range, title, description, sort_order) VALUES (%s, %s, %s, %s)",
            (date_range, title, description, order),
        )

    conn.execute(
        "INSERT INTO contact_info (email, linkedin, github, location) VALUES (%s, %s, %s, %s)",
        (
            "hereaj1992@gmail.com",
            "https://www.linkedin.com/in/hereaj/",
            "https://github.com/hereaj",
            "Seattle, WA",
        ),
    )

    print("Database seeded successfully!")
