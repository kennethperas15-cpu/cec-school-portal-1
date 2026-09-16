# CEC Portal MySQL database

The schema in `init.sql` is the source of truth for the portal database. It
contains the account, academic, enrollment, LMS, library, finance, messaging,
notification, reporting, and audit tables.

## Local setup

1. Create a MySQL application user (replace the password before running):

   ```sql
   CREATE USER 'cec_app'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
   GRANT ALL PRIVILEGES ON cec_portal.* TO 'cec_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. From the repository root, run:

   ```text
   mysql -u root -p < server/database/init.sql
   mysql -u root -p < server/database/seed.sql
   ```

3. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` to the
   same credentials used for `cec_app`.

The seed does not create a default password. Accounts must be created through
the application so passwords are stored as bcrypt hashes.
