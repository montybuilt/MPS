# MPS-Application
This is the main repo for the Monty's Python Show Application

### Notes

1) Asyncronous CRUD
2) Connection pooling
3) Load balancing

User Roles:

Student:

    - Consumers of content, curriculums, and tasks.
    - Can manage their profile and switch or join classrooms.
    - No administrative capabilities beyond personal data.

Teacher:

    - Can create new content, curriculums, and task assignments.
    - Can assign work either individually to students or broadly to classrooms they manage.
    - Can access and manage their created content but cannot access content created by other teachers.

System:

    - Has full administrative access across all database elements.
    - Can create, edit, delete, or update any data, including content created by teachers.

Data Categorization:

    - System-created data:
        - Universally accessible to all users (students, teachers, system).
    
    - Teacher-created data - restricted to:
        - The teacher who created it.
        - Students within classrooms managed by that teacher.
        - The system user.